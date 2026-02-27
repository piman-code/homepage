import { DEFAULT_TOP_K } from "./retriever.mjs"
import { parseQueryInputDto } from "./query-dto.mjs"
import { formatSourceCards } from "./source-card-formatter.mjs"

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

export const UNCERTAIN_LABEL = "미확인"
export const DEFAULT_UNCERTAIN_ANSWER = `${UNCERTAIN_LABEL}: 근거가 충분하지 않아 답변을 확정할 수 없습니다.`
export const SUMMARY_MODE_NOTICE =
  "현재 이용량이 많아 요약 모드로 답변합니다. 자세한 설명은 잠시 후 다시 시도해 주세요."
export const HARD_CAP_BLOCK_MESSAGE_TEMPLATE =
  "현재 시간대 사용 한도를 초과했습니다. 다음 이용 가능 시각(KST): {reset_time}"
export const RATE_LIMIT_BLOCK_MESSAGE_TEMPLATE =
  "현재 요청 한도를 초과했습니다. 다음 이용 가능 시각(KST): {reset_time}"

export class Generator {
  async generate() {
    throw new Error("Generator.generate() must be implemented")
  }
}

export class RetrievalGenerationPipeline {
  constructor({
    retriever,
    generator,
    topK = DEFAULT_TOP_K,
    sourceFormatter = formatSourceCards,
    contextBuilder = combineRetrievedContext,
    rateLimiter = null,
    tokenBudget = null,
    requestTokenEstimator = estimateRequestTokens,
    now = () => Date.now(),
  } = {}) {
    if (!retriever || typeof retriever.retrieve !== "function") {
      throw new Error("RetrievalGenerationPipeline requires retriever.retrieve()")
    }
    if (!generator || typeof generator.generate !== "function") {
      throw new Error("RetrievalGenerationPipeline requires generator.generate()")
    }
    if (requestTokenEstimator && typeof requestTokenEstimator !== "function") {
      throw new Error("requestTokenEstimator must be a function")
    }

    this.retriever = retriever
    this.generator = generator
    this.topK = topK
    this.sourceFormatter = sourceFormatter
    this.contextBuilder = contextBuilder
    this.rateLimiter = rateLimiter
    this.tokenBudget = tokenBudget
    this.requestTokenEstimator = requestTokenEstimator ?? estimateRequestTokens
    this.now = now
  }

  async run(input, { topK = this.topK, guardrailContext = {} } = {}) {
    const query = parseQueryInputDto(input)
    const guardrails = this.precheckGuardrails({ input, query, guardrailContext })

    if (!guardrails.allowed) {
      return createBlockedResponse({ query, guardrails })
    }

    const retrieveOptions = { topK }
    const metadataFilter = buildMetadataFilter(query)
    if (metadataFilter) {
      retrieveOptions.filter = metadataFilter
    }

    const hits = await this.retriever.retrieve(query.question, retrieveOptions)
    const context = this.contextBuilder(hits)
    const sources = this.sourceFormatter(hits)

    // Extension point: wire external model/provider call here while keeping the same Generator interface.
    const generated = await this.generator.generate({
      question: query.question,
      filters: {
        subject: query.subject ?? null,
        grade: query.grade ?? null,
        unit: query.unit ?? null,
      },
      context,
      sources,
      responseMode: guardrails.mode,
      guardrails,
    })

    let answer = normalizeAnswer(generated)
    const uncertain = isUncertainResponse({ answer, sources, generated })
    if (uncertain) {
      answer = applyUncertainLabel(answer)
    }
    if (guardrails.mode === "summary") {
      answer = prependSummaryNotice(answer)
    }

    return {
      request: query,
      answer,
      generated,
      context,
      sources,
      retrievedCount: hits.length,
      mode: guardrails.mode,
      blocked: false,
      uncertain,
      guardrails,
    }
  }

