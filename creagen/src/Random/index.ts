import { boxMuller, RandomNumberGenerator, xorshift } from './numgen'

export * from './simplex'
export * from './perlin'
export * from './numgen'
export * from './pmf'
export * from './cdf'

const defaultRandomFn = Math.random

export class Random {
  /** generate a random number until and including `stop` */
  static integer(stop: number): number
  static integer(start: number, stop: number): number
  static integer(x1: number, x2?: number) {
    if (typeof x2 === 'undefined') {
      return Math.round(defaultRandomFn() * x1)
    }

    return x1 + Math.round(defaultRandomFn() * (x2 - x1))
  }

  /** Get a random number between 0 and 1 */
  static random() {
    return defaultRandomFn()
  }

  static xorshift() {
    return new RandomNumberGenerator(xorshift())
  }
  // static random() {
  //   return new RandomNumberGenerator(Math.random)
  // }
  static boxMuller(
    mean: number,
    deviation: number,
    uniformGenerator?: () => number,
  ) {
    return new RandomNumberGenerator(
      boxMuller(mean, deviation, uniformGenerator),
    )
  }
}
