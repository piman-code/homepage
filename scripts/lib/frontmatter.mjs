import fs from "node:fs/promises"
import path from "node:path"

export async function walkMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const results = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await walkMarkdownFiles(fullPath)))
      continue
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath)
    }
  }
  return results
}

export function parseFrontmatter(raw) {
  if (!raw.startsWith("---\n")) {
    return { frontmatter: null, body: raw, errors: ["missing frontmatter start delimiter"] }
  }

  const end = raw.indexOf("\n---\n", 4)
  if (end === -1) {
    return { frontmatter: null, body: raw, errors: ["missing frontmatter end delimiter"] }
  }

  const block = raw.slice(4, end)
  const body = raw.slice(end + 5)
  const frontmatter = {}
  const errors = []

  for (const line of block.split("\n")) {
    if (!line.trim()) continue
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!match) {
      errors.push(`invalid frontmatter line: ${line}`)
      continue
    }

    const [, key, rawValue] = match
    frontmatter[key] = parseValue(rawValue.trim())
  }

  return { frontmatter, body, errors }
}

function parseValue(value) {
  if (value === "") return ""

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }

  if (/^\[(.*)\]$/.test(value)) {
    const inside = value.slice(1, -1).trim()
    if (!inside) return []

    return inside
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        if ((item.startsWith('"') && item.endsWith('"')) || (item.startsWith("'") && item.endsWith("'"))) {
          return item.slice(1, -1)
        }
        return item
      })
  }

  if (/^(true|false)$/i.test(value)) {
    return value.toLowerCase() === "true"
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value)
  }

  return value
}

export async function readMarkdown(filePath) {
  const raw = await fs.readFile(filePath, "utf8")
  return parseFrontmatter(raw)
}
