export type Data = TypedArray | number[]
// wrapper around any array type to make it more user friendly
// https://github.com/scijs/ndarray
// http://victorjs.org/
/** N Dimensional Array */
class NArray {
  data: Data
  constructor(data: Data) {
    this.data = data

    const proxy = new Proxy(this, {
      get(target, prop) {
        if (typeof prop === 'symbol') {
          return target[prop]
        }
        if (typeof Number(prop) === 'number' && !(prop in target)) {
          return target.get(prop)
        }
        return target[prop]
      },
    })
    return proxy
  }

  [index: number]: number

  private get(index: any) {
    return this.data[index]
  }

  [Symbol.iterator]() {
    let index = -1
    const data = this.data

    return {
      next: () => ({ value: data[++index], done: !(index in data) }),
    }
  }

  /** Get the dimensions of this array */
  dim() {
    return this.data.length
  }

  add(b: NArray) {
    if (this.dim() !== b.dim()) {
      throw Error('can only add arrays with same length')
    }
    for (let i = 0; i < this.dim(); i++) {
      this[i] += b[i]!
    }
  }

  /** Multiply by scalar or number */
  mul(b: NArray): NArray
  mul(scalar: number): NArray
  mul(b: NArray | number) {
    if (typeof b === 'number') {
      for (let i = 0; i < this.dim(); i++) {
        this[i] *= b
      }
      return this
    }

    if (this.dim() !== b.dim()) {
      throw Error('can only add arrays with same length')
    }
    for (let i = 0; i < this.dim(); i++) {
      this[i] *= b[i]!
    }
    return this
  }

  /** Take the average of all the values */
  average() {
    let sum = 0
    for (const v of this) {
      sum += v!
    }
    return sum / this.dim()
  }

  /** Calculate the average difference from the average */
  spread() {
    const average = this.average()
    let spread = 0
    for (const v of this) {
      spread += Math.pow(v! - average, 2)
    }

    return Math.sqrt(spread / (this.dim() * average))
  }

  /** Normalize array */
  norm() {
    let normalizer = 0
    for (const v of this.data) {
      normalizer += Math.pow(v, 2)
    }

    normalizer = Math.sqrt(normalizer)

    if (normalizer === 0) return this

    for (let i = 0; i < this.dim(); i++) {
      this[i] /= normalizer
    }
    return this
  }

  max() {
    let max = this[0]
    if (typeof max === 'undefined') return undefined
    for (let i = 2; i < this.dim(); i++) {
      if (this[i]! > max) {
        max = this[i]!
      }
    }
    return max
  }

  min() {
    let min = this[0]
    if (typeof min === 'undefined') return undefined
    for (let i = 2; i < this.dim(); i++) {
      if (this[i]! < min) {
        min = this[i]!
      }
    }
    return min
  }
}

// interface GenericArray<T> {
//   get: (idx: number) => T
//   set: (idx: number, value: T) => void
//   length: number
// }
// type MaybeBigInt64Array = InstanceType<
//   typeof globalThis extends { BigInt64Array: infer T } ? T : never
// >
// type MaybeBigUint64Array = InstanceType<
//   typeof globalThis extends { BigUint64Array: infer T } ? T : never
// >
type TypedArray =
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array
  | Float32Array
  | Float64Array
// type Data<T = any> = T extends number
//   ? GenericArray<T> | T[] | TypedArray
//   : T extends bigint
//     ? GenericArray<T> | T[] | MaybeBigInt64Array | MaybeBigUint64Array
//     : GenericArray<T> | T[]
export function narray(data: Data) {
  return new NArray(data)
}
