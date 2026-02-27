import assert from "node:assert/strict"
import test from "node:test"
import {
  HARD_CAP_BLOCK_MESSAGE_TEMPLATE,
  RetrievalGenerationPipeline,
  SUMMARY_MODE_NOTICE,
} from "../../services/rag/index.mjs"

test("RetrievalGenerationPipeline runs retrieve -> context build -> generate", async () => {
  const retrieverCalls = []
  const generatorCalls = []

  const chunks = [
    {
      id: "chunk-1",
      content: "상태 변화는 에너지 이동과 함께 일어난다.",
      score: 3,
      metadata: {
        path: "lessons/science/ch1.md",
        title: "과학 1단원",
        subject: "과학",
        grade: "1학년",
        unit: "1단원",
      },
    },
    {
      id: "chunk-2",
      content: "영어 발표 수행평가 루브릭이다.",
      score: 1,
      metadata: {
        path: "lessons/english/ch1.md",
        title: "영어 발표",
        subject: "영어",
        grade: "1학년",
        unit: "1단원",
      },
    },
  ]

  const retriever = {
    async retrieve(question, options = {}) {
      retrieverCalls.push({ question, options })
      return chunks.filter((chunk) => {
        if (typeof options.filter !== "function") return true
        return options.filter(chunk.metadata)
      })
    },
  }

  const generator = {
    async generate(payload) {
      generatorCalls.push(payload)
      return { answer: `답변:${payload.question}` }
    },
  }

  const pipeline = new RetrievalGenerationPipeline({ retriever, generator })
  const result = await pipeline.run({
    question: "상태 변화 핵심만 요약해줘",
    subject: "과학",
    grade: "1학년",
    unit: "1단원",
  })

  assert.equal(retrieverCalls.length, 1)
  assert.equal(retrieverCalls[0].question, "상태 변화 핵심만 요약해줘")
  assert.equal(typeof retrieverCalls[0].options.filter, "function")
  assert.equal(result.retrievedCount, 1)
  assert.equal(result.answer, "답변:상태 변화 핵심만 요약해줘")
  assert.equal(result.sources.length, 1)
  assert.equal(result.sources[0].path, "lessons/science/ch1.md")
  assert.match(generatorCalls[0].context, /상태 변화는 에너지 이동과 함께 일어난다/)
  assert.equal(result.mode, "normal")
  assert.equal(result.blocked, false)
  assert.equal(result.uncertain, false)
})

test("RetrievalGenerationPipeline marks answer as 미확인 when evidence is insufficient", async () => {
  const retriever = {
    async retrieve() {
      return []
    },
  }

  const generator = {
    async generate() {
      return { answer: "관련 근거를 찾지 못했습니다." }
    },
  }

  const pipeline = new RetrievalGenerationPipeline({ retriever, generator })
  const result = await pipeline.run({
    question: "모르는 내용을 답해줘",
  })

  assert.equal(result.uncertain, true)
  assert.equal(result.sources.length, 0)
  assert.match(result.answer, /^미확인:/)
})

test("RetrievalGenerationPipeline performs request guardrail checks before retrieval", async () => {
  let retrieveCalled = false
  let generateCalled = false

  const retriever = {
    async retrieve() {
      retrieveCalled = true
      return []
    },
  }

  const generator = {
    async generate() {
      generateCalled = true
      return { answer: "should not run" }
    },
  }

  const rateLimiter = {
    checkAndConsume() {
      return {
        allowed: false,
        reason: "user_hourly_limit_exceeded",
        retryAfterMs: 60_000,
      }
    },
  }

  const pipeline = new RetrievalGenerationPipeline({
    retriever,
    generator,
    rateLimiter,
    now: () => Date.parse("2026-02-26T00:00:00Z"),
  })

  const result = await pipeline.run({
    question: "요청 제한 검사",
    userId: "student-01",
    classroomId: "class-2-1",
  })

  assert.equal(result.blocked, true)
  assert.equal(result.mode, "blocked")
  assert.equal(result.guardrails.blockedBy, "rate_limit")
  assert.equal(retrieveCalled, false)
  assert.equal(generateCalled, false)
  assert.match(result.answer, /다음 이용 가능 시각\(KST\): 2026-02-26 09:01/)
})

test("RetrievalGenerationPipeline prepends summary notice at token soft cap", async () => {
  const generatorCalls = []

  const retriever = {
    async retrieve() {
      return [
        {
          id: "chunk-1",
          content: "요약할 수 있는 본문",
          metadata: { path: "lessons/science/ch1.md" },
        },
      ]
    },
  }

  const generator = {
    async generate(payload) {
      generatorCalls.push(payload)
      return { answer: "핵심 요약 답변" }
    },
  }

  const tokenBudget = {
    checkAndConsume() {
      return {
        allowed: true,
        mode: "summary",
        reason: "soft_cap_reached",
        usage: {
          hour: { used: 80, limit: 100, ratio: 0.8 },
          day: { used: 100, limit: 1000, ratio: 0.1 },
        },
      }
    },
  }

  const pipeline = new RetrievalGenerationPipeline({
    retriever,
    generator,
    tokenBudget,
  })

  const result = await pipeline.run({
    question: "소프트캡 요약 동작",
    classroomId: "class-2-1",
  })

  assert.equal(result.blocked, false)
  assert.equal(result.mode, "summary")
  assert.equal(generatorCalls[0].responseMode, "summary")
  assert.match(result.answer, new RegExp(`^${escapeRegExp(SUMMARY_MODE_NOTICE)}`))
  assert.match(result.answer, /핵심 요약 답변$/)
})

test("RetrievalGenerationPipeline blocks hard cap and returns KST reset_time message", async () => {
  let retrieveCalled = false

  const retriever = {
    async retrieve() {
      retrieveCalled = true
      return []
    },
  }

  const generator = {
    async generate() {
      return { answer: "should not run" }
    },
  }

  const tokenBudget = {
    checkAndConsume() {
      return {
        allowed: false,
        mode: "blocked",
        reason: "daily_token_budget_exceeded",
        usage: {
          hour: { used: 80_000, limit: 80_000, resetInMs: 10_000 },
          day: { used: 500_000, limit: 500_000, resetInMs: 10_000 },
        },
      }
    },
  }

  const pipeline = new RetrievalGenerationPipeline({
    retriever,
    generator,
    tokenBudget,
    now: () => Date.parse("2026-02-26T14:15:00Z"),
  })

  const result = await pipeline.run({
    question: "하드캡 차단 동작",
    classroomId: "class-2-1",
  })

  const expected = HARD_CAP_BLOCK_MESSAGE_TEMPLATE.replace("{reset_time}", "2026-02-27 00:00")

  assert.equal(result.blocked, true)
  assert.equal(result.mode, "blocked")
  assert.equal(result.guardrails.blockedBy, "token_budget")
  assert.equal(result.resetTimeKst, "2026-02-27 00:00")
  assert.equal(result.answer, expected)
  assert.equal(retrieveCalled, false)
})

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
