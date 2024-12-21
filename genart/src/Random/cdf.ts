import { Math } from '..'
import { GENART_ASSERTS } from '../constants'
import { type PMF } from './pmf'

/** https://en.wikipedia.org/wiki/Cumulative_distribution_function */
export class CDF {
  p: number[]
  f: number[]

  static fromPMF(pmf: PMF) {
    return new CDF(pmf.p)
  }

  static uniform(length: number) {
    const p: number[] = new Array(length).fill(Math.roundToDec(1 / length))

    return new CDF(p)
  }

  /** Create a cdf from non normalized list of numbers */
  static fromWeights(values: number[]) {
    const sum = values.reduce((partialSum, a) => {
      if (a < 0) throw Error("can't give negative values to cdf")
      return partialSum + a
    }, 0)
    const p = values.map((v) => Math.roundToDec(v / sum))
    return new CDF(p)
  }

  /** create cdf from probabilities going up from 0 to 1 */
  constructor(p: number[]) {
    this.p = p
    this.f = this.fromProbabilities(p)
  }

  /** from a list of numbers that sum up to 1 */
  private fromProbabilities(p: number[]) {
    let a = 0
    const f = p.map((p) => {
      a += p
      if (a > 1) return 1
      return a
    })

    if (GENART_ASSERTS) {
      const sum = p.reduce((a, b) => a + b)
      console.assert(sum === 1, sum)
    }

    // account for floating point errors
    f[f.length - 1] = 1

    return f
  }

  [Symbol.iterator]() {
    return this.f[Symbol.iterator]()
  }

  clone() {
    return new CDF([...this.p])
  }

  updateWeight(index: number, p: number) {
    this.p[index] = p
    const cdf = CDF.fromWeights(this.p)
    this.f = cdf.f
    this.p = cdf.p
  }

  add(pmf: PMF): CDF
  add(cdf: CDF): CDF
  add(fun: PMF | CDF) {
    const p = fun.p

    // update probabilities
    for (let i = 0; i < this.p.length; i++) {
      this.p[i] = Math.roundToDec((this.p[i]! + p[i]!) / 2)
    }

    // update cdf
    this.f = this.fromProbabilities(this.p)
    return this
  }

  /** draw a random number from pmf */
  draw() {
    const r = Math.random()
    return this.f.findIndex((p) => r < p)
  }
}
