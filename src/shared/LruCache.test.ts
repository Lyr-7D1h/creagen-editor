import { describe, expect, test } from 'vitest'
import { LruCache } from './LruCache'

describe('LruCache eviction', () => {
  test('evicts least recently used entry when max size is exceeded', () => {
    const cache = new LruCache<string, number>(2)

    cache.set('a', 1)
    cache.set('b', 2)

    // Touch a so b becomes the least recently used entry.
    expect(cache.get('a')).toBe(1)

    cache.set('c', 3)

    expect(cache.size).toBe(2)
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBe(3)
  })

  test('keeps size capped when overflowing max entries multiple times', () => {
    const maxEntries = 3
    const cache = new LruCache<string, number>(maxEntries)

    for (let i = 0; i < 20; i++) {
      cache.set(`k${i}`, i)
      expect(cache.size).toBeLessThanOrEqual(maxEntries)
    }

    expect(cache.size).toBe(maxEntries)

    // Only the most recent maxEntries should remain.
    expect(cache.get('k17')).toBe(17)
    expect(cache.get('k18')).toBe(18)
    expect(cache.get('k19')).toBe(19)
    expect(cache.get('k0')).toBeUndefined()
    expect(cache.get('k10')).toBeUndefined()
  })
})
