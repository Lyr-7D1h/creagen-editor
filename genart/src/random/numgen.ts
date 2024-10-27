// TODO: implement same distributions https://jstat.github.io/distributions.html

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

  /** generate a random number until and including `stop` */
  integer(stop: number): number
  integer(start: number, stop: number): number
  integer(x1: number, x2?: number) {
    if (typeof x2 === 'undefined') {
      return Math.round(this.randomFn() * x1)
    }
    return x1 + Math.round(this.randomFn() * (x2 - x1))
  }

  /** Get a random number between 0 and 1 */
  random() {
    return this.randomFn()
  }
}

export function random() {
  return new RandomNumberGenerator(Math.random)
}

/** TODO: https://en.wikipedia.org/wiki/Linear_congruential_generator */
// export function lcg(): number {}

export function xorshift(seed?: number) {
  let SEED = seed ?? 2463534242
  return new RandomNumberGenerator(() => {
    SEED ^= SEED << 13
    SEED ^= SEED >> 17
    SEED ^= SEED << 5
    return (SEED >>> 0) / 4294967296
  })
}

/** https://en.wikipedia.org/wiki/Beta_distribution */
export function beta(
  alpha: number,
  beta: number,
  uniformGenerator?: () => number,
): number {
  const u = uniformGenerator ? uniformGenerator() : Math.random()
  return u ** (1 / alpha) / (u ** (1 / alpha) + (1 - u) ** (1 / beta))
}

/** Normally distributed Random Number Generator (https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform) */
export function boxMuller(
  mean: number,
  deviation: number,
  uniformGenerator?: () => number,
): RandomNumberGenerator {
  const gen = uniformGenerator ? uniformGenerator : Math.random
  const twopi = 2 * Math.PI

  return new RandomNumberGenerator(() => {
    const u1 = gen()
    const u2 = gen()

    const mag = deviation * Math.sqrt(-2.0 * Math.log(u1))
    const z0 = mag * Math.cos(twopi * u2) + mean

    return z0
  })
}

/** Usefull for generating samples from normal distributions (https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform) */
// let cache: number[] = []
// export function boxMuller(
//   mean: number,
//   deviation: number,
//   uniformGenerator: () => number,
// ): number {
//   if (cache.length === 0) {
//     cache = boxMullerGen(mean, deviation, uniformGenerator)
//   }
//   return cache.pop()!
// }
// function boxMullerGen(
//   mean: number,
//   deviation: number,
//   uniformGenerator: () => number,
// ): [number, number] {
//   let u1 = uniformGenerator()
//   const u2 = uniformGenerator()

//   while (u1 === 0) {
//     u1 = uniformGenerator()
//   }

//   const twopi = 2 * Math.PI
//   const mag = deviation * Math.sqrt(-2.0 * Math.log(u1))
//   const z0 = mag * Math.cos(twopi * u2) + mean
//   const z1 = mag * Math.cos(twopi * u2) + mean

//   return [z0, z1]
// }
