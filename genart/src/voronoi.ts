import { Delaunay } from 'd3-delaunay'
import { vec, Vector } from './Vector'

/**
 * Get all voronoi edges for a set of points within a given bound
 * https://en.wikipedia.org/wiki/Voronoi_diagram
 */
export class Voronoi {
  delaunay: any
  voronoi: any
  points: [number, number][] | Vector<2>[]
  bounds: [number, number, number, number]

  static create(
    points: [number, number][] | Vector<2>[],
    bounds: [number, number, number, number],
  ) {
    return new Voronoi(points, bounds)
  }

  private constructor(
    points: [number, number][] | Vector<2>[],
    bounds: [number, number, number, number],
  ) {
    this.points = points
    this.bounds = bounds
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

  /** Voronoi Weighted Stippling https://www.cs.ubc.ca/labs/imager/tr/2002/secord2002b/secord.2002b.pdf */
  weightedStippling(
    value: (x, y) => number,
    interpolationStep: number,
  ): Vector<2>[] {
    const points = this.points

    // weighted centroids
    const weights = new Array(points.length).fill(0)
    const centroids: Vector<2>[] = new Array(points.length)
    for (let i = 0; i < points.length; i++) {
      centroids[i] = vec(0, 0)
    }

    const [x0, y0, x1, y1] = this.bounds
    let index = 0
    for (let x = x0; x < x1; x++) {
      for (let y = y0; y < y1; y++) {
        const luminance = value(x, y)
        const weight = 1 - luminance / 255
        index = this.find(x, y, index)
        centroids[index][0] += x * weight
        centroids[index][1] += y * weight
        weights[index] += weight
      }
    }

    for (let i = 0; i < centroids.length; i++) {
      const weight = weights[i]
      if (weight === 0) {
        centroids[i] = vec<2>(...points[i])
        continue
      }
      centroids[i].div(weight)
    }

    const res = []
    for (let i = 0; i < points.length; i++) {
      res.push(vec(points[i]).lerp(centroids[i], interpolationStep).round())
    }

    return res
  }
}

export interface Indexable {
  get(x: number, y: number): any
}
