export * as math from './math'
export * as graph from './graph'
export * as lin from './lin'
export * as random from './random/index'
export * as svg from './svg'
export * as image from './image'
export * as color from './color'
// export * from './canvas'
export { canvas } from './canvas'
export { vec } from './vec'

declare global {
  interface Window {
    genart: {
      config: {
        precision?: number
        asserts: boolean
      }
    }
  }
}

window.genart = {
  config: {
    asserts: false,
  },
}
