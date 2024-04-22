export * from './simplex'
export * from './numgen'
export * from './perlin'

/**
 * A random() function, must return a number in the interval [0,1), just like Math.random().
 */
export type RandomFn = () => number
