export * as math from './math'
export * as graph from './graph'
export * as lin from './lin'
export * from './random/index'
export { SpatialMap } from './spatialmap'
export { svg } from './svg'
export { image } from './image'
export { color } from './color'
// export * from './canvas'
export { canvas, Canvas } from './canvas'
export { vec, Vector } from './vec'

declare global {
  interface Window {
    genart: {
      config: {
        precision?: number
        asserts: boolean
        debug: boolean
      }
    }
  }
}

window.genart = {
  config: {
    asserts: false,
    debug: false,
  },
}
