export const DEFAULT_SNIPPET_LENGTH = 180

export function formatSourceCards(sources, { snippetLength = DEFAULT_SNIPPET_LENGTH } = {}) {
  if (!Array.isArray(sources)) return []
  return sources.map((source, index) => formatSourceCard(source, { index, snippetLength }))
}

export function formatSourceCard(source, { index = 0, snippetLength = DEFAULT_SNIPPET_LENGTH } = {}) {
  const metadata = source?.metadata && typeof source.metadata === "object" ? source.metadata : {}
  const path = firstNonEmpty(metadata.path, source?.path, source?.id, `source-${index + 1}`)
  const title = firstNonEmpty(metadata.title, metadata.documentTitle, path)
  const snippet = createSnippet(source?.snippet ?? source?.content, snippetLength)
  const score = Number.isFinite(source?.score) ? Number(source.score) : 0

  return {
    title,
    path,
    snippet,
    score,
  }
}

function createSnippet(raw, maxLength) {
  if (typeof raw !== "string") return ""
  const normalized = raw.replace(/\s+/g, " ").trim()
  if (!normalized) return ""

  if (normalized.length <= maxLength || maxLength <= 3) {
    return normalized.slice(0, Math.max(maxLength, 0))
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value !== "string") continue
    const trimmed = value.trim()
    if (trimmed) return trimmed
  }
  return ""
}
