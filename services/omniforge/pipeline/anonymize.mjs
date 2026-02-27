import crypto from "node:crypto"

export const DEFAULT_ANONYMIZE_SALT = "omniforge-anonymize-v1"
export const DIRECT_IDENTIFIER_FIELDS = Object.freeze([
  "studentId",
  "student_id",
  "displayName",
  "display_name",
  "studentName",
  "student_name",
  "email",
  "phone",
  "guardianName",
  "guardian_name",
  "guardianEmail",
  "guardian_email",
  "guardianPhone",
  "guardian_phone",
])

const DIRECT_IDENTIFIER_FIELD_SET = new Set(DIRECT_IDENTIFIER_FIELDS.map((field) => field.toLowerCase()))
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const MOBILE_PATTERN = /(?:\+?82[-\s]?)?0?1[0-9][-\s]?\d{3,4}[-\s]?\d{4}\b/g

export function buildStudentRef(studentId, { salt = DEFAULT_ANONYMIZE_SALT } = {}) {
  if (studentId === null || studentId === undefined || String(studentId).trim() === "") return null

  const digest = crypto
    .createHash("sha256")
    .update(`${salt}:${String(studentId).trim()}`)
    .digest("hex")
    .slice(0, 12)

  return `stu_${digest}`
}

export function anonymizeText(text = "") {
  if (typeof text !== "string") return text

  return text
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(MOBILE_PATTERN, "[redacted-phone]")
}

export function anonymizeRecord(record, { salt = DEFAULT_ANONYMIZE_SALT } = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("anonymizeRecord expects an object payload")
  }

  const removedFields = []
  const rawStudentId = resolveStudentId(record)
  const studentRef = buildStudentRef(rawStudentId, { salt })
  const anonymizedRecord = sanitizeValue(record, removedFields)

  if (studentRef) {
    anonymizedRecord.studentRef = studentRef
  }

  return {
    anonymizedRecord,
    studentRef,
    removedFields: [...new Set(removedFields)],
  }
}

function sanitizeValue(value, removedFields) {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, removedFields))
  }

  if (value && typeof value === "object") {
    const next = {}

    for (const [key, entry] of Object.entries(value)) {
      if (isDirectIdentifierField(key)) {
        removedFields.push(key)
        continue
      }

      next[key] = sanitizeValue(entry, removedFields)
    }

    return next
  }

  if (typeof value === "string") {
    return anonymizeText(value)
  }

  return value
}

function resolveStudentId(record) {
  if (typeof record.studentId === "string" && record.studentId.trim()) return record.studentId.trim()
  if (typeof record.student_id === "string" && record.student_id.trim()) return record.student_id.trim()
  return null
}

function isDirectIdentifierField(field) {
  return DIRECT_IDENTIFIER_FIELD_SET.has(String(field).toLowerCase())
}
