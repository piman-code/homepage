import { AnonStore } from "../services/omniforge/anon-store.mjs"
import { anonymizeRecord } from "../services/omniforge/pipeline/anonymize.mjs"
import { routeBySensitivity } from "../services/omniforge/policy/sensitivity-router.mjs"

export function createIntakeAiQueryApi({ anonStore = new AnonStore() } = {}) {
  return async function handleIntakeAiQuery(payload = {}, { requestedRoute = "external" } = {}) {
    const aiQuery = normalizeAiQueryPayload(payload)

    const policy = routeBySensitivity({
      tags: aiQuery.tags,
      text: aiQuery.queryText,
      requestedRoute,
    })

    if (!policy.allowed) {
      return {
        ok: false,
        blocked: true,
        intakeType: "ai-query",
        reason: policy.blockReason,
        policy,
      }
    }

    const anonymized = anonymizeRecord({
      ...aiQuery,
      intakeType: "ai-query",
    })

    const stored = anonStore.append({
      type: "ai-query",
      payload: anonymized.anonymizedRecord,
      studentRef: anonymized.studentRef,
      tags: policy.sensitiveTags,
      route: policy.route,
      meta: {
        removedFields: anonymized.removedFields,
      },
    })

    return {
      ok: true,
      blocked: false,
      intakeType: "ai-query",
      policy,
      stored,
    }
  }
}

export async function intakeAiQuery(payload, options = {}, deps = {}) {
  const handleIntakeAiQuery = createIntakeAiQueryApi(deps)
  return handleIntakeAiQuery(payload, options)
}

function normalizeAiQueryPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("ai-query payload must be an object")
  }

  return {
    studentId: requiredString(payload.studentId, "studentId"),
    subject: requiredString(payload.subject, "subject"),
    unit: normalizeText(payload.unit),
    queryText: requiredString(payload.queryText, "queryText"),
    bloomLevel: normalizeText(payload.bloomLevel),
    hintCount: normalizeHintCount(payload.hintCount),
    tags: normalizeTags(payload.tags),
    createdAt: normalizeDate(payload.createdAt),
  }
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required`)
  }
  return value.trim()
}

function normalizeText(value) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function normalizeHintCount(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0
  return Math.max(0, Math.floor(value))
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))]
}

function normalizeDate(value) {
  if (typeof value === "string" && value.trim()) return value.trim()
  return new Date().toISOString()
}
