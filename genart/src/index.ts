export * as math from './math'
export * as graph from './graph'
export * as lin from './lin'
export * from './random/index'
export { SpatialMap } from './spatialmap'
export { KDTree } from './kdtree'
export { QuadTree } from './quadtree'
export { Svg } from './svg'
export { Image } from './image'
export { color } from './color'
export { Voronoi } from './Voronoi'
// export * from './canvas'
export { canvas, Canvas } from './canvas'
export { vec, Vector } from './Vector'

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
