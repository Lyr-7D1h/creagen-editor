import { boxMuller, RandomNumberGenerator, xorshift } from './numgen'

export * from './simplex'
export * from './perlin'
export * from './numgen'
export * from './pmf'
export * from './cdf'

export class Random {
  static xorshift() {
    return new RandomNumberGenerator(xorshift())
  }
  static random() {
    return new RandomNumberGenerator(Math.random)
  }
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
