export const SENSITIVITY_TAGS = Object.freeze(["family", "counseling", "conflict", "health"])
export const SENSITIVITY_EXTERNAL_BLOCK_REASON = "sensitive_tag_external_blocked"

const SENSITIVITY_SET = new Set(SENSITIVITY_TAGS)
const TAG_ALIASES = new Map([
  ["family", "family"],
  ["가정", "family"],
  ["guardian", "family"],
  ["counseling", "counseling"],
  ["상담", "counseling"],
  ["conflict", "conflict"],
  ["갈등", "conflict"],
  ["health", "health"],
  ["건강", "health"],
])

const FIELD_TAG_MAP = new Map([
  ["familyNotes", "family"],
  ["family_note", "family"],
  ["guardianNotes", "family"],
  ["guardian_note", "family"],
  ["counselingNotes", "counseling"],
  ["counseling_note", "counseling"],
  ["conflictNotes", "conflict"],
  ["conflict_note", "conflict"],
  ["healthNotes", "health"],
  ["health_note", "health"],
])

const TEXT_RULES = [
  { tag: "family", keywords: ["family", "guardian", "parent", "가정", "보호자", "부모"] },
  { tag: "counseling", keywords: ["counseling", "상담", "심리", "멘토링"] },
  { tag: "conflict", keywords: ["conflict", "bully", "fight", "갈등", "따돌림", "폭력"] },
  { tag: "health", keywords: ["health", "medical", "disease", "건강", "병원", "약"] },
]

export function extractSensitivityTags({ tags = [], text = "", fields = {} } = {}) {
  const detected = new Set()

  for (const tag of normalizeTags(tags)) {
    const normalized = TAG_ALIASES.get(tag) ?? tag
    if (SENSITIVITY_SET.has(normalized)) {
      detected.add(normalized)
    }
  }

  if (fields && typeof fields === "object") {
    for (const [field, value] of Object.entries(fields)) {
      const tag = FIELD_TAG_MAP.get(field)
      if (!tag || !hasSignal(value)) continue
      detected.add(tag)
    }
  }

  const normalizedText = normalizeText(text)
  if (normalizedText) {
    for (const rule of TEXT_RULES) {
      if (rule.keywords.some((keyword) => normalizedText.includes(keyword))) {
        detected.add(rule.tag)
      }
    }
  }

  return SENSITIVITY_TAGS.filter((tag) => detected.has(tag))
}

export function routeBySensitivity({ tags = [], text = "", fields = {}, requestedRoute = "external" } = {}) {
  const sensitiveTags = extractSensitivityTags({ tags, text, fields })
  const normalizedRequestedRoute = normalizeRequestedRoute(requestedRoute)
  const sensitive = sensitiveTags.length > 0

  if (sensitive && normalizedRequestedRoute === "external") {
    return {
      allowed: false,
      requestedRoute: normalizedRequestedRoute,
      route: "blocked",
      mode: "blocked",
      sensitiveTags,
      blockReason: SENSITIVITY_EXTERNAL_BLOCK_REASON,
    }
  }

  return {
    allowed: true,
    requestedRoute: normalizedRequestedRoute,
    route: sensitive ? "local-only" : normalizedRequestedRoute,
    mode: sensitive ? "local-only" : "normal",
    sensitiveTags,
    blockReason: null,
  }
}

function normalizeTags(tags) {
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
  }

  if (!Array.isArray(tags)) return []

  return tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
}

function normalizeRequestedRoute(requestedRoute) {
  if (requestedRoute === "local" || requestedRoute === "local-only") return "local-only"
  return "external"
}

function normalizeText(value) {
  if (typeof value !== "string") return ""
  return value.trim().toLowerCase()
}

function hasSignal(value) {
  if (typeof value === "string") return value.trim() !== ""
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "number") return !Number.isNaN(value)
  if (typeof value === "boolean") return value
  return value !== null && value !== undefined
}
