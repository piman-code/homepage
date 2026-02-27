import crypto from "node:crypto"

export const PII_ENCRYPTION_STUB_PREFIX = "stub:v1:"
const ENCODING = "base64url"

export function createStubEncryptor({ secret = "omniforge-mvp-secret" } = {}) {
  const secretDigest = crypto.createHash("sha256").update(String(secret)).digest("hex")

  return {
    encrypt(value = "") {
      const plaintext = typeof value === "string" ? value : JSON.stringify(value ?? {})
      const payload = `${secretDigest}:${plaintext}`
      const ciphertext = Buffer.from(payload, "utf8").toString(ENCODING)
      return `${PII_ENCRYPTION_STUB_PREFIX}${ciphertext}`
    },
    decrypt(blob = "") {
      if (typeof blob !== "string" || !blob.startsWith(PII_ENCRYPTION_STUB_PREFIX)) {
        throw new Error("Invalid PII blob format")
      }

      const encoded = blob.slice(PII_ENCRYPTION_STUB_PREFIX.length)
      const decoded = Buffer.from(encoded, ENCODING).toString("utf8")

      if (!decoded.startsWith(`${secretDigest}:`)) {
        throw new Error("Invalid encryption secret")
      }

      return decoded.slice(secretDigest.length + 1)
    },
  }
}

export class PiiStore {
  constructor({ encryptor = createStubEncryptor(), now = () => new Date().toISOString() } = {}) {
    if (!encryptor || typeof encryptor.encrypt !== "function" || typeof encryptor.decrypt !== "function") {
      throw new Error("PiiStore requires encryptor.encrypt() and encryptor.decrypt()")
    }

    this.encryptor = encryptor
    this.now = now
    this.records = new Map()
  }

  saveProfile({ studentId, familyNotes = "", counselingNotes = "", consent = null, metadata = {} } = {}) {
    const normalizedStudentId = requiredString(studentId, "studentId")
    const profile = {
      familyNotes: normalizeText(familyNotes),
      counselingNotes: normalizeText(counselingNotes),
      consent: consent && typeof consent === "object" ? { ...consent } : null,
      metadata: metadata && typeof metadata === "object" ? { ...metadata } : {},
    }

    const encryptedBlob = this.encryptor.encrypt(JSON.stringify(profile))
    const record = {
      studentId: normalizedStudentId,
      encryptedBlob,
      updatedAt: this.now(),
    }

    this.records.set(normalizedStudentId, record)
    return { ...record }
  }

  getProfile(studentId) {
    const normalizedStudentId = requiredString(studentId, "studentId")
    const record = this.records.get(normalizedStudentId)
    if (!record) return null

    const decrypted = this.encryptor.decrypt(record.encryptedBlob)
    return {
      studentId: normalizedStudentId,
      profile: JSON.parse(decrypted),
      updatedAt: record.updatedAt,
    }
  }

  getEncryptedRecord(studentId) {
    const normalizedStudentId = requiredString(studentId, "studentId")
    const record = this.records.get(normalizedStudentId)
    return record ? { ...record } : null
  }

  size() {
    return this.records.size
  }
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required`)
  }
  return value.trim()
}

function normalizeText(value) {
  if (typeof value !== "string") return ""
  return value.trim()
}
