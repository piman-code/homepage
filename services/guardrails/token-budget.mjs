import { FixedWindowCounter } from "./time-window-counter.mjs"

const ONE_HOUR_MS = 60 * 60 * 1000
const KST_OFFSET_MS = 9 * ONE_HOUR_MS

export const DEFAULT_TOKEN_BUDGET = {
  hourBudget: 80_000,
  dayBudget: 500_000,
  softCapRatio: 0.8,
}

export class TokenBudgetGuardrail {
  constructor({ hourBudget = 80_000, dayBudget = 500_000, softCapRatio = 0.8, now = () => Date.now() } = {}) {
    if (!Number.isFinite(softCapRatio) || softCapRatio <= 0 || softCapRatio >= 1) {
      throw new Error("softCapRatio must be between 0 and 1")
    }

    this.softCapRatio = softCapRatio
    this.hourCounter = new FixedWindowCounter({
      limit: hourBudget,
      windowMs: ONE_HOUR_MS,
      now,
    })

    this.dayCounter = new KstDailyCounter({
      limit: dayBudget,
      now,
    })
  }

  checkAndConsume({ classroomId = "default", tokens } = {}) {
    const scope = String(classroomId)
    const amount = normalizeTokens(tokens)

    if (!this.hourCounter.canConsume(scope, amount)) {
      return this.blocked(scope, "hourly_token_budget_exceeded")
    }

    if (!this.dayCounter.canConsume(scope, amount)) {
      return this.blocked(scope, "daily_token_budget_exceeded")
    }

    this.hourCounter.consume(scope, amount)
    this.dayCounter.consume(scope, amount)

    const usage = this.getUsage(scope)
    const softCapReached = usage.hour.ratio >= this.softCapRatio || usage.day.ratio >= this.softCapRatio

    return {
      allowed: true,
      mode: softCapReached ? "summary" : "normal",
      reason: softCapReached ? "soft_cap_reached" : null,
      usage,
    }
  }

  getUsage(classroomId = "default") {
    const scope = String(classroomId)
    const hour = this.hourCounter.getUsage(scope)
    const day = this.dayCounter.getUsage(scope)

    return {
      hour: {
        ...hour,
        ratio: hour.limit === 0 ? 1 : hour.used / hour.limit,
      },
      day: {
        ...day,
        ratio: day.limit === 0 ? 1 : day.used / day.limit,
      },
    }
  }

  blocked(scope, reason) {
    return {
      allowed: false,
      mode: "blocked",
      reason,
      usage: this.getUsage(scope),
    }
  }
}

function normalizeTokens(tokens) {
  const value = Number(tokens)
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("tokens must be a non-negative number")
  }
  return value
}

class KstDailyCounter {
  constructor({ limit, now = () => Date.now() } = {}) {
    if (!Number.isFinite(limit) || limit < 0) {
      throw new Error("limit must be a non-negative number")
    }

    this.limit = limit
    this.now = now
    this.buckets = new Map()
  }

  canConsume(scope, amount = 1) {
    const value = normalizeTokens(amount)
    const bucket = this.getBucket(scope)
    return bucket.used + value <= this.limit
  }

  consume(scope, amount = 1) {
    const value = normalizeTokens(amount)
    const bucket = this.getBucket(scope)

    if (bucket.used + value > this.limit) {
      return false
    }

    bucket.used += value
    return true
  }

  getUsage(scope) {
    const bucket = this.getBucket(scope)
    const nowMs = this.now()

    return {
      used: bucket.used,
      limit: this.limit,
      remaining: Math.max(0, this.limit - bucket.used),
      resetInMs: msUntilNextKstMidnight(nowMs),
    }
  }

  getBucket(scope) {
    const key = String(scope)
    const dayKey = toKstDayKey(this.now())
    const current = this.buckets.get(key)

    if (!current || current.dayKey !== dayKey) {
      const next = { dayKey, used: 0 }
      this.buckets.set(key, next)
      return next
    }

    return current
  }
}

function toKstDayKey(nowMs) {
  const shifted = new Date(nowMs + KST_OFFSET_MS)
  const year = shifted.getUTCFullYear()
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0")
  const day = String(shifted.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function msUntilNextKstMidnight(nowMs) {
  const nextMidnightMs = getNextKstMidnightMs(nowMs)
  return Math.max(0, nextMidnightMs - nowMs)
}

function getNextKstMidnightMs(nowMs) {
  const shifted = new Date(nowMs + KST_OFFSET_MS)
  const midnightUtcMs = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  )
  return midnightUtcMs - KST_OFFSET_MS
}
