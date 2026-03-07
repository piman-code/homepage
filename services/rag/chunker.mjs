export const DEFAULT_CHUNK_SIZE = 700
export const DEFAULT_CHUNK_OVERLAP = 100

export class Chunker {
  chunk() {
    throw new Error("Chunker.chunk() must be implemented")
  }
}

export class TokenWindowChunker extends Chunker {
  constructor({ chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_CHUNK_OVERLAP } = {}) {
    super()
    if (chunkSize <= 0) {
      throw new Error("chunkSize must be greater than 0")
    }
    if (overlap < 0 || overlap >= chunkSize) {
      throw new Error("overlap must be >= 0 and less than chunkSize")
    }

    this.chunkSize = chunkSize
    this.overlap = overlap
  }

  chunk(document) {
    const payload = normalizeDocument(document)
    const tokens = payload.content.split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return []

    const chunks = []
    let cursor = 0
    let chunkIndex = 0

    while (cursor < tokens.length) {
      const end = Math.min(cursor + this.chunkSize, tokens.length)
      const content = tokens.slice(cursor, end).join(" ")

      chunks.push({
        id: `${payload.id}#${chunkIndex}`,
        content,
        metadata: {
          ...payload.metadata,
          chunkIndex,
          tokenStart: cursor,
          tokenEnd: end,
        },
      })

      if (end >= tokens.length) {
        break
      }

      cursor = end - this.overlap
      chunkIndex += 1
    }

    return chunks
  }
}

function normalizeDocument(document) {
  if (typeof document === "string") {
    return {
      id: "doc",
      content: document,
      metadata: {},
    }
  }

  if (!document || typeof document.content !== "string") {
    throw new Error("chunk() requires a string or { id, content, metadata } document")
  }

  return {
    id: document.id ? String(document.id) : "doc",
    content: document.content,
    metadata: document.metadata && typeof document.metadata === "object" ? document.metadata : {},
  }
}
