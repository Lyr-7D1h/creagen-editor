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
// type Data<T = any> = T extends number
//   ? GenericArray<T> | T[] | TypedArray
//   : T extends bigint
//     ? GenericArray<T> | T[] | MaybeBigInt64Array | MaybeBigUint64Array

//     : GenericArray<T> | T[]
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
export type Data = NDArray<Data> | TypedArray | number[] | Data[]

function isTypedArray(value: Data): value is TypedArray {
  return (
    value instanceof Int8Array ||
    value instanceof Int16Array ||
    value instanceof Int32Array ||
    value instanceof Uint8Array ||
    value instanceof Uint16Array ||
    value instanceof Uint32Array ||
    value instanceof Float32Array ||
    value instanceof Float64Array
  )
}

function getShape(data: Data): number[] {
  const shape = []
  let row: Data | undefined = data
  while (typeof row !== 'undefined') {
    if (typeof row[0] === 'number') {
      shape.push(row.length)
      break
    } else if ('length' in row) {
      shape.push(row.length)
      row = row[0]
    } else {
      break
    }
  }
  return shape
}

// wrapper around any array type for llnear algebra functionality
// https://github.com/scijs/ndarray
// http://victorjs.org/
// https://github.com/nicolaspanel/numjs/blob/master/src/ndarray.js
// https://www.npmjs.com/package/@stdlib/ndarray
/**
 * N Dimensional Array - a wrapper around Array<number> and TypedArrays
 */
export class NDArray<I extends Data> {
  private readonly _data: I
  private readonly _shape: number[]

  constructor(data: I) {
    this._shape = getShape(data)
    this._data = data

    // const proxy = new Proxy(this, {
    //   get(target, prop) {
    //     if (typeof prop === 'symbol') {
    //       return target[prop as any]
    //     }
    //     const n = Number(prop)
    //     if (typeof n === 'number' && !(prop in target)) {
    //       return target.get(n)
    //     }
    //     return target[prop as any]
    //   },
    // })
    // return proxy
  }

  [index: number]: number

  /** Synonym to get */
  at(...index: number[]): number {
    return this.get(...index)
  }

  get(...index: number[]): number {
    if (index.length > this._shape.length) {
      throw Error('invalid coordinates given')
    }
    let r: any = this._data
    for (const i of index) {
      r = r.at(i) // using at to support both Arrays and NDArrays
    }
    if (typeof r !== 'number') throw Error('invalid index given')
    return r
  }

  set(x: number, value: number): void
  set(...index: number[]) {
    if (index.length - 1 > this._shape.length) {
      throw Error('invalid coordinates given')
    }
    let r: any = this._data
    for (const i of index) {
      r = r[i]!
    }
    if (typeof r !== 'number') throw Error('invalid index given')
    r = index[index.length - 1]
  }

  get length() {
    return this.count()
  }

  data(): I {
    return this._data
  }

  [Symbol.iterator]() {
    let index = -1
    const data = this._data

    return {
      next: () => ({ value: data[++index]!, done: !(index in data) }),
    }
  }

  slice(start?: number, end?: number): NDArray<I>
  slice(start?: number, end?: number): NDArray<I> {
    if (isTypedArray(this._data)) {
      return ndarray(this._data.subarray(start, end)) as NDArray<I>
    }
    return ndarray(this._data.slice(start, end)) as NDArray<I>
  }

  all(): Iterator<I> {
    return {
      array: this,
      [Symbol.iterator]() {
        const index: number[] = new Array(this.array._shape.length).fill(0)
        const last = index.length - 1
        index[last] = -1

        return {
          next: () => {
            index[last]++
            if (index[last]! >= this.array._shape[last]!) {
              // if 1d then stop
              if (index.length === 1) return { value: 0, done: true }

              // if more than 1d then reduce a lower index and reset last index
              index[last] = 0
              let i = 1
              index[last - i]++
              // keep resetting and lowering indexes until the lowest index is too big
              while (index[last - i]! >= this.array._shape[last - i]!) {
                if (last - i === 0) return { value: 0, done: true }
                index[last - i] = 0
                i++
                index[last - i]++
              }
            }
            return {
              value: this.array.get(...index),
              done: false,
            }
          },
        }
      },
    }
  }

  /** Get the dimensions of this array */
  shape() {
    return this._shape
  }

  // add(b: NDArray) {
  //   if (this.dim() !== b.dim()) {
  //     throw Error('can only add arrays with same length')
  //   }
  //   for (let i = 0; i < this.dim(); i++) {
  //     this[i] += b[i]!
  //   }
  // }

  // /** Multiply by scalar or number */
  // mul(b: NDArray): NDArray
  // mul(scalar: number): NDArray
  // mul(b: NDArray | number) {
  //   if (typeof b === 'number') {
  //     for (let i = 0; i < this.dim(); i++) {
  //       this[i] *= b
  //     }
  //     return this
  //   }

  //   if (this.dim() !== b.dim()) {
  //     throw Error('can only add arrays with same length')
  //   }
  //   for (let i = 0; i < this.dim(); i++) {
  //     this[i] *= b[i]!
  //   }
  //   return this
  // }

  /** Get the total number of numbers in the array */
  count() {
    return this._shape.reduce((a, v) => a * v, 1)
  }

  /** Take the average of all the values */
  average() {
    let sum = 0
    for (const v of this.all()) {
      sum += v
    }
    return sum / this.count()
  }

  /** Calculate the average difference from the average */
  spread() {
    const average = this.average()
    let spread = 0
    for (const v of this.all()) {
      spread += Math.pow(v - average, 2)
    }

    return Math.sqrt(spread / this.count())
  }

  /** Normalize array */
  // norm() {
  //   let normalizer = 0
  //   for (const v of this.data) {
  //     normalizer += Math.pow(v, 2)
  //   }

  //   normalizer = Math.sqrt(normalizer)

  //   if (normalizer === 0) return this

  //   for (let i = 0; i < this.dim(); i++) {
  //     this[i] /= normalizer
  //   }
  //   return this
  // }

  max() {
    let max
    for (const v of this.all()) {
      if (typeof max === 'undefined') max = v
      if (v > max) {
        max = v
      }
    }
    return max
  }

  min() {
    let min
    for (const v of this.all()) {
      if (typeof min === 'undefined') min = v
      if (v < min) {
        min = v
      }
    }
    return min
  }
}

export function ndarray<I extends Data>(data: I): NDArray<I> {
  return new NDArray(data)
}

export interface Iterator<I extends Data> {
  array: NDArray<I>
  [Symbol.iterator]: () => {
    next: () => {
      value: number
      done: boolean
    }
  }
}
