import assert from "node:assert/strict"
import test from "node:test"
import { anonymizeRecord, anonymizeText, buildStudentRef } from "../../services/omniforge/pipeline/anonymize.mjs"

test("buildStudentRef generates deterministic pseudonym for studentId", () => {
  const first = buildStudentRef("student-1", { salt: "test-salt" })
  const second = buildStudentRef("student-1", { salt: "test-salt" })
  const third = buildStudentRef("student-2", { salt: "test-salt" })

  assert.equal(first, second)
  assert.notEqual(first, third)
  assert.match(first, /^stu_[a-f0-9]{12}$/)
})

test("anonymizeText redacts email and mobile phone values", () => {
  const text = "문의: student@example.com / 010-1234-5678"
  const redacted = anonymizeText(text)

  assert.match(redacted, /\[redacted-email\]/)
  assert.match(redacted, /\[redacted-phone\]/)
  assert.doesNotMatch(redacted, /student@example\.com/)
  assert.doesNotMatch(redacted, /010-1234-5678/)
})

test("anonymizeRecord removes direct identifiers and keeps analysis fields", () => {
  const payload = {
    studentId: "st-100",
    displayName: "홍길동",
    lessonId: "science-1",
    difficultyText: "연락처 010-3333-4444",
    supportRequest: "상담 희망, student100@example.com 으로 연락",
  }

  const result = anonymizeRecord(payload, { salt: "integration-test" })

  assert.equal("studentId" in result.anonymizedRecord, false)
  assert.equal("displayName" in result.anonymizedRecord, false)
  assert.equal(result.studentRef, buildStudentRef("st-100", { salt: "integration-test" }))
  assert.match(result.anonymizedRecord.difficultyText, /\[redacted-phone\]/)
  assert.match(result.anonymizedRecord.supportRequest, /\[redacted-email\]/)
  assert.ok(result.removedFields.includes("studentId"))
  assert.ok(result.removedFields.includes("displayName"))
})

test("anonymizeRecord removes nested direct identifiers recursively", () => {
  const payload = {
    student_id: "st-200",
    note: {
      guardianPhone: "010-9999-7777",
      guardianEmail: "guardian@example.com",
      memo: "요청사항 없음",
    },
    snapshots: [
      {
        studentName: "학생A",
        comment: "문제 풀이를 도와주세요",
      },
    ],
  }

  const result = anonymizeRecord(payload)

  assert.equal("student_id" in result.anonymizedRecord, false)
  assert.equal("guardianPhone" in result.anonymizedRecord.note, false)
  assert.equal("guardianEmail" in result.anonymizedRecord.note, false)
  assert.equal("studentName" in result.anonymizedRecord.snapshots[0], false)
  assert.equal(result.anonymizedRecord.note.memo, "요청사항 없음")
  assert.ok(result.removedFields.includes("student_id"))
  assert.ok(result.removedFields.includes("guardianPhone"))
  assert.ok(result.removedFields.includes("guardianEmail"))
  assert.ok(result.removedFields.includes("studentName"))
})
