import { defaultGeometricOptions, GeometricOptions, Geometry } from './Geometry'
import { vec, Vector } from '../Vector'

enum PathCommand {
  MoveTo = 'M',
  LineTo = 'L',
  CurveTo = 'C',
  Close = 'Z',
}

export interface PathOptions extends GeometricOptions {}

export class Path extends Geometry {
  commands: PathCommand[] = []
  opts: GeometricOptions
  points: Vector<2>[] = []

  constructor(options: GeometricOptions = defaultGeometricOptions) {
    super()
    this.opts = options
  }

  add(x1: Vector<2> | number, x2?: number) {
    if (typeof x1 === 'number' && typeof x2 === 'number') {
      this.points.push(vec(x1, x2))
    }
    if (Array.isArray(x1)) {
      this.points.push(x1)
    }
  }

  lineTo(x: number | Vector<2>, y?: number) {
    if (Array.isArray(x)) {
      this.points.push(x)
      return
    }
    this.points.push(vec(x, y))
  }

  svg(): SVGCircleElement {
    const element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle',
    )
    super.applySvgOptions(element, this.opts)

    return element
  }

  canvas(ctx: CanvasRenderingContext2D) {
    const p = new Path2D('M10 10 h 80 v 80 h -80 Z')
    if (this.opts.fill) {
      ctx.fillStyle = this.opts.fill.hex()
      ctx.fill()
    } else {
      ctx.stroke()
    }
  }
}
