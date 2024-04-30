export * from './simplex'
export * from './perlin'
export * from './numgen'

/**
 * A random() function, must return a number in the interval [0,1), just like Math.random().
 */
export type RandomFn = () => number
