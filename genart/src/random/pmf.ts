import { CDF } from './cdf'

/** https://en.wikipedia.org/wiki/Probability_mass_function */
export class PMF {
  p: number[]

  /** create pmf from non normalized list of numbers */
  static fromWeights(values: number[]) {
    const sum = values.reduce((partialSum, a) => partialSum + a, 0)
    const f = values.map((v) => v / sum)
    return new PMF(f)
  }

  /** create pmf from normalized list (all numbers add to 1)  */
  constructor(p: number[]) {
    this.p = p
  }

  [Symbol.iterator]() {
    return this.p[Symbol.iterator]()
  }

  cdf() {
    return CDF.fromPMF(this)
  }
}
