import { defaultGeometricOptions, GeometricOptions, Geometry } from './Geometry'
import { Vector } from '../Vector'

export const defaultRectangleOptions = {
  ...defaultGeometricOptions,
  rx: 0,
  ry: 0,
}

export interface RectangleOptions extends GeometricOptions {
  rx?: number
  ry?: number
}

export class Rectangle extends Geometry<RectangleOptions> {
  x: number
  y: number
  width: number
  height: number

  constructor(
    position: Vector<2>,
    width: number,
    height: number,
    options?: RectangleOptions,
  )
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    options?: RectangleOptions,
  )
  constructor(
    x1: Vector<2> | number,
    x2: number,
    x3: number,
    x4?: number | RectangleOptions,
    x5?: RectangleOptions,
  )
  constructor(
    x1: Vector<2> | number,
    x2: number,
    x3: number,
    x4?: number | RectangleOptions,
    x5: RectangleOptions = defaultRectangleOptions,
  ) {
    super()
    if (typeof x1 !== 'number') {
      this.x = x1.x
      this.y = x1.y
      this.width = x2
      this.height = x3
      this.options = (x4 as RectangleOptions) ?? defaultRectangleOptions
    } else {
      this.x = x1
      this.y = x2
      this.width = x3
      this.height = x4 as number
      this.options = x5 ?? defaultRectangleOptions
    }
  }

  _svg() {
    const element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect',
    )
    element.setAttribute('width', this.width.toString())
    element.setAttribute('height', this.height.toString())
    element.setAttribute('x', this.x.toString())
    element.setAttribute('y', this.y.toString())
    super._applySvgOptions(element)
    return element
  }

  _canvas(ctx: CanvasRenderingContext2D) {
    this._applyCanvasOptions(ctx)
    ctx.fillRect(this.x, this.y, this.width!, this.height)
  }
}
