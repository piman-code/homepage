import fs from "node:fs/promises"
import path from "node:path"
import { normalizeMetadata } from "./metadata-normalizer.mjs"

export class Loader {
  async load() {
    throw new Error("Loader.load() must be implemented")
  }
}

export class FileSystemMarkdownLoader extends Loader {
  constructor({ rootDir, extensions = [".md"], defaultMetadata = {} } = {}) {
    super()
    this.rootDir = rootDir
    this.extensions = extensions
    this.defaultMetadata = defaultMetadata
  }

  async load() {
    if (!this.rootDir) {
      throw new Error("FileSystemMarkdownLoader requires rootDir")
    }

    const files = await walkFiles(this.rootDir, this.extensions)
    const documents = []

    for (const filePath of files) {
      const content = await fs.readFile(filePath, "utf8")
      const relativePath = path.relative(this.rootDir, filePath).replaceAll("\\", "/")
      documents.push({
        id: relativePath,
        content,
        metadata: normalizeMetadata({
          ...this.defaultMetadata,
          path: relativePath,
        }),
      })
    }

    return documents
  }
}

async function walkFiles(dir, extensions) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath, extensions)))
      continue
    }

    if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath)
    }
  }

  return files
}
