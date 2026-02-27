import path from "node:path"
import { fileURLToPath } from "node:url"
import { readMarkdown, walkMarkdownFiles } from "./lib/frontmatter.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")
const contentDir = path.join(rootDir, "content")

const forbiddenFrontmatterKeys = new Set([
  "student_name",
  "student_id",
  "student_number",
  "resident_registration_number",
  "guardian_name",
  "guardian_phone",
  "phone",
  "email",
  "address",
  "private_note",
  "counsel_record",
  "health_record",
])

const forbiddenBodyPatterns = [
  {
    label: "resident registration number pattern",
    regex: /\b\d{6}-\d{7}\b/,
  },
  {
    label: "phone number pattern",
    regex: /(01[0-9]-?\d{3,4}-?\d{4})|([0-9]{2,3}-[0-9]{3,4}-[0-9]{4})/,
  },
  {
    label: "sensitive keyword: 주민등록번호",
    regex: /주민등록번호/,
  },
  {
    label: "sensitive keyword: 보호자 연락처",
    regex: /보호자\s*연락처/,
  },
  {
    label: "sensitive keyword: 상담기록",
    regex: /상담기록/,
  },
  {
    label: "sensitive keyword: 건강기록",
    regex: /건강기록/,
  },
]

const files = await walkMarkdownFiles(contentDir)
const errors = []
let checkedPublicCount = 0

for (const filePath of files) {
  const relative = path.relative(contentDir, filePath).replaceAll("\\", "/")
  const { frontmatter, body, errors: parseErrors } = await readMarkdown(filePath)

  for (const parseError of parseErrors) {
    errors.push(`${relative}: ${parseError}`)
  }
  if (!frontmatter) continue

  const visibility = String(frontmatter.visibility ?? "public")
  const isPublished = frontmatter.published !== false
  const isPublicTarget = visibility !== "internal" && isPublished

  if (relative.includes("/internal/") && visibility !== "internal") {
    errors.push(`${relative}: files under internal/ must set visibility: internal`)
  }

  if (visibility === "internal" && frontmatter.published === true) {
    errors.push(`${relative}: visibility: internal cannot be published: true`)
  }

  if (!isPublicTarget) {
    continue
  }

  checkedPublicCount += 1

  for (const key of forbiddenFrontmatterKeys) {
    if (key in frontmatter) {
      errors.push(`${relative}: forbidden frontmatter key '${key}' detected`)
    }
  }

  for (const pattern of forbiddenBodyPatterns) {
    if (pattern.regex.test(body)) {
      errors.push(`${relative}: ${pattern.label}`)
    }
  }
}

if (errors.length > 0) {
  console.error("Sharenote preflight failed:\n")
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log(`Sharenote preflight passed (${checkedPublicCount} public markdown files checked).`)
