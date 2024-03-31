/** TODO: https://en.wikipedia.org/wiki/Linear_congruential_generator */
// export function lcg(): number {}

let SEED = 50
export function xorshift(): number {
  SEED ^= SEED << 13
  SEED ^= SEED >> 17
  SEED ^= SEED << 5
  return SEED
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

/** Usefull for generating samples from normal distributions (https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform) */
let cache: number[] = []
export function boxMuller(
  mean: number,
  deviation: number,
  uniformGenerator: () => number,
): number {
  if (cache.length === 0) {
    cache = boxMullerGen(mean, deviation, uniformGenerator)
  }
  return cache.pop()!
}
function boxMullerGen(
  mean: number,
  deviation: number,
  uniformGenerator: () => number,
): [number, number] {
  let u1 = uniformGenerator()
  const u2 = uniformGenerator()

  while (u1 === 0) {
    u1 = uniformGenerator()
  }

  const twopi = 2 * Math.PI
  const mag = deviation * Math.sqrt(-2.0 * Math.log(u1))
  const z0 = mag * Math.cos(twopi * u2) + mean
  const z1 = mag * Math.cos(twopi * u2) + mean

  return [z0, z1]
}
