import assert from "node:assert/strict"
import test from "node:test"
import { DEFAULT_TOKEN_BUDGET, TokenBudgetGuardrail } from "../../services/guardrails/index.mjs"

test("DEFAULT_TOKEN_BUDGET uses spec v2 values", () => {
  assert.deepEqual(DEFAULT_TOKEN_BUDGET, {
    hourBudget: 80_000,
    dayBudget: 500_000,
    softCapRatio: 0.8,
  })
})

test("TokenBudgetGuardrail enters summary mode at soft cap", () => {
  const guardrail = new TokenBudgetGuardrail({
    hourBudget: 100,
    dayBudget: 1000,
    softCapRatio: 0.8,
  })

  const normal = guardrail.checkAndConsume({ classroomId: "c1", tokens: 79 })
  const summary = guardrail.checkAndConsume({ classroomId: "c1", tokens: 1 })

  assert.equal(normal.allowed, true)
  assert.equal(normal.mode, "normal")
  assert.equal(normal.reason, null)

  assert.equal(summary.allowed, true)
  assert.equal(summary.mode, "summary")
  assert.equal(summary.reason, "soft_cap_reached")
  assert.equal(summary.usage.hour.ratio, 0.8)
})

test("TokenBudgetGuardrail blocks hourly and daily hard caps", () => {
  const hourlyGuardrail = new TokenBudgetGuardrail({
    hourBudget: 100,
    dayBudget: 1000,
  })

  assert.equal(hourlyGuardrail.checkAndConsume({ classroomId: "c1", tokens: 100 }).allowed, true)
  const hourlyBlocked = hourlyGuardrail.checkAndConsume({ classroomId: "c1", tokens: 1 })
  assert.equal(hourlyBlocked.allowed, false)
  assert.equal(hourlyBlocked.mode, "blocked")
  assert.equal(hourlyBlocked.reason, "hourly_token_budget_exceeded")

  const dailyGuardrail = new TokenBudgetGuardrail({
    hourBudget: 1000,
    dayBudget: 100,
  })

  assert.equal(dailyGuardrail.checkAndConsume({ classroomId: "c1", tokens: 100 }).allowed, true)
  const dailyBlocked = dailyGuardrail.checkAndConsume({ classroomId: "c1", tokens: 1 })
  assert.equal(dailyBlocked.allowed, false)
  assert.equal(dailyBlocked.mode, "blocked")
  assert.equal(dailyBlocked.reason, "daily_token_budget_exceeded")
})

test("TokenBudgetGuardrail resets daily budget at KST midnight", () => {
  let nowMs = Date.parse("2026-02-26T14:59:50Z") // 2026-02-26 23:59:50 KST
  const guardrail = new TokenBudgetGuardrail({
    hourBudget: 1000,
    dayBudget: 100,
    now: () => nowMs,
  })

  assert.equal(guardrail.checkAndConsume({ classroomId: "c1", tokens: 100 }).allowed, true)
  const blocked = guardrail.checkAndConsume({ classroomId: "c1", tokens: 1 })
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.reason, "daily_token_budget_exceeded")

  nowMs = Date.parse("2026-02-26T15:00:01Z") // 2026-02-27 00:00:01 KST
  const afterReset = guardrail.checkAndConsume({ classroomId: "c1", tokens: 1 })

  assert.equal(afterReset.allowed, true)
  assert.equal(afterReset.usage.day.used, 1)
  assert.equal(afterReset.usage.day.remaining, 99)
  assert.equal(afterReset.usage.day.resetInMs, 86_399_000)
})
