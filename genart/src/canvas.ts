class Canvas {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  constructor(width?: number, height?: number) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width ?? window.innerWidth
    this.canvas.height = height ?? window.innerHeight
    this.ctx = this.canvas.getContext('2d')!
  }

  circle() {
    this.ctx.beginPath()
    this.ctx.arc(95, 50, 40, 0, 2 * Math.PI)
    this.ctx.stroke()
  }

  point(x: number, y: number) {
    this.ctx.fillRect(x, y, 1, 1)
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
