export const DEFAULT_TOP_K = 6

export class Retriever {
  async retrieve() {
    throw new Error("Retriever.retrieve() must be implemented")
  }
}

export class InMemoryKeywordRetriever extends Retriever {
  constructor({ chunks = [] } = {}) {
    super()
    this.chunks = []
    this.upsert(chunks)
  }

  upsert(chunks = []) {
    for (const chunk of chunks) {
      if (!chunk || typeof chunk.content !== "string") continue

      this.chunks.push({
        ...chunk,
        id: chunk.id ? String(chunk.id) : `chunk-${this.chunks.length + 1}`,
        metadata: chunk.metadata && typeof chunk.metadata === "object" ? chunk.metadata : {},
      })
    }
  }

  async retrieve(query, { topK = DEFAULT_TOP_K, filter } = {}) {
    const terms = tokenize(query)
    if (terms.length === 0) return []

    const scored = []
    for (const chunk of this.chunks) {
      if (typeof filter === "function" && !filter(chunk.metadata)) {
        continue
      }

      const score = scoreChunk(chunk.content, terms)
      if (score <= 0) continue

      scored.push({
        ...chunk,
        score,
      })
    }

    scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    return scored.slice(0, topK)
  }
}

function scoreChunk(content, terms) {
  const words = tokenize(content)
  if (words.length === 0) return 0

  const bag = new Set(words)
  let score = 0
  for (const term of terms) {
    if (bag.has(term)) {
      score += 1
    }
  }

  return score
}

function tokenize(text) {
  if (typeof text !== "string") return []
  const matches = text.toLowerCase().match(/[\p{L}\p{N}]+/gu)
  return matches ?? []
}
