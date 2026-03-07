import assert from "node:assert/strict"
import test from "node:test"
import { parseQueryInputDto, validateQueryInputDto } from "../../services/rag/index.mjs"

test("validateQueryInputDto accepts required question and optional filters", () => {
  const result = validateQueryInputDto({
    question: "상태 변화와 에너지 관계를 알려줘",
    subject: "과학",
    grade: "1학년",
    unit: "1단원",
  })

  assert.equal(result.valid, true)
  assert.deepEqual(result.value, {
    question: "상태 변화와 에너지 관계를 알려줘",
    subject: "과학",
    grade: "1학년",
    unit: "1단원",
  })
})

test("validateQueryInputDto rejects missing question and length overflow", () => {
  const result = validateQueryInputDto({
    question: "x",
    subject: "과학",
    grade: "1학년",
    unit: "u".repeat(81),
  })

  assert.equal(result.valid, false)
  assert.equal(result.errors.some((error) => error.field === "question"), true)
  assert.equal(result.errors.some((error) => error.field === "unit"), true)
})

test("parseQueryInputDto rejects values outside subject/grade/unit options", () => {
  assert.throws(
    () =>
      parseQueryInputDto({
        question: "실험 보고서 작성법",
        subject: "수학",
      }),
    /subject must be one of/,
  )
})
