import { Color } from '../Color'

export const defaultGeometricOptions: GeometricOptions = {
  fill: null,
  fillOpacity: 1,
  stroke: Color.BLACK,
  strokeWidth: 1,
}
export interface GeometricOptions {
  fill?: Color | null
  fillOpacity?: number
  stroke?: Color
  strokeWidth?: number
}

export abstract class Geometry<
  Opts extends GeometricOptions = GeometricOptions,
> {
  options: Opts

  _applySvgOptions(element: SVGElement) {
    element.setAttribute('stroke', this.options.stroke.hex() ?? 'black')
    element.setAttribute(
      'fill',
      this.options.fill === null ? 'none' : this.options.fill.hex(),
    )
    element.setAttribute('fill-opacity', this.options.fillOpacity.toString())
    element.setAttribute('stroke-width', this.options.strokeWidth.toString())
  }

  // TODO: make implementation detail
  abstract _svg(): SVGElement

  _applyCanvasOptions(ctx: CanvasRenderingContext2D, path?: Path2D) {
    ctx.lineWidth = this.options.strokeWidth
    if (this.options.fill) {
      ctx.fillStyle = this.options.fill.hex()
      ctx.fill()
    } else {
      ctx.strokeStyle = this.options.stroke.hex()
      if (typeof path === 'undefined') {
        ctx.stroke()
      } else {
        ctx.stroke(path)
      }
    }
  }

  abstract _canvas(ctx: CanvasRenderingContext2D): void
}
