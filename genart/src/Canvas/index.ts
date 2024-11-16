import { Vector } from '../Vector'
import { Circle } from './Circle'
import { GeometricOptions, Geometry } from './Geometry'
import { Rectangle, RectangleOptions } from './Rectangle'

export type GeometryChild = Rectangle | Circle
export interface CanvasOptions {
  width?: number
  height?: number
  renderMode?: 'canvas' | 'svg'
}

const defaultValues = {
  width: window.innerWidth,
  height: window.innerHeight,
  renderMode: 'canvas' as 'canvas' | 'svg',
  fill: 'none',
}

export class Canvas {
  children: Geometry[]
  element: HTMLCanvasElement | SVGElement
  ctx?: CanvasRenderingContext2D

  width: number
  height: number

  static create(options?: CanvasOptions) {
    return new Canvas(options)
  }

  private constructor(options?: CanvasOptions) {
    options = options ? { ...defaultValues, ...options } : defaultValues
    this.width = options.width
    this.height = options.height
    if (options.renderMode === 'svg') {
      this.element = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      )
      this.element.setAttribute('width', options.width.toString())
      this.element.setAttribute('height', options.height.toString())
    } else {
      this.element = document.createElement('canvas')
      this.element.setAttribute('width', options.width.toString())
      this.element.setAttribute('height', options.height.toString())
      this.ctx = this.element.getContext('2d')
    }
    this.children = []
  }

  clear() {
    this.element.innerHTML = ''
    this.children = []
    if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height)
  }

  circle(position: Vector<2>, radius: number, options?: GeometricOptions)
  circle(x: number, y: number, radius: number, options?: GeometricOptions)
  circle(
    x: number | Vector<2>,
    y: number,
    radius: number | GeometricOptions,
    options?: GeometricOptions,
  ) {
    const circle = new Circle(x, y, radius, options)
    this.children.push(circle)
    return circle
  }

  rect(
    position: Vector<2>,
    width: number,
    height: number,
    options?: RectangleOptions,
  ): Rectangle
  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    options?: RectangleOptions,
  ): Rectangle
  rect(
    x1: Vector<2> | number,
    x2: number,
    x3: number,
    x4?: number | RectangleOptions,
    x5?: RectangleOptions,
  ): Rectangle {
    const rect = new Rectangle(x1, x2, x3, x4, x5)
    this.children.push(rect)
    return rect
  }

  load() {
    if (this.ctx) {
      for (const c of this.children) {
        c.canvas(this.ctx)
      }
    } else {
      for (const c of this.children) {
        this.element.appendChild(c.svg())
      }
    }
  }

  html(): SVGElement | HTMLCanvasElement {
    this.load()
    return this.element
  }
}
