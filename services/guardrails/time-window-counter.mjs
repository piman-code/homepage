export class FixedWindowCounter {
  constructor({ limit, windowMs, now = () => Date.now() } = {}) {
    if (!Number.isFinite(limit) || limit < 0) {
      throw new Error("limit must be a non-negative number")
    }
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new Error("windowMs must be greater than 0")
    }

    this.limit = limit
    this.windowMs = windowMs
    this.now = now
    this.windows = new Map()
  }

  canConsume(key, amount = 1) {
    const value = normalizeAmount(amount)
    const window = this.getWindow(key)
    return window.used + value <= this.limit
  }

  consume(key, amount = 1) {
    const value = normalizeAmount(amount)
    const window = this.getWindow(key)

    if (window.used + value > this.limit) {
      return false
    }

    window.used += value
    return true
  }

  getUsage(key) {
    const window = this.getWindow(key)
    const elapsed = this.now() - window.startedAt
    const resetInMs = Math.max(0, this.windowMs - elapsed)

    return {
      used: window.used,
      limit: this.limit,
      remaining: Math.max(0, this.limit - window.used),
      resetInMs,
    }
  }

  reset(key) {
    this.windows.delete(normalizeKey(key))
  }

  getWindow(key) {
    const id = normalizeKey(key)
    const currentTime = this.now()
    const current = this.windows.get(id)

    if (!current || currentTime - current.startedAt >= this.windowMs) {
      const next = { startedAt: currentTime, used: 0 }
      this.windows.set(id, next)
      return next
    }

    return current
  }
}

function normalizeKey(key) {
  if (key === undefined || key === null) {
    throw new Error("counter key is required")
  }
  return String(key)
}

function normalizeAmount(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("amount must be a non-negative number")
  }
  return value
}
