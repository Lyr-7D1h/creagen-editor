import { defaultGeometricOptions, GeometricOptions, Geometry } from './Geometry'
import { Vector } from '../Vector'

export class Circle extends Geometry {
  x: number
  y: number
  radius: number

  constructor(position: Vector<2>, radius: number, options?: GeometricOptions)
  constructor(x: number, y: number, radius: number, options?: GeometricOptions)
  constructor(
    x: number | Vector<2>,
    y: number,
    radius: number | GeometricOptions,
    options?: GeometricOptions,
  )
  constructor(
    x: number | Vector<2>,
    y: number,
    radius?: number | GeometricOptions,
    options?: GeometricOptions,
  ) {
    super()
    if (typeof x !== 'number' && typeof radius !== 'number') {
      this.x = x.x
      this.y = x.y
      this.radius = y
      this.options =
        typeof radius === 'undefined'
          ? defaultGeometricOptions
          : { ...defaultGeometricOptions, ...radius }
    } else {
      this.x = x as number
      this.y = y
      this.radius = radius as number
      this.options = { ...defaultGeometricOptions, ...options }
    }
  }

  override _svg(): SVGCircleElement {
    const element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle',
    )
    element.setAttribute('r', this.radius.toString())
    element.setAttribute('cx', this.x.toString())
    element.setAttribute('cy', this.y.toString())
    super._applySvgOptions(element)

    return element
  }

  override _canvas(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI)
    this._applyCanvasOptions(ctx)
    ctx.closePath()
  }
}
