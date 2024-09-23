import { roundToDec } from './math'

type Y<N extends number> = N extends 3
  ? number
  : N extends 2
    ? number
    : undefined
type Z<N extends number> = N extends 3 ? number : undefined

type GrowToSize<
  T,
  N extends number,
  A extends T[],
  L extends number = A['length'],
> = L extends N ? A : L extends 999 ? T[] : GrowToSize<T, N, [...A, T]>

type FixedArray<T, N extends number> = GrowToSize<T, N, [], 0>

export class Vector<N extends number> extends Array<number> {
  constructor(...items: [number[] & { length: N }])
  constructor(...items: number[] & { length: N })
  // constructor(...items: [number[]])
  constructor(...items: number[])
  constructor(
    ...items: [number[] & { length: N }] | (number[] & { length: N })
  ) {
    if (typeof items[0] === 'undefined') {
      throw Error("can't create empty vector")
    }
    if (typeof items[0] === 'number') {
      super(...(items as number[]))
    } else {
      super(...(items[0] as number[]))
    }
    Object.setPrototypeOf(this, Vector.prototype)
  }

  override get length(): N {
    return super.length as N
  }

  override push(): number {
    throw new Error('Cannot add items to FixedSizeArray')
  }

  override pop(): number | undefined {
    throw new Error('Cannot remove items from FixedSizeArray')
  }

  clone() {
    return new Vector<N>(
      ...([...this] as GrowToSize<number, N, [], 0> & {
        [Symbol.iterator]: () => any
      }),
    )
  }

  /** mutable mapping oftor values */
  mutmap(
    callbackfn: (value: number, index: number, array: number[]) => number,
  ) {
    for (let i = 0; i < this.length; i++) {
      this[i] = callbackfn(this[i]!, i, this)
    }
    return this
  }

  get(i: number) {
    return this[i]!
  }

  set(i: number, v: number) {
    this[i] = v
  }

  add(v: Vector<N>) {
    for (let i = 0; i < this.length; i++) {
      this[i] += v[i]!
    }
    return this
  }

  /** normalize */
  norm() {
    const mag2 = this.mag2()
    if (mag2 === 0) return this
    // TODO: use https://en.wikipedia.org/wiki/Fast_inverse_square_root
    const a = 1 / Math.sqrt(mag2)
    if (a === 0) return this
    for (let i = 0; i < this.length; i++) {
      this[i] *= a
    }
    return this
  }

  sub(v: Vector<N>) {
    for (let i = 0; i < this.length; i++) {
      this[i] -= v.get(i)
    }
    return this
  }

  roundToDec(dec?: number) {
    for (let i = 0; i < this.length; i++) {
      this[i] = roundToDec(this[i]!, dec)
    }
    return this
  }

  round() {
    for (let i = 0; i < this.length; i++) {
      this[i] = Math.round(this[i]!)
    }
    return this
  }

  mul(s: number) {
    for (let i = 0; i < this.length; i++) {
      this[i] *= s
    }
    return this
  }

  floor() {
    for (let i = 0; i < this.length; i++) {
      this[i] = Math.floor(this[i]!)
    }
    return this
  }

  scale(s: number) {
    for (let i = 0; i < this.length; i++) {
      this[i] *= s
    }
    return this
  }

  /** airthmetic mean */
  mean(): number {
    return this.average()
  }

  /** airthmetic average */
  average(): number {
    return this.sum() / this.length
  }

  /** magnitude squared */
  mag2(): number {
    let m = 0
    for (let i = 0; i < this.length; i++) {
      m += this.get(i) ** 2
    }
    return m
  }

  /** Calculate the average difference from the average */
  spread() {
    return Math.sqrt(this.spread2())
  }

  /** Calculate the average difference from the average squared */
  spread2() {
    const average = this.average()
    let spread = 0
    for (let i = 0; i < this.length; i++) {
      spread += Math.pow(this.get(i) - average, 2)
    }

    return spread / this.length
  }

  chunk(size: number): Vector<any>[] {
    if (size < 0 || !Number.isFinite(size)) {
      throw Error('size must be a positive number')
    }
    var index = 0,
      resIndex = 0,
      result = Array(Math.ceil(this.length / size))

    while (index < this.length) {
      result[resIndex++] = this.slice(index, (index += size))
    }
    return result
  }

  /** if a number is above or below a limit it correct it so it is within the boundary limits */
  wraparound(limits: FixedArray<[number, number], N>) {
    for (let i = 0; i < this.length; i++) {
      const [start, stop] = (limits as any)[i] as [number, number]
      const v = this[i]!
      if (v < start) {
        const diff = stop - start
        this[i] = stop - ((start - v) % diff)
      } else if (v > stop) {
        const diff = stop - start
        this[i] = start + ((v - stop) % diff)
      }
    }
    return this
  }

  sum(): number {
    let a = 0
    for (let i = 0; i < this.length; i++) {
      a += this.get(i)
    }
    return a
  }

  get x(): number {
    return this[0]!
  }

  get y(): Y<N> {
    return this[1] as Y<N>
  }

  get z(): Z<N> {
    return this[2] as Z<N>
  }
}

export function vec<N extends number>(
  ...items: [number[] & { length: N }]
): Vector<N>
export function vec<N extends number>(
  ...items: [...number[]] & { length: N }
): Vector<N>
export function vec<N extends number>(...items: [...number[]]): Vector<N>
export function vec<N extends number>(
  ...items: [number[] & { length: N }] | (number[] & { length: N })
) {
  // : (Vector<N> & FixedArray<N>) | Vector<N>
  return new Vector<N>(...(items as number[])) // as Vector<N> & FixedArray<N>
}
