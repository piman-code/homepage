import { AnonStore } from "../services/omniforge/anon-store.mjs"
import { PiiStore } from "../services/omniforge/pii-store.mjs"
import { anonymizeRecord } from "../services/omniforge/pipeline/anonymize.mjs"
import { routeBySensitivity } from "../services/omniforge/policy/sensitivity-router.mjs"

export function createIntakeSurveyApi({ piiStore = new PiiStore(), anonStore = new AnonStore() } = {}) {
  return async function handleIntakeSurvey(payload = {}, { requestedRoute = "external" } = {}) {
    const survey = normalizeSurveyPayload(payload)

    const policy = routeBySensitivity({
      tags: survey.tags,
      fields: {
        familyNotes: survey.familyNotes,
        counselingNotes: survey.counselingNotes,
        conflictNotes: survey.conflictNotes,
        healthNotes: survey.healthNotes,
      },
      text: survey.freeText,
      requestedRoute,
    })

    if (!policy.allowed) {
      return {
        ok: false,
        blocked: true,
        intakeType: "survey",
        reason: policy.blockReason,
        policy,
      }
    }

    if (survey.familyNotes || survey.counselingNotes) {
      piiStore.saveProfile({
        studentId: survey.studentId,
        familyNotes: survey.familyNotes,
        counselingNotes: survey.counselingNotes,
        consent: survey.consent,
        metadata: {
          intakeType: "survey",
          submittedAt: survey.submittedAt,
        },
      })
    }

    const anonymized = anonymizeRecord({
      ...survey,
      intakeType: "survey",
    })

    const stored = anonStore.append({
      type: "survey",
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
      intakeType: "survey",
      policy,
      stored,
    }
  }
}

export async function intakeSurvey(payload, options = {}, deps = {}) {
  const handleIntakeSurvey = createIntakeSurveyApi(deps)
  return handleIntakeSurvey(payload, options)
}

function normalizeSurveyPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("survey payload must be an object")
  }

  return {
    studentId: requiredString(payload.studentId, "studentId"),
    consent: payload.consent && typeof payload.consent === "object" ? { ...payload.consent } : null,
    answers: payload.answers && typeof payload.answers === "object" ? { ...payload.answers } : {},
    freeText: normalizeText(payload.freeText),
    familyNotes: normalizeText(payload.familyNotes),
    counselingNotes: normalizeText(payload.counselingNotes),
    conflictNotes: normalizeText(payload.conflictNotes),
    healthNotes: normalizeText(payload.healthNotes),
    tags: normalizeTags(payload.tags),
    submittedAt: normalizeDate(payload.submittedAt),
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

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))]
}

function normalizeDate(value) {
  if (typeof value === "string" && value.trim()) return value.trim()
  return new Date().toISOString()
}
