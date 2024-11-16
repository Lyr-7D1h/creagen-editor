import { Color } from '../color'

export const defaultGeometricOptions = {
  fill: 'none',
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
export class Geometry {
  applySvgGeometricOptions(element: SVGElement, opts: GeometricOptions) {
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
  svg(): SVGElement {
    return document.createElementNS('http://www.w3.org/2000/svg', 'path')
  }

  canvas(_ctx: CanvasRenderingContext2D): void {}
}
