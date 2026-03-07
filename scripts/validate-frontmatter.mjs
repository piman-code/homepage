import path from "node:path"
import { fileURLToPath } from "node:url"
import { readMarkdown, walkMarkdownFiles } from "./lib/frontmatter.mjs"
import {
  allowedCategories,
  allowedSafetyLevels,
  allowedVisibility,
  pathCategoryRules,
  requiredFields,
} from "./lib/frontmatter-schema.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")
const contentDir = path.join(rootDir, "content")

const files = await walkMarkdownFiles(contentDir)
const errors = []

for (const filePath of files) {
  const relative = path.relative(contentDir, filePath).replaceAll("\\", "/")
  const fileName = path.basename(filePath)

  const { frontmatter, body, errors: parseErrors } = await readMarkdown(filePath)
  for (const parseError of parseErrors) {
    errors.push(`${relative}: ${parseError}`)
  }
  if (!frontmatter) continue

  for (const field of requiredFields) {
    if (!(field in frontmatter)) {
      errors.push(`${relative}: missing required field '${field}'`)
    }
  }

  if (fileName !== "index.md" && !/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/.test(fileName)) {
    errors.push(`${relative}: filename must match YYYY-MM-DD-slug.md`)
  }

  if (typeof frontmatter.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(frontmatter.date)) {
    errors.push(`${relative}: date must be YYYY-MM-DD`)
  }

  if (!allowedCategories.has(String(frontmatter.category ?? ""))) {
    errors.push(`${relative}: category must be one of ${Array.from(allowedCategories).join(", ")}`)
  }

  if ("grade" in frontmatter && typeof frontmatter.grade !== "string") {
    errors.push(`${relative}: grade must be string when provided`)
  }

  if ("subject" in frontmatter && typeof frontmatter.subject !== "string") {
    errors.push(`${relative}: subject must be string when provided`)
  }

  if ("unit" in frontmatter && typeof frontmatter.unit !== "string") {
    errors.push(`${relative}: unit must be string when provided`)
  }

  if ("visibility" in frontmatter && !allowedVisibility.has(String(frontmatter.visibility))) {
    errors.push(`${relative}: visibility must be one of ${Array.from(allowedVisibility).join(", ")}`)
  }

  if ("rag_enabled" in frontmatter && typeof frontmatter.rag_enabled !== "boolean") {
    errors.push(`${relative}: rag_enabled must be true or false when provided`)
  }

  if ("safety_level" in frontmatter && !allowedSafetyLevels.has(String(frontmatter.safety_level))) {
    errors.push(`${relative}: safety_level must be one of ${Array.from(allowedSafetyLevels).join(", ")}`)
  }

  if (!Array.isArray(frontmatter.tags)) {
    errors.push(`${relative}: tags must be YAML array format [tag1, tag2]`)
  }

  if (typeof frontmatter.published !== "boolean") {
    errors.push(`${relative}: published must be true or false`)
  }

  if (typeof frontmatter.pin !== "boolean") {
    errors.push(`${relative}: pin must be true or false`)
  }

  if (frontmatter.category === "assignment" && fileName !== "index.md") {
    if (typeof frontmatter.due !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(frontmatter.due)) {
      errors.push(`${relative}: assignment category requires due: YYYY-MM-DD`)
    }
  }

  for (const { prefix, category } of pathCategoryRules) {
    if (relative.startsWith(prefix) && frontmatter.category !== category) {
      errors.push(`${relative}: expected category '${category}' for path '${prefix}'`)
    }
  }

  if (relative === "index.md" && frontmatter.category !== "home") {
    errors.push(`${relative}: root index.md category must be 'home'`)
  }

  const piiPatterns = [
    { label: "possible phone number", regex: /(01[0-9]-?\d{3,4}-?\d{4})|([0-9]{2,3}-[0-9]{3,4}-[0-9]{4})/ },
    { label: "resident registration number pattern", regex: /\b\d{6}-\d{7}\b/ },
  ]

  for (const pattern of piiPatterns) {
    if (pattern.regex.test(body)) {
      errors.push(`${relative}: ${pattern.label} detected, remove personal data before publish`)
    }
  }
}

if (errors.length > 0) {
  console.error("Frontmatter validation failed:\n")
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log(`Frontmatter validation passed (${files.length} markdown files checked).`)
