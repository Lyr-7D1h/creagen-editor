import { Delaunay } from 'd3-delaunay'
import { Vector } from './vec'

class Voronoi {
  delaunay: any
  voronoi: any
  constructor(
    points: [number, number][] | Vector<2>[],
    bounds: [number, number, number, number],
  ) {
    this.delaunay = Delaunay.from(points)
    this.voronoi = this.delaunay.voronoi(bounds)
  }

  /** Find the index of the cell that contains the specified point */
  find(x: number, y: number, startingIndex?: number): number {
    return this.delaunay.find(x, y, startingIndex)
  }

  /** Return the edges of polygons */
  polygons(): [number, number][][] {
    return this.voronoi.cellPolygons()
  }
}

/**
 * Get all voronoi edges for a set of points within a given bound
 * https://en.wikipedia.org/wiki/Voronoi_diagram
 */
export function voronoi(
  points: [number, number][] | Vector<2>[],
  bounds: [number, number, number, number],
): Voronoi {
  return new Voronoi(points, bounds)
}
