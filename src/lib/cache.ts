// ============================================================
// LRU CACHE WITH TTL
// ============================================================

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private maxSize: number
  private defaultTTL: number

  constructor(maxSize: number = 512, defaultTTL: number = 86400000) {
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // Check TTL expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    // Move to end (most recently used) by re-inserting
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  set(key: string, value: T, ttl?: number): void {
    // If key exists, delete it first for LRU ordering
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // Evict least-recently-used entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      } else {
        break
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
    })
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  get size(): number {
    return this.cache.size
  }

  clear(): void {
    this.cache.clear()
  }

  /**
   * Remove all expired entries. Useful for periodic cleanup.
   */
  prune(): number {
    const now = Date.now()
    let removed = 0
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        removed++
      }
    }
    return removed
  }
}
