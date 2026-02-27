import { AnonStore } from "../services/omniforge/anon-store.mjs"
import { anonymizeRecord } from "../services/omniforge/pipeline/anonymize.mjs"
import { routeBySensitivity } from "../services/omniforge/policy/sensitivity-router.mjs"

export function createIntakeReflectionApi({ anonStore = new AnonStore() } = {}) {
  return async function handleIntakeReflection(payload = {}, { requestedRoute = "external" } = {}) {
    const reflection = normalizeReflectionPayload(payload)

    const policy = routeBySensitivity({
      tags: reflection.tags,
      text: `${reflection.difficultyText}\n${reflection.supportRequest}`,
      fields: {
        conflictNotes: reflection.supportRequest,
        counselingNotes: reflection.supportRequest,
      },
      requestedRoute,
    })

    if (!policy.allowed) {
      return {
        ok: false,
        blocked: true,
        intakeType: "reflection",
        reason: policy.blockReason,
        policy,
      }
    }

    const anonymized = anonymizeRecord({
      ...reflection,
      intakeType: "reflection",
    })

    const stored = anonStore.append({
      type: "reflection",
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
      intakeType: "reflection",
      policy,
      stored,
    }
  }
}

export async function intakeReflection(payload, options = {}, deps = {}) {
  const handleIntakeReflection = createIntakeReflectionApi(deps)
  return handleIntakeReflection(payload, options)
}

function normalizeReflectionPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("reflection payload must be an object")
  }

  return {
    studentId: requiredString(payload.studentId, "studentId"),
    lessonId: requiredString(payload.lessonId, "lessonId"),
    understandingScore: normalizeScore(payload.understandingScore),
    difficultyText: normalizeText(payload.difficultyText),
    supportRequest: normalizeText(payload.supportRequest),
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

function normalizeScore(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return null
  return Math.min(5, Math.max(1, Math.round(score)))
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))]
}

function normalizeDate(value) {
  if (typeof value === "string" && value.trim()) return value.trim()
  return new Date().toISOString()
}
