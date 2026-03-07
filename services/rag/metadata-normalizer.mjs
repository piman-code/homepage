const ALLOWED_VISIBILITY = new Set(["public", "internal"])
const ALLOWED_SAFETY_LEVELS = new Set(["school-default", "restricted"])

export function normalizeMetadata(raw = {}) {
  const visibility = normalizeEnum(raw.visibility, ALLOWED_VISIBILITY, "public")
  const safetyLevel = normalizeEnum(raw.safety_level ?? raw.safetyLevel, ALLOWED_SAFETY_LEVELS, "school-default")

  return {
    category: normalizeString(raw.category, "unknown"),
    subject: normalizeString(raw.subject, "공통"),
    grade: normalizeString(raw.grade, "미확인"),
    unit: normalizeString(raw.unit, ""),
    visibility,
    ragEnabled: normalizeBoolean(raw.rag_enabled ?? raw.ragEnabled, true),
    safetyLevel,
    tags: normalizeTags(raw.tags),
    path: normalizeString(raw.path, ""),
  }
}

export function normalizeDocumentMetadata(document = {}) {
  return {
    ...document,
    metadata: normalizeMetadata(document.metadata ?? {}),
  }
}

function normalizeString(value, fallback) {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function normalizeBoolean(value, fallback) {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase()
    if (lowered === "true") return true
    if (lowered === "false") return false
  }
  return fallback
}

function normalizeEnum(value, allowed, fallback) {
  if (typeof value !== "string") return fallback
  const lowered = value.trim().toLowerCase()
  if (!allowed.has(lowered)) return fallback
  return lowered
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return []
  return tags
    .map((tag) => String(tag).trim())
    .filter(Boolean)
}
