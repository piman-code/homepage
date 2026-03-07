export const DEFAULT_MAX_CONCURRENCY = 3

export class ConcurrencyQueue {
  constructor({ maxConcurrent = DEFAULT_MAX_CONCURRENCY } = {}) {
    if (!Number.isInteger(maxConcurrent) || maxConcurrent <= 0) {
      throw new Error("maxConcurrent must be a positive integer")
    }

    this.maxConcurrent = maxConcurrent
    this.activeCount = 0
    this.queue = []
  }

  async run(task) {
    if (typeof task !== "function") {
      throw new Error("task must be a function returning a promise or value")
    }

    return new Promise((resolve, reject) => {
      const runner = async () => {
        this.activeCount += 1
        try {
          resolve(await task())
        } catch (error) {
          reject(error)
        } finally {
          this.activeCount -= 1
          this.drain()
        }
      }

      if (this.activeCount < this.maxConcurrent) {
        runner()
      } else {
        this.queue.push(runner)
      }
    })
  }

  stats() {
    return {
      maxConcurrent: this.maxConcurrent,
      active: this.activeCount,
      queued: this.queue.length,
    }
  }

  drain() {
    while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
      const next = this.queue.shift()
      next()
    }
  }
}
