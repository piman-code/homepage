import { FixedWindowCounter } from "./time-window-counter.mjs"

const ONE_HOUR_MS = 60 * 60 * 1000

export const DEFAULT_RATE_LIMIT = {
  userPerHour: 20,
  classPerHour: 120,
  windowMs: ONE_HOUR_MS,
}

export class ClassroomRateLimiter {
  constructor({ userPerHour = 20, classPerHour = 120, windowMs = ONE_HOUR_MS, now = () => Date.now() } = {}) {
    this.userCounter = new FixedWindowCounter({
      limit: userPerHour,
      windowMs,
      now,
    })

    this.classCounter = new FixedWindowCounter({
      limit: classPerHour,
      windowMs,
      now,
    })
  }

  checkAndConsume({ userId, classroomId, amount = 1 } = {}) {
    const userKey = requiredKey(userId, "userId")
    const classKey = requiredKey(classroomId, "classroomId")

    if (!this.userCounter.canConsume(userKey, amount)) {
      const usage = this.snapshot(userKey, classKey)
      return {
        allowed: false,
        reason: "user_hourly_limit_exceeded",
        scope: "user",
        retryAfterMs: usage.user.resetInMs,
        usage,
      }
    }

    if (!this.classCounter.canConsume(classKey, amount)) {
      const usage = this.snapshot(userKey, classKey)
      return {
        allowed: false,
        reason: "class_hourly_limit_exceeded",
        scope: "classroom",
        retryAfterMs: usage.classroom.resetInMs,
        usage,
      }
    }

    this.userCounter.consume(userKey, amount)
    this.classCounter.consume(classKey, amount)

    return {
      allowed: true,
      reason: null,
      scope: null,
      retryAfterMs: 0,
      usage: this.snapshot(userKey, classKey),
    }
  }

  snapshot(userId, classroomId) {
    return {
      user: this.userCounter.getUsage(userId),
      classroom: this.classCounter.getUsage(classroomId),
    }
  }
}

function requiredKey(value, label) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required`)
  }
  return String(value)
}
