import assert from "node:assert/strict"
import test from "node:test"
import { ConcurrencyQueue, DEFAULT_MAX_CONCURRENCY } from "../../services/guardrails/index.mjs"

test("DEFAULT_MAX_CONCURRENCY uses spec v2 value", () => {
  assert.equal(DEFAULT_MAX_CONCURRENCY, 3)
})

test("ConcurrencyQueue does not exceed max concurrent tasks", async () => {
  const queue = new ConcurrencyQueue({ maxConcurrent: 2 })
  let active = 0
  let maxSeen = 0

  const tasks = Array.from({ length: 6 }, (_, index) =>
    queue.run(async () => {
      active += 1
      maxSeen = Math.max(maxSeen, active)
      await delay(20)
      active -= 1
      return index
    }),
  )

  const values = await Promise.all(tasks)
  assert.deepEqual(values, [0, 1, 2, 3, 4, 5])
  assert.equal(maxSeen, 2)
  assert.deepEqual(queue.stats(), {
    maxConcurrent: 2,
    active: 0,
    queued: 0,
  })
})

test("ConcurrencyQueue rejects invalid task inputs", async () => {
  const queue = new ConcurrencyQueue()
  await assert.rejects(
    queue.run(null),
    /task must be a function returning a promise or value/,
  )
})

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
