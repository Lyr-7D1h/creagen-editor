import * as Math from '../math'
import { defaultGeometricOptions, GeometricOptions, Geometry } from './Geometry'
import { Bounds, FixedArray, vec, Vector } from '../Vector'
import { solveTriadiagonalMatrix } from '../lin'

export const defaultPathOptions: PathOptions = {
  ...defaultGeometricOptions,
  fill: null,
  smooth: false,
  closed: false,
  wrapAround: null,
}

export interface PathOptions extends GeometricOptions {
  /** Connect a curve (bezier spline) through all the given points */
  smooth?: boolean
  /** Connect the first point with the last point */
  closed?: boolean
  /** Wrap the path around a certain bound */
  wrapAround?: Bounds<2> | null
}

export class Path extends Geometry<PathOptions> {
  private points: Vector<2>[] = []

  constructor(options?: PathOptions) {
    super()
    this.options = { ...defaultPathOptions, ...options }
  }

  _svg(): SVGPathElement {
    const element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    )
    super._applySvgOptions(element)
    element.setAttribute('d', this.svgPath())

    return element
  }

  _canvas(ctx: CanvasRenderingContext2D) {
    const path = new Path2D(this.svgPath())
    ctx.beginPath()
    this._applyCanvasOptions(ctx, path)
    ctx.closePath()
  }

  // https://stackoverflow.com/questions/22556381/approximating-data-with-a-multi-segment-cubic-bezier-curve-and-a-distance-as-wel/22582447#22582447
  // https://github.com/paperjs/paper.js/blob/92775f5279c05fb7f0a743e9e7fa02cd40ec1e70/src/path/Segment.js#L428
  // https://www.particleincell.com/2012/bezier-splines/
  // Closed loop: https://www.jacos.nl/jacos_html/spline/circular/index.html, https://www.jacos.nl/jacos_html/spline/theory/theory_1.html
  // https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline
  /** Calculate the control point coordinates for a given `index` */
  private computeControlPoints(points: Vector<2>[], index: number) {
    // all the knots
    const K = points
    const n = points.length - 1
    // stores all equations
    // [P_(1,i-1), P_(1,i), P_(1,i+1)]
    const A = Array.from(
      Array(n),
      () => new Array(3) as [number, number, number],
    )
    // right hand side of all equations
    const b = new Array(n)

    // First segment equation
    // 2 * P_(1,0) + P_(1,1) = K_0 + 2 * K_1
    //
    // In array form:
    // [0, 2 * P_(1,0), P_(1,1), K_0 + 2 * K_1]
    A[0][0] = 0
    A[0][1] = 2
    A[0][2] = 1
    b[0] = K[0][index] + 2 * K[1][index]

    // Interal segments
    for (let i = 1; i < n - 1; i++) {
      A[i][0] = 1
      A[i][1] = 4
      A[i][2] = 1
      b[i] = 4 * K[i][index] + 2 * K[i + 1][index]
    }

    A[n - 1][0] = 2
    A[n - 1][1] = 7
    A[n - 1][2] = 0
    b[n - 1] = 8 * K[n - 1][index] + K[n][index]

    const p1 = solveTriadiagonalMatrix(A, b)
    const p2 = new Array(n)
    for (let i = 0; i < n - 1; i++) {
      p2[i] = 2 * K[i + 1][index] - p1[i + 1]
    }

    p2[n - 1] = 0.5 * (K[n][index] + p1[n - 1])

    return [p1, p2]
  }

  /** Get direction of where x,y is out of bounds compared to the boxed bounds. Returns null if inside bounds */
  private outsideBoundDirection(
    { x, y }: Vector<2>,
    bounds: FixedArray<[number, number], 2>,
  ) {
    const [xmin, xmax] = bounds[0]
    const [ymin, ymax] = bounds[1]
    const direction = vec(0, 0)
    if (x < xmin) {
      direction.x = -1
    } else if (x > xmax) {
      direction.x = 1
    }
    if (y < ymin) {
      direction.y = -1
    } else if (y > ymax) {
      direction.y = 1
    }
    if (direction.x === 0 && direction.y === 0) return null
    return direction
  }

  private wrapAroundPoints(
    points: Vector<2>[],
    bounds: FixedArray<[number, number], 2>,
  ): Vector<2>[][] {
    let segments = []
    const [xmin, xmax] = bounds[0]
    const [ymin, ymax] = bounds[1]
    const width = xmax - xmin
    const height = ymax - ymin

    // const [ymin, ymax] = bounds[1]
    let queue = [...points.map((p) => p.clone())]
    for (let i = 0; i < queue.length - 1; i++) {
      // what direction is the first point outside of bounds
      let d1 = this.outsideBoundDirection(queue[i], bounds)
      // what direction is the second point outside of bounds
      let d2 = this.outsideBoundDirection(queue[i + 1], bounds)
      // if both inside of bounds skip
      if (d1 === null && d2 === null) continue
      // if both outside skip
      if (d1 !== null && d2 !== null) continue

      // always one point out of bounds
      const d = d1 || d2
      // if left use xmin as limit otherwise xmax
      const xm = d.x < 0 ? xmin : xmax
      // if above use ymin as limit otherwise ymax
      const ym = d.y < 0 ? ymin : ymax

      let [x1, y1] = queue[i]
      let [x2, y2] = queue[i + 1]

      // swap points to keep x1 < x2
      let a
      if (x1 > x2) {
        a = (y1 - y2) / (x1 - x2)
      } else {
        a = (y2 - y1) / (x2 - x1)
      }

      // if diagonal
      if (d.x !== 0 && d.y !== 0) {
        // distance in x from outside point to xm boundry
        const dx1 = Math.abs(xm - x1)
        // distance in x from outside point to ym boundry
        const dx2 = Math.abs(ym - y1) / Math.abs(a)

        if (dx1 < dx2) {
          // xm boundry is closer
          d.y = 0
        } else if (dx1 > dx2) {
          // ym boundry is closer
          d.x = 0
        }
      }

      let ix
      // if y is within bounds or it is diagonal bounds with x being closer it should limit the intersection point to the boundry
      if (d.y === 0) {
        ix = xm
      } else {
        ix = x1 + (ym - y1) / a
      }
      let iy
      if (d.x === 0) {
        iy = ym
      } else {
        iy = y1 + a * (xm - x1)
      }

      let intersection = vec(ix, iy)

      let outsideSegment
      if (d1 === null) {
        // starting points are inside
        outsideSegment = [
          intersection,
          ...queue.splice(i + 1, queue.length - i + 2, intersection),
        ]
      } else {
        // starting points are outside
        outsideSegment = queue.splice(0, i + 1, intersection)
        outsideSegment.push(intersection)
        i = -1
      }

      // if intersection and next point are the same, remove the intersection
      // if (intersection.equals(queue[1])) queue.shift()

      const outsideSegments = this.wrapAroundPoints(outsideSegment, [
        [xmin + d.x * width, xmax + d.x * width],
        [ymin + d.y * width, ymax + d.y * width],
      ])

      for (const s of outsideSegments) {
        for (const p of s) {
          p.x += d.x * -1 * width
          p.y += d.y * -1 * height
        }
      }

      segments = segments.concat(outsideSegments)
      continue
    }

    if (queue.length > 0) {
      const d = this.outsideBoundDirection(queue[0], bounds)

      if (d !== null) {
        //  if whole queue is outside bounds, wrap around on first point
        const outsideSegments = this.wrapAroundPoints(queue, [
          [xmin + d.x * width, xmax + d.x * width],
          [ymin + d.y * width, ymax + d.y * width],
        ])
        for (const s of outsideSegments) {
          for (const p of s) {
            p.x += d.x * -1 * width
            p.y += d.y * -1 * height
          }
        }
        segments = segments.concat(outsideSegments)
      } else {
        segments.push(queue)
      }
    }
    return segments
  }

  private svgPath() {
    if (this.points.length === 1) return ''

    let segments = [this.points]
    if (this.options.wrapAround) {
      segments = this.wrapAroundPoints(
        this.points,
        this.options.wrapAround,
      ).filter((s) => s.length > 1)
    }

    if (this.options.smooth) {
      // TODO: fix in case of wrap around
      let path = ''
      for (const segment of segments) {
        if (segment.length < 3) {
          throw Error('Need atleast 3 points to create a smooth path')
        }

        path += `M${this.points[0][0]} ${this.points[0][1]}`

        const [p1x, p2x] = this.computeControlPoints(segment, 0)
        const [p1y, p2y] = this.computeControlPoints(segment, 1)
        for (let i = 0; i < p1x.length; i++) {
          path += `C${p1x[i]} ${p1y[i]}, ${p2x[i]} ${p2y[i]}, ${this.points[i + 1][0]} ${this.points[i + 1][1]}`
        }
      }
      return path
    }

    let path = ''
    for (const segment of segments) {
      if (segment.length < 2) continue

      // add to path
      path += segment
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`)
        .join(' ')
      continue
    }
    return path
  }

  add(points: Vector<2>[])
  add(v: Vector<2>)
  add(x: number, y: number)
  add(x1: Vector<2> | Vector<2>[] | number, x2?: number) {
    if (typeof x1 === 'number' && typeof x2 === 'number') {
      this.points.push(vec(x1, x2))
    }
    if (Array.isArray(x1)) {
      if (Array.isArray(x1[0])) {
        this.points = this.points.concat(x1)
      } else {
        this.points.push(x1 as Vector<2>)
      }
    }
    return this
  }
}
