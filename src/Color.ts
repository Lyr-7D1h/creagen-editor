import { CREAGEN_ASSERTS } from './constants'
import { Bounds, Vector } from './Vector'

export class Color extends Vector<4> {
  static fromHex(hex: string) {
    const v = hex
      .replace(
        /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
        (_, r, g, b) => '#' + r + r + g + g + b + b,
      )
      .substring(1)
      .match(/.{2}/g)!
      .map((x) => parseInt(x, 16))

    return new Color(v)
  }

  static get BLACK() {
    return new Color(0, 0, 0)
  }

  static get RED() {
    return new Color(255, 0, 0)
  }

  static get GREEN() {
    return new Color(0, 255, 0)
  }

  static get BLUE() {
    return new Color(0, 0, 255)
  }

  /** Check if a number is within `limits` */
  override within(bounds: Bounds<4> | []): boolean {
    for (let i = 0; i < this.length; i++) {
      const [start, stop] = (bounds as any)[i] as [number, number]
      if (this[i]! < start || this[i]! > stop) {
        return false
      }
    }
    return true
  }

  /** if a number is above or below a limit it correct it so it is within the boundary limits */
  // added empty array union to `bounds` due to typescript bug
  override wrapAround(bounds: Bounds<4> | []) {
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

  static override create(r: number, g: number, b: number, a?: number): Color
  static override create(color: number[] | Uint8ClampedArray): Color
  static override create(
    r: number | number[] | Uint8ClampedArray,
    g?: number,
    b?: number,
    a?: number,
  ): Color {
    return new Color(r, g, b, a)
  }

  // constructor(r: number, g: number, b: number, a?: number)
  // constructor(color: number[] | Uint8ClampedArray)
  constructor(
    r: number | number[] | Uint8ClampedArray,
    g?: number,
    b?: number,
    a?: number,
  ) {
    if (CREAGEN_ASSERTS) {
      if (
        (typeof r === 'number' && !Number.isInteger(r)) ||
        (Array.isArray(r) && !Number.isInteger(r[0]))
      )
        throw Error('has to be an integer')
      if (typeof g !== 'undefined' && !Number.isInteger(g)) {
        throw Error('has to be an integer')
      }
      if (typeof b !== 'undefined' && !Number.isInteger(b)) {
        throw Error('has to be an integer')
      }
      if (typeof g !== 'undefined' && !Number.isInteger(g)) {
        throw Error('has to be an integer')
      }
      if (typeof a !== 'undefined' && !Number.isInteger(a)) {
        throw Error('has to be an integer')
      }
    }
    let values: [number, number, number, number]
    if (r instanceof Uint8ClampedArray || Array.isArray(r)) {
      if (r.length === 3) {
        values = [...r, 255] as [number, number, number, number]
      } else if (r.length === 4) {
        values = r as [number, number, number, number]
      } else {
        throw Error(`invalid length ${r.length} for color given`)
      }
    } else {
      if (typeof g === 'undefined' || typeof b === 'undefined') {
        throw Error('Color has to have 3 or 4 elements')
      }
      values = [r, g, b, a ?? 255]
    }
    super(values)
  }

  get r() {
    return this[0]!
  }

  set r(v: number) {
    this[0] = v
  }

  get g() {
    return this[1]!
  }

  set g(v: number) {
    this[1] = v
  }

  get b() {
    return this[2]!
  }

  set b(v: number) {
    this[2] = v
  }

  get a() {
    return this[3]!
  }

  set a(v: number) {
    this[3] = v
  }

  mix(color: Color) {
    return new Color(
      (this.r + color.r) / 2,
      (this.g + color.g) / 2,
      (this.b + color.b) / 2,
      (this.a + color.a) / 2,
    )
  }

  override clone(): Color {
    return new Color(this.r, this.g, this.b)
  }

  override scale(s: number) {
    this.r *= s
    this.g *= s
    this.b *= s
    return this.normalize()
  }

  normalize() {
    this.r = Math.floor(this.r)
    this.g = Math.floor(this.g)
    this.b = Math.floor(this.b)
    return this
  }

  override add(color: Color) {
    this.r += color.r
    this.g += color.g
    this.b += color.b
    return this
  }

  gradient(color: Color, percentage: number) {
    let d = color.r - this.r
    this.r += Math.sign(d) * Math.abs(d) * percentage
    d = color.g - this.g
    this.g += Math.sign(d) * Math.abs(d) * percentage
    d = color.b - this.b
    this.b += Math.sign(d) * Math.abs(d) * percentage
    d = color.a - this.a
    this.a += Math.sign(d) * Math.abs(d) * percentage
    return this.normalize()
  }

  /** Return the relative luminance value https://en.wikipedia.org/wiki/Relative_luminance */
  luminance() {
    return 0.2126 * this.r + 0.7152 * this.g + 0.0722 * this.b
  }

  rgb() {
    return `rgb(${this.r}, ${this.g}, ${this.b})`
  }

  hex() {
    return '#' + hex(this.r) + hex(this.g) + hex(this.b)
  }

  u32() {
    return (this.r << 16) | (this.g << 8) | this.b
  }
}

export function color(
  r: number | number[] | Uint8ClampedArray,
  g?: number,
  b?: number,
  a?: number,
) {
  return new Color(r, g, b, a)
}

function hex(x: number) {
  if (x > 255 || x < 0) throw Error('rgb value must be between 0 and 255')
  const hex = Math.round(x).toString(16)
  return hex.length === 1 ? '0' + hex : hex
}