  precheckGuardrails({ input, query, guardrailContext }) {
    const checks = {}
    const context = resolveGuardrailContext({
      input,
      query,
      guardrailContext,
      requestTokenEstimator: this.requestTokenEstimator,
    })

    if (this.rateLimiter) {
      const rateLimit = this.rateLimiter.checkAndConsume({
        userId: context.userId,
        classroomId: context.classroomId,
        amount: 1,
      })
      checks.rateLimit = rateLimit

      if (!rateLimit.allowed) {
        const resetTimeKst = toKstFromRetryAfter(this.now(), rateLimit.retryAfterMs)
        return {
          allowed: false,
          mode: "blocked",
          reason: rateLimit.reason ?? "rate_limit_exceeded",
          blockedBy: "rate_limit",
          resetTimeKst,
          checks,
        }
      }
    }

    if (this.tokenBudget) {
      const tokenBudget = this.tokenBudget.checkAndConsume({
        classroomId: context.classroomId,
        tokens: context.requestTokens,
      })
      checks.tokenBudget = tokenBudget

      if (!tokenBudget.allowed) {
        const resetTimeKst = toKstFromBudgetResult(this.now(), tokenBudget)
        return {
          allowed: false,
          mode: "blocked",
          reason: tokenBudget.reason ?? "token_budget_exceeded",
          blockedBy: "token_budget",
          resetTimeKst,
          checks,
        }
      }

      if (tokenBudget.mode === "summary") {
        return {
          allowed: true,
          mode: "summary",
          reason: tokenBudget.reason ?? "soft_cap_reached",
          blockedBy: null,
          resetTimeKst: null,
          checks,
        }
      }
    }

    return {
      allowed: true,
      mode: "normal",
      reason: null,
      blockedBy: null,
      resetTimeKst: null,
      checks,
    }
  }
}

export function buildMetadataFilter(query = {}) {
  const filters = Object.entries({
    subject: query.subject,
    grade: query.grade,
    unit: query.unit,
  }).filter(([, value]) => typeof value === "string" && value.trim() !== "")

  if (filters.length === 0) return null

  return (metadata = {}) =>
    filters.every(([field, value]) => normalizeField(metadata[field]) === value)
}

export function combineRetrievedContext(hits, { separator = "\n\n---\n\n" } = {}) {
  if (!Array.isArray(hits) || hits.length === 0) return ""

  return hits
    .map((hit, index) => {
      const content = typeof hit?.content === "string" ? hit.content.trim() : ""
      if (!content) return ""

      const metadata = hit?.metadata && typeof hit.metadata === "object" ? hit.metadata : {}
      const path = normalizeField(metadata.path || hit.path)
      const header = path ? `[${index + 1}] ${path}` : `[${index + 1}]`

      return `${header}\n${content}`
    })
    .filter(Boolean)
    .join(separator)
}

export function estimateRequestTokens(question = "") {
  const normalizedQuestion = normalizeField(question)
  if (!normalizedQuestion) return 1
  return Math.max(1, Math.ceil(normalizedQuestion.length / 2))
}

export function isUncertainResponse({ answer, sources, generated }) {
  const normalizedAnswer = normalizeField(answer)
  if (!normalizedAnswer) return true
  if (!Array.isArray(sources) || sources.length === 0) return true

  if (generated && typeof generated === "object") {
    if (generated.uncertain === true) return true
    if (generated.confidence === "low") return true
  }

  return false
}

export function applyUncertainLabel(answer) {
  const normalizedAnswer = normalizeField(answer)
  if (!normalizedAnswer) return DEFAULT_UNCERTAIN_ANSWER
  if (normalizedAnswer.includes(UNCERTAIN_LABEL)) return normalizedAnswer
  return `${UNCERTAIN_LABEL}: ${normalizedAnswer}`
}

export function prependSummaryNotice(answer) {
  const normalizedAnswer = normalizeField(answer)
  if (!normalizedAnswer) return SUMMARY_MODE_NOTICE
  if (normalizedAnswer.startsWith(SUMMARY_MODE_NOTICE)) return normalizedAnswer
  return `${SUMMARY_MODE_NOTICE}\n\n${normalizedAnswer}`
}

