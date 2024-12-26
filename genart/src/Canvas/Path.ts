import { defaultGeometricOptions, GeometricOptions, Geometry } from './Geometry'
import { vec, Vector } from '../Vector'
import { solveTriadiagonalMatrix } from '../lin'

export const defaultPathOptions: PathOptions = {
  ...defaultGeometricOptions,
  fill: null,
  smooth: true,
  closed: false,
}

export interface PathOptions extends GeometricOptions {
  /** Connect a curve (bezier spline) through all the given points */
  smooth?: boolean
  /** Connect the first point with the last point */
  closed?: boolean
}

export class Path extends Geometry<PathOptions> {
  points: Vector<2>[] = []

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
  // Closed loop: https://www.jacos.nl/jacos_html/spline/circular/index.html
  // https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline
  /** Calculate the control point coordinates for a given `index` */
  private computeControlPoints(index: number) {
    // all the knots
    const K = this.points
    const n = this.points.length - 1
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

  private svgPath() {
    if (this.points.length === 1) return ''
    if (!this.options.smooth || this.points.length === 2) {
      return this.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`)
        .join(' ')
    }
    if (this.points.length < 3) {
      throw Error('Need atleast 3 points to create a smooth path')
    }

    let path = `M${this.points[0][0]} ${this.points[0][1]}`

    const [p1x, p2x] = this.computeControlPoints(0)
    const [p1y, p2y] = this.computeControlPoints(1)
    for (let i = 0; i < p1x.length; i++) {
      path += `C${p1x[i]} ${p1y[i]}, ${p2x[i]} ${p2y[i]}, ${this.points[i + 1][0]} ${this.points[i + 1][1]}`
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
  }

  lineTo(x: number | Vector<2>, y?: number) {
    if (Array.isArray(x)) {
      this.points.push(x)
      return
    }
    this.points.push(vec(x, y))
  }
}
