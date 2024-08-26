export * from './simplex'
export * from './perlin'
export * from './numgen'
export * from './pmf'
export * from './cdf'

/**
 * A random() function, must return a number in the interval [0,1), just like Math.random().
 */
export type RandomFn = () => number

export function rng(randomFn?: RandomFn) {
  return new RandomNumberGenerator(randomFn ?? Math.random)
}

export class RandomNumberGenerator {
  private readonly randomFn: RandomFn
  constructor(random: RandomFn) {
    this.randomFn = random
  }

  integer(start: number): number
  integer(start: number, stop: number): number
  integer(x1: number, x2?: number) {
    if (typeof x2 === 'undefined') {
      return Math.round(this.randomFn() * x1)
    }
    return x1 + Math.round(this.randomFn() * (x2 - x1))
  }

  random() {
    return this.randomFn()
  }
}
