import { Color } from '../color'

export const defaultGeometricOptions: GeometricOptions = {
  fill: Color.BLACK,
  fillOpacity: 1,
  stroke: Color.BLACK,
  strokeWidth: 1,
}
export interface GeometricOptions {
  fill?: Color
  fillOpacity?: number
  stroke?: Color
  strokeWidth?: number
}
export abstract class Geometry {
  applySvgOptions(element: SVGElement, opts: GeometricOptions) {
    element.setAttribute('stroke', opts?.stroke.hex() ?? 'black')
    if (typeof opts === 'undefined') return
    if (opts.fill) element.setAttribute('fill', opts.fill.hex())
    if (opts.fillOpacity) {
      element.setAttribute('fill-opacity', opts.fillOpacity.toString())
    }
    if (opts.strokeWidth) {
      element.setAttribute('stroke-width', opts.strokeWidth.toString())
    }
  }

  // TODO: make implementation detail
  abstract svg(): SVGElement

  abstract canvas(ctx: CanvasRenderingContext2D): void
}
