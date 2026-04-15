const CACHE_KEY_DATA_SEPARATOR = '\u001e'
export function recordToCacheKey(data: Record<string, unknown>) {
  return Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(
      ([key, value]) =>
        `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`,
    )
    .join(CACHE_KEY_DATA_SEPARATOR)
}

export class LruCache<K, V> {
  private readonly maxEntries: number
  private readonly cache = new Map<K, V>()

  constructor(maxEntries: number) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new Error('maxEntries must be a positive integer')
    }
    this.maxEntries = maxEntries
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value === undefined) return undefined

    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    this.cache.set(key, value)

    if (this.cache.size > this.maxEntries) {
      // Map keeps insertion order so the first key found is also the first key inserted
      const oldestKeyEntry = this.cache.keys().next()
      if (oldestKeyEntry.done) return
      this.cache.delete(oldestKeyEntry.value)
    }
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}
