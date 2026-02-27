export class AnonStore {
  constructor({ now = () => new Date().toISOString() } = {}) {
    this.now = now
    this.records = []
  }

  append({ type, payload = {}, studentRef = null, tags = [], route = "external", meta = {} } = {}) {
    const normalizedType = requiredString(type, "type")
    const entry = {
      id: `anon-${this.records.length + 1}`,
      type: normalizedType,
      route: normalizeRoute(route),
      studentRef: normalizeOptionalString(studentRef),
      tags: normalizeTags(tags),
      payload: clone(payload),
      meta: clone(meta),
      createdAt: this.now(),
    }

    this.records.push(entry)
    return clone(entry)
  }

  list({ type = null } = {}) {
    if (type === null || type === undefined) return clone(this.records)
    const normalizedType = String(type).trim()
    return clone(this.records.filter((entry) => entry.type === normalizedType))
  }

  size() {
    return this.records.length
  }
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required`)
  }
  return value.trim()
}

function normalizeOptionalString(value) {
  if (value === null || value === undefined) return null
  if (typeof value !== "string") return String(value)
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return []

  return [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))]
}

function normalizeRoute(route) {
  if (route === "local" || route === "local-only") return "local-only"
  return "external"
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