export function buildHardCapBlockedMessage(resetTimeKst) {
  return HARD_CAP_BLOCK_MESSAGE_TEMPLATE.replace("{reset_time}", normalizeResetTime(resetTimeKst))
}

export function buildRateLimitBlockedMessage(resetTimeKst) {
  return RATE_LIMIT_BLOCK_MESSAGE_TEMPLATE.replace("{reset_time}", normalizeResetTime(resetTimeKst))
}

export function toKstDateTime(ms) {
  if (!Number.isFinite(ms)) return UNCERTAIN_LABEL

  const shifted = new Date(ms + KST_OFFSET_MS)
  const year = shifted.getUTCFullYear()
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0")
  const day = String(shifted.getUTCDate()).padStart(2, "0")
  const hour = String(shifted.getUTCHours()).padStart(2, "0")
  const minute = String(shifted.getUTCMinutes()).padStart(2, "0")

  return `${year}-${month}-${day} ${hour}:${minute}`
}

export function getNextKstMidnightMs(nowMs = Date.now()) {
  const shifted = new Date(nowMs + KST_OFFSET_MS)
  const midnightUtcMs = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  )
  return midnightUtcMs - KST_OFFSET_MS
}

function normalizeAnswer(generated) {
  if (typeof generated === "string") {
    return generated
  }
  if (generated && typeof generated === "object" && typeof generated.answer === "string") {
    return generated.answer
  }
  return ""
}

function normalizeField(value) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function resolveGuardrailContext({ input, query, guardrailContext, requestTokenEstimator }) {
  const userId = firstNonEmpty(guardrailContext.userId, input?.userId, "anonymous")
  const classroomId = firstNonEmpty(guardrailContext.classroomId, input?.classroomId, "default")
  const explicitTokens = guardrailContext.requestTokens ?? input?.requestTokens ?? input?.estimatedTokens
  const requestTokens =
    explicitTokens === undefined
      ? requestTokenEstimator(query.question)
      : normalizeNonNegativeNumber(explicitTokens, "requestTokens")

  return {
    userId,
    classroomId,
    requestTokens,
  }
}

function createBlockedResponse({ query, guardrails }) {
  const answer =
    guardrails.blockedBy === "token_budget"
      ? buildHardCapBlockedMessage(guardrails.resetTimeKst)
      : buildRateLimitBlockedMessage(guardrails.resetTimeKst)

  return {
    request: query,
    answer,
    generated: null,
    context: "",
    sources: [],
    retrievedCount: 0,
    mode: "blocked",
    blocked: true,
    uncertain: false,
    resetTimeKst: guardrails.resetTimeKst,
    guardrails,
  }
}

function toKstFromRetryAfter(nowMs, retryAfterMs) {
  if (!Number.isFinite(retryAfterMs)) return UNCERTAIN_LABEL
  return toKstDateTime(nowMs + Math.max(0, retryAfterMs))
}

function toKstFromBudgetResult(nowMs, tokenBudgetResult) {
  const reason = tokenBudgetResult?.reason
  if (reason === "daily_token_budget_exceeded") {
    return toKstDateTime(getNextKstMidnightMs(nowMs))
  }

  const resetInMs = tokenBudgetResult?.usage?.hour?.resetInMs ?? tokenBudgetResult?.usage?.day?.resetInMs
  if (!Number.isFinite(resetInMs)) return UNCERTAIN_LABEL
  return toKstDateTime(nowMs + Math.max(0, resetInMs))
}

function normalizeResetTime(value) {
  const normalized = normalizeField(value)
  return normalized || UNCERTAIN_LABEL
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value !== "string") continue
    const normalized = value.trim()
    if (normalized) return normalized
  }
  return ""
}

function normalizeNonNegativeNumber(value, label) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} must be a non-negative number`)
  }
  return amount
}
