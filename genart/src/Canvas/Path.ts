import { defaultGeometricOptions, GeometricOptions, Geometry } from './Geometry'
import { vec, Vector } from '../Vector'

function toSvgPathData(points: Vector<2>[]) {}

enum PathCommand {
  MoveTo = 'M',
  LineTo = 'L',
  CurveTo = 'C',
  Close = 'Z',
}

export class Path extends Geometry {
  commands: PathCommand[] = []
  opts: GeometricOptions = defaultGeometricOptions

  constructor(options: GeometricOptions = {}) {
    super()
    this.opts = options
  }

  lineTo(x: number | Vector<2>, y?: number) {
    if (Array.isArray(x)) {
      this.points.push(x)
      return
    }
    this.points.push(vec(x, y))
  }

  override svg(): SVGCircleElement {
    const element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle',
    )
    element.setAttribute('r', this.radius.toString())
    element.setAttribute('cx', this.x.toString())
    element.setAttribute('cy', this.y.toString())
    this.applySvgGeometricOptions(element, this.opts)

    return element
  }

  override canvas(ctx: CanvasRenderingContext2D) {
    const p = new Path2D('M10 10 h 80 v 80 h -80 Z')
    if (this.opts.fill) {
      ctx.fillStyle = this.opts.fill.hex()
      ctx.fill()
    } else {
      ctx.stroke()
    }
  }
}
