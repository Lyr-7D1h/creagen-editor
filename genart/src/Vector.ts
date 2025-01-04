import * as Math from './math'

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

export type FixedArray<T, N extends number> = GrowToSize<T, N, [], 0>

/** The bounds for a given N dimensional vector [[xmin, xmax], [ymin, ymax]] */
export type Bounds<N extends number> = FixedArray<[number, number], N>

export class Vector<N extends number> extends Array<number> {
  private constructor(...items: [number[] & { length: N }])
  private constructor(...items: number[] & { length: N })
  private constructor(...items: number[])
  private constructor(
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

  static create<N extends number>(
    ...items: [number[] & { length: N }] | (number[] & { length: N })
  ) {
    return new Vector<N>(...(items as number[]))
  }

  override get length(): N {
    return super.length as N
  }

  get x(): number {
    return this[0]!
  }

  set x(v: number) {
    this[0] = v
  }

  get y(): Y<N> {
    return this[1] as Y<N>
  }

  set y(v: number) {
    this[1] = v
  }

  get z(): Z<N> {
    return this[2] as Z<N>
  }

  set z(v: number) {
    this[1] = v
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

  /** Squared euclidean distance to another vector */
  dist2(v: Vector<N>) {
    let dist = 0
    for (let i = 0; i < this.length; i++) {
      dist += (this[i]! - v[i]!) ** 2
    }
    return dist
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
      this[i] = Math.roundToDec(this[i]!, dec)
    }
    return this
  }

  /** Linear interpolation towards `target` in steps of `alpha`% */
  lerp(target: Vector<N>, alpha: number) {
    for (let i = 0; i < this.length; i++) {
      this[i] = (1 - alpha) * this[i]! + alpha * target[i]!
    }
    return this
  }

  /** Compare two vectors for equality */
  equals(v: Vector<N>) {
    for (let i = 0; i < this.length; i++) {
      if (this[i]! !== v[i]!) {
        return false
      }
    }
    return true
  }

  dot(v: Vector<N>) {
    let a = 0
    for (let i = 0; i < this.length; i++) {
      a += this[i]! * v[i]!
    }
    return a
  }

  /** Apply modulo to each value */
  mod(mod: number) {
    for (let i = 0; i < this.length; i++) {
      this[i] %= mod
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

  div(s: number) {
    for (let i = 0; i < this.length; i++) {
      this[i] /= s
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
  mag(): number {
    return Math.sqrt(this.mag2())
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

  /** Check if a number is within `limits` */
  within(limits: FixedArray<[number, number], N>): boolean {
    for (let i = 0; i < this.length; i++) {
      const [start, stop] = (limits as any)[i] as [number, number]
      if (this[i]! < start || this[i]! > stop) {
        return false
      }
    }
    return true
  }

  /** if a number is above or below a limit it correct it so it is within the boundary limits */
  wrapAround(bounds: Bounds<N>) {
    for (let i = 0; i < this.length; i++) {
      const [start, stop] = (bounds as any)[i] as [number, number]
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
}

export interface Vector<N extends number> {
  create(...items: [number[] & { length: N }]): Vector<N>
  create(...items: number[] & { length: N }): Vector<N>
  create(...items: number[]): Vector<N>
  create(...items: [number[] & { length: N }]): Vector<N>
}

/** Short hand for `Vector.create()` */
export function vec<N extends number>(
  ...items: [number[] & { length: N }]
): Vector<N>
export function vec<N extends number>(
  ...items: [...number[]] & { length: N }
): Vector<N>
export function vec<N extends number>(...items: [...number[]]): Vector<N>
export function vec<N extends number>(
  ...items: [number[] & { length: N }] | (number[] & { length: N })
): Vector<N> {
  return Vector.create<N>(...(items as any))
}
