import { defaultGeometricOptions, GeometricOptions, Geometry } from './Geometry'
import { vec, Vector } from '../Vector'

export const defaultPathOptions = {
  ...defaultGeometricOptions,
  smooth: true,
}

export interface PathOptions extends GeometricOptions {
  smooth: boolean
}

export class Path extends Geometry<PathOptions> {
  points: Vector<2>[] = []

  constructor(options?: PathOptions) {
    super()
    this.options = { ...defaultPathOptions, ...options }
  }

  _svg(): SVGCircleElement {
    const element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle',
    )
    super._applySvgOptions(element)
    element.setAttribute('d', this.svgPath())

    return element
  }

  _canvas(ctx: CanvasRenderingContext2D) {
    const path = new Path2D(this.svgPath())
    ctx.beginPath()
    this._applyCanvasOptions(ctx, path)
  }

  private getControlPoints(
    p0: Vector<2>,
    p1: Vector<2>,
    p2: Vector<2>,
    tension = 0.25,
  ): [Vector<2>, Vector<2>] {
    const d01 = Math.sqrt(
      Math.pow(p1[0] - p0[0], 2) + Math.pow(p1[1] - p0[1], 2),
    )
    const d12 = Math.sqrt(
      Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2),
    )

    const fa = (tension * d01) / (d01 + d12)
    const fb = (tension * d12) / (d01 + d12)

    const c1x = p1[0] - fa * (p2[0] - p0[0])
    const c1y = p1[1] - fa * (p2[1] - p0[1])
    const c2x = p1[0] + fb * (p2[0] - p0[0])
    const c2y = p1[1] + fb * (p2[1] - p0[1])

    return [vec(c1x, c1y), vec(c2x, c2y)]
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

    // https://stackoverflow.com/questions/22556381/approximating-data-with-a-multi-segment-cubic-bezier-curve-and-a-distance-as-wel/22582447#22582447
    // https://github.com/paperjs/paper.js/blob/92775f5279c05fb7f0a743e9e7fa02cd40ec1e70/src/path/Segment.js#L428
    // https://www.particleincell.com/2012/bezier-splines/
    // https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline
    for (let i = 1; i < this.points.length - 1; i++) {
      const [c1, c2] = this.getControlPoints(
        this.points[i - 1],
        this.points[i],
        this.points[i + 1],
      )
      console.log(c1, c2)
      path += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${this.points[i][0]},${this.points[i][1]}`
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

function calculateBezierControlPoints() {}
