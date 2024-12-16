export * as Math from './math'
export * as graph from './graph'
export * as lin from './lin'
export { Canvas } from './Canvas'
export * from './random/index'
export { SpatialMap } from './spatialmap'
export { KDTree } from './kdtree'
export { QuadTree } from './quadtree'
export { Svg } from './svg'
export { Image } from './Image'
export { Color } from './color'
export { Voronoi } from './Voronoi'
export { Motion } from './Motion'
// export * from './canvas'
export { vec, Vector } from './Vector'
export { SignalProcessing } from './SignalProcessing'

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
