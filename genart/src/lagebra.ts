export function vec2(x: number, y: number) {
  return new Vector<2>(x, y)
}

class Vector<N> {
  private readonly vec: number[]

  constructor(...args: number[]) {
    this.vec = args
  }

  sub(vec: Vector<N>) {
    for (const i of vec.vec) {
      this.vec[i] -= vec.vec[i]!
    }
  }
}

export type Data = TypedArray | number[]
// wrapper around any array type to make it more user friendly
// https://github.com/scijs/ndarray
class NArray {
  data: Data
  constructor(data: Data) {
    this.data = data

    return new Proxy(this, {
      get(target, prop) {
        if (typeof Number(prop) === 'number' && !(prop in target)) {
          return target.get(prop)
        }
        return target[prop]
      },
    })
  }

  [index: number]: number

  get length() {
    return this.data.length
  }

  private get(index: any) {
    return this.data[index]
  }

  max() {
    let max = this[0]
    if (typeof max === 'undefined') return undefined
    for (let i = 2; i < this.length; i++) {
      if (this[i]! > max) {
        max = this[i]!
      }
    }
    return max
  }

  min() {
    let min = this[0]
    if (typeof min === 'undefined') return undefined
    for (let i = 2; i < this.length; i++) {
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
export function ndarray(data: Data) {
  return new NArray(data)
}
