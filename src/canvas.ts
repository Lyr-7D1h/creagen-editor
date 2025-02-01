import { type Color } from './Color'
import { Vector } from './Vector'

export interface GeometricOptions {
  fill?: Color
}

export class Canvas {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  constructor(width?: number, height?: number) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width ?? window.innerWidth
    this.canvas.height = height ?? window.innerHeight
    this.ctx = this.canvas.getContext('2d')!
  }

  get width() {
    return this.canvas.width
  }

  get height() {
    return this.canvas.height
  }

  circle() {
    this.ctx.beginPath()
    this.ctx.arc(95, 50, 40, 0, 2 * Math.PI)
    this.ctx.stroke()
  }

  rectangle(p: Vector<2>, size: number): void
  rectangle(p: Vector<2>, width: number, height: number): void
  rectangle(x: number, y: number, size: number): void
  rectangle(
    x: number | Vector<2>,
    y: number,
    width: number,
    height?: number,
  ): void
  rectangle(x: number | Vector<2>, y: number, width?: number, height?: number) {
    if (x instanceof Vector) {
      this.rectangle(x.x, x.y, y, width)
      return
    }
    if (typeof height !== 'undefined') {
      this.ctx.fillRect(x, y, width!, height)
      return
    }
    this.ctx.fillRect(x, y, width!, width!)
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  html() {
    return this.canvas
  }
}

export function canvas(width?: number, height?: number) {
  return new Canvas(width, height)
}
