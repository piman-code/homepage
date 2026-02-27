import assert from "node:assert/strict"
import test from "node:test"
import {
  SENSITIVITY_EXTERNAL_BLOCK_REASON,
  SENSITIVITY_TAGS,
  extractSensitivityTags,
  routeBySensitivity,
} from "../../services/omniforge/policy/sensitivity-router.mjs"

test("SENSITIVITY_TAGS matches PRD sensitivity tag set", () => {
  assert.deepEqual(SENSITIVITY_TAGS, ["family", "counseling", "conflict", "health"])
})

test("routeBySensitivity returns local-only for sensitive tags", () => {
  const result = routeBySensitivity({
    tags: ["family"],
    requestedRoute: "local",
  })

  assert.equal(result.allowed, true)
  assert.equal(result.route, "local-only")
  assert.equal(result.mode, "local-only")
  assert.deepEqual(result.sensitiveTags, ["family"])
  assert.equal(result.blockReason, null)
})

test("routeBySensitivity blocks when external route is requested with sensitive tags", () => {
  const result = routeBySensitivity({
    tags: ["health"],
    requestedRoute: "external",
  })

  assert.equal(result.allowed, false)
  assert.equal(result.route, "blocked")
  assert.equal(result.mode, "blocked")
  assert.equal(result.blockReason, SENSITIVITY_EXTERNAL_BLOCK_REASON)
  assert.deepEqual(result.sensitiveTags, ["health"])
})

test("extractSensitivityTags detects sensitivity signals from fields and text", () => {
  const tags = extractSensitivityTags({
    tags: ["general"],
    fields: {
      counselingNotes: "상담 요청",
    },
    text: "최근 친구 관계 갈등 때문에 어려움을 느낍니다.",
  })

  assert.deepEqual(tags, ["counseling", "conflict"])
})

test("routeBySensitivity allows external route with non-sensitive payload", () => {
  const result = routeBySensitivity({
    tags: ["study"],
    text: "수학 2단원 분수 계산이 어려워요.",
    requestedRoute: "external",
  })

  assert.equal(result.allowed, true)
  assert.equal(result.route, "external")
  assert.equal(result.blockReason, null)
  assert.deepEqual(result.sensitiveTags, [])
})
