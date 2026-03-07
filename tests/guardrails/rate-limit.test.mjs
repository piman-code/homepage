import assert from "node:assert/strict"
import test from "node:test"
import { ClassroomRateLimiter, DEFAULT_RATE_LIMIT } from "../../services/guardrails/index.mjs"

test("DEFAULT_RATE_LIMIT uses spec v2 values", () => {
  assert.deepEqual(DEFAULT_RATE_LIMIT, {
    userPerHour: 20,
    classPerHour: 120,
    windowMs: 60 * 60 * 1000,
  })
})

test("ClassroomRateLimiter blocks when user hourly limit is exceeded", () => {
  let nowMs = 0
  const limiter = new ClassroomRateLimiter({
    userPerHour: 2,
    classPerHour: 10,
    windowMs: 1000,
    now: () => nowMs,
  })

  const first = limiter.checkAndConsume({ userId: "u1", classroomId: "c1" })
  const second = limiter.checkAndConsume({ userId: "u1", classroomId: "c1" })
  const blocked = limiter.checkAndConsume({ userId: "u1", classroomId: "c1" })

  assert.equal(first.allowed, true)
  assert.equal(second.allowed, true)
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.reason, "user_hourly_limit_exceeded")
  assert.equal(blocked.scope, "user")
  assert.equal(blocked.usage.user.used, 2)

  nowMs = 1001
  const afterReset = limiter.checkAndConsume({ userId: "u1", classroomId: "c1" })
  assert.equal(afterReset.allowed, true)
})

test("ClassroomRateLimiter blocks when class hourly limit is exceeded", () => {
  const limiter = new ClassroomRateLimiter({
    userPerHour: 10,
    classPerHour: 2,
  })

  assert.equal(limiter.checkAndConsume({ userId: "u1", classroomId: "c1" }).allowed, true)
  assert.equal(limiter.checkAndConsume({ userId: "u2", classroomId: "c1" }).allowed, true)

  const blocked = limiter.checkAndConsume({ userId: "u3", classroomId: "c1" })
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.reason, "class_hourly_limit_exceeded")
  assert.equal(blocked.scope, "classroom")
  assert.equal(blocked.usage.classroom.used, 2)
})
