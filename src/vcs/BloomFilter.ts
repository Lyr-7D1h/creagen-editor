//
// Copyright (c) 2025, Jason Davies
// All rights reserved.
//
export class BloomFilter {
  m: number
  k: number
  buckets: Uint32Array
  _locations: Uint8Array | Uint16Array | Uint32Array

  /**
   * @param m - Number of bits, or an array of integers to load.
   * @param k - Number of hashing functions.
   */
  constructor(m: number | ArrayLike<number>, k: number) {
    let a: ArrayLike<number> | undefined
    let mValue: number
    if (typeof m !== 'number') {
      a = m
      mValue = a.length * 32
    } else {
      mValue = m
    }

    const n = Math.ceil(mValue / 32)
    mValue = n * 32
    this.m = mValue
    this.k = k

    const kbytes = 1 << Math.ceil(Math.log2(Math.ceil(Math.log2(mValue) / 8)))
    const ArrayType =
      kbytes === 1 ? Uint8Array : kbytes === 2 ? Uint16Array : Uint32Array
    const kbuffer = new ArrayBuffer(kbytes * k)
    const buckets = new Uint32Array(n)
    if (a) {
      for (let i = 0; i < n; ++i) {
        buckets[i] = a[i] ?? 0
      }
    }
    this.buckets = buckets
    this._locations = new ArrayType(kbuffer)
  }

  // See http://willwhim.wpengine.com/2011/09/03/producing-n-hash-functions-by-hashing-only-once/
  locations(v: string): Uint8Array | Uint16Array | Uint32Array {
    const k = this.k
    const m = this.m
    const r = this._locations
    let a: number
    let b: number

    // FNV-1a hash (64-bit).
    {
      const fnv64PrimeX = 0x01b3
      const l = v.length
      let t0 = 0,
        t1 = 0,
        t2 = 0,
        t3 = 0
      let v0 = 0x2325,
        v1 = 0x8422,
        v2 = 0x9ce4,
        v3 = 0xcbf2

      for (let i = 0; i < l; ++i) {
        v0 ^= v.charCodeAt(i)
        t0 = v0 * fnv64PrimeX
        t1 = v1 * fnv64PrimeX
        t2 = v2 * fnv64PrimeX
        t3 = v3 * fnv64PrimeX
        t2 += v0 << 8
        t3 += v1 << 8
        t1 += t0 >>> 16
        v0 = t0 & 0xffff
        t2 += t1 >>> 16
        v1 = t1 & 0xffff
        v3 = (t3 + (t2 >>> 16)) & 0xffff
        v2 = t2 & 0xffff
      }

      a = (v3 << 16) | v2
      b = (v1 << 16) | v0
    }

    a = a % m
    if (a < 0) a += m
    b = b % m
    if (b < 0) b += m

    // Use enhanced double hashing, i.e. r[i] = h1(v) + i*h2(v) + (i*i*i - i)/6
    // Reference:
    //   Dillinger, Peter C., and Panagiotis Manolios. "Bloom filters in probabilistic verification."
    //   https://www.khoury.northeastern.edu/~pete/pub/bloom-filters-verification.pdf
    r[0] = a
    for (let i = 1; i < k; ++i) {
      a = (a + b) % m
      b = (b + i) % m
      r[i] = a
    }
    return r
  }

  add(v: unknown): void {
    const l = this.locations(String(v))
    const k = this.k
    const buckets = this.buckets
    for (let i = 0; i < k; ++i) {
      const index = l[i]!
      buckets[index >> 5]! |= 1 << (index & 0x1f)
    }
  }

  test(v: unknown): boolean {
    const l = this.locations(String(v))
    const k = this.k
    const buckets = this.buckets
    for (let i = 0; i < k; ++i) {
      const b = l[i]!
      if ((buckets[b >> 5]! & (1 << (b & 0x1f))) === 0) {
        return false
      }
    }
    return true
  }

  // Estimated cardinality.
  size(): number {
    return (-this.m * Math.log(1 - this.countBits() / this.m)) / this.k
  }

  countBits(): number {
    const buckets = this.buckets
    let bits = 0
    for (let i = 0; i < buckets.length; ++i) {
      bits += popcnt(buckets[i]!)
    }
    return bits
  }

  error(): number {
    return Math.pow(this.countBits() / this.m, this.k)
  }

  // Static methods.

  static union(a: BloomFilter, b: BloomFilter): BloomFilter {
    if (a.m === b.m && a.k === b.k) {
      const l = a.m >> 5
      const c = new Uint32Array(l)
      for (let i = 0; i < l; ++i) {
        c[i] = a.buckets[i]! | b.buckets[i]!
      }
      return new BloomFilter(c, a.k)
    }
    throw new Error('Bloom filters must have identical {m, k}.')
  }

  static intersection(a: BloomFilter, b: BloomFilter): BloomFilter {
    if (a.m === b.m && a.k === b.k) {
      const l = a.m >> 5
      const c = new Uint32Array(l)
      for (let i = 0; i < l; ++i) {
        c[i] = a.buckets[i]! & b.buckets[i]!
      }
      return new BloomFilter(c, a.k)
    }
    throw new Error('Bloom filters must have identical {m, k}.')
  }

  static withTargetError(n: number, error: number): BloomFilter {
    const m = Math.ceil((-n * Math.log2(error)) / Math.LN2)
    const k = Math.ceil((Math.LN2 * m) / n)
    return new BloomFilter(m, k)
  }
}

// http://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetParallel
function popcnt(v: number): number {
  let bits = v
  bits -= (bits >>> 1) & 0x55555555
  bits = (bits & 0x33333333) + ((bits >>> 2) & 0x33333333)
  return (((bits + (bits >>> 4)) & 0xf0f0f0f) * 0x1010101) >>> 24
}
