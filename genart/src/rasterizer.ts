import { type Color } from './color'
import { type Vector } from './vec'

// https://github.dev/ronikaufman/poetical_computer_vision/blob/main/days01-10/day01/day01.pde
export class Rasterizer {
  data: ImageData
  buffer: Uint8ClampedArray

  constructor(data: ImageData) {
    this.data = data
    this.buffer = data.data
  }

  clone() {
    return new Rasterizer(
      new ImageData(
        new Uint8ClampedArray(this.data.data),
        this.data.width,
        this.data.height,
      ),
    )
  }

  get width() {
    return this.data.width
  }

  get height() {
    return this.data.height
  }

  rectangle(x: number, y: number, dx: number, dy: number, c: Color) {
    const width = this.data.width * 4
    for (let o = y * width; o <= (y + dy) * width; o += width) {
      for (let d = x * 4; d < (x + dx) * 4; d++) {
        this.buffer[o + d] = c.c[d % 4]!
      }
    }
  }

  gradientRectangle(
    x: number,
    y: number,
    dx: number,
    dy: number,
    c: Color,
    percentage: number,
  ) {
    const v = [c.r, c.g, c.b, 255]
    const width = this.data.width * 4
    for (let o = y * width; o <= (y + dy) * width; o += width) {
      for (let d = x * 4; d < (x + dx) * 4; d++) {
        const i = o + d
        const diff = v[d % 4]! - this.buffer[i]!
        this.buffer[i] += Math.sign(diff) * Math.abs(diff) * percentage
      }
    }
  }

  fadingGradientCircle(p: Vector<2>, r: number, c: Color, percentage: number) {
    let x = r
    let y = 0
    let d = 1 - x
    while (x >= y) {
      let fadingPerc = percentage * (Math.abs(1 + r - y) / r)
      this.fadingGradientHorizontalLine(p.x - x, 2 * x, p.y + y, c, fadingPerc)
      if (y !== 0) {
        this.fadingGradientHorizontalLine(
          p.x - x,
          2 * x,
          p.y - y,
          c,
          fadingPerc,
        )
      }

      y++
      if (d > 0) {
        if (x >= y) {
          fadingPerc = percentage * (Math.abs(r - x + 1) / r)
          this.fadingGradientHorizontalLine(
            p.x - y + 1,
            2 * y - 1,
            p.y - x,
            c,
            fadingPerc,
          )
          this.fadingGradientHorizontalLine(
            p.x - y + 1,
            2 * y - 1,
            p.y + x,
            c,
            fadingPerc,
          )
        }
        // go down
        x--
        d += 2 * (y - x + 1)
      } else {
        // go east
        d += 2 * y + 1
      }
    }
  }

  fadingGradientHorizontalLine(
    x: number,
    dx: number,
    y: number,
    c: Color,
    percentage: number,
  ) {
    const mid = dx / 2
    const o = y * this.width * 4
    for (let xi = 0; xi < dx; xi++) {
      const xo = (x + xi) * 4 + o
      const fadingPerc = percentage * (1 - Math.abs((mid - xi) / mid))
      for (let i = 0; i < 3; i++) {
        const diff = c.c[i % 4]! - this.buffer[xo + i]!
        this.buffer[xo + i] += Math.sign(diff) * Math.abs(diff) * fadingPerc
      }
      // assume that alpha is always 255
      // this.buffer[xo + 3] = 255
    }
  }

  /** https://en.wikipedia.org/wiki/Midpoint_circle_algorithm */
  gradientCircle(p: Vector<2>, r: number, c: Color, percentage: number) {
    let x = r
    let y = 0
    let d = 1 - x
    while (x >= y) {
      this.gradientHorizontalLine(p.x - x, 2 * x, p.y + y, c, percentage)
      if (y !== 0) {
        this.gradientHorizontalLine(p.x - x, 2 * x, p.y - y, c, percentage)
      }

      y++
      if (d > 0) {
        if (x >= y) {
          this.gradientHorizontalLine(
            p.x - y + 1,
            2 * y - 1,
            p.y - x,
            c,
            percentage,
          )
          this.gradientHorizontalLine(
            p.x - y + 1,
            2 * y - 1,
            p.y + x,
            c,
            percentage,
          )
        }
        // go down
        x--
        d += 2 * (y - x + 1)
      } else {
        // go east
        d += 2 * y + 1
      }
    }
  }

  gradientHorizontalLine(
    x: number,
    dx: number,
    y: number,
    c: Color,
    percentage: number,
  ) {
    const o = y * this.width * 4
    for (let i = x * 4 + o; i < (x + dx) * 4 + o; i++) {
      const diff = c.c[i % 4]! - this.buffer[i]!
      this.buffer[i] += Math.sign(diff) * Math.abs(diff) * percentage
    }
  }

  horizontalLine(x: number, dx: number, y: number, c: Color) {
    for (let xi = x; xi < x + dx; xi++) {
      this.set(xi, y, c)
    }
  }

  verticalLine(y: number, dy: number, x: number, c: Color) {
    for (let yi = y; yi < y + dy; yi++) {
      this.set(x, yi, c)
    }
  }

  /** https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm */
  line(x0: number, y0: number, x1: number, y1: number, c: Color) {
    x0 = Math.round(x0)
    y0 = Math.round(y0)
    x1 = Math.round(x1)
    y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0)
    const sx = x0 < x1 ? 1 : -1
    const dy = -Math.abs(y1 - y0)
    const sy = y0 < y1 ? 1 : -1
    let e = dx + dy

    while (true) {
      if (x0 > 100000) {
        throw Error(
          'size of x0 grew unrealisticly big, coordinates given are most likely wrong',
        )
      }
      this.set(x0, y0, c)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * e
      if (e2 >= dy) {
        if (x0 === x1) break
        e += dy
        x0 += sx
      } else if (e2 <= dx) {
        if (y0 === y1) break
        e += dx
        y0 += sy
      }
    }
  }

  set(x: number, y: number, value: Color): void
  set(
    x: number,
    y: number,
    dx: number | Color,
    dy?: number,
    value?: Uint8ClampedArray[],
  ): void {
    if (
      typeof value !== 'undefined' &&
      typeof dy !== 'undefined' &&
      typeof dx === 'number'
    ) {
      const width = this.data.width * 4
      let i = 0
      let j = 0
      for (let o = y * width; o <= (y + dy) * width; o += width) {
        for (let d = x * 4; d < (x + dx) * 4; d++) {
          this.buffer[o + d] = value[j]![i]!
          i++
        }
        j++
      }
      return
    }

    let i = x * 4 + y * this.width * 4
    const j = i + 4
    for (i; i < j; i++) {
      this.buffer[i] = (dx as Color).c[i % 4]!
    }
  }

  get(x: number, y: number): Uint8ClampedArray
  get(x: number, y: number, dx: number, dy: number): Uint8ClampedArray[]
  get(
    x: number,
    y: number,
    dx?: number,
    dy?: number,
  ): Uint8ClampedArray | Uint8ClampedArray[] {
    if (typeof dx !== 'undefined' && typeof dy !== 'undefined') {
      const width = this.width * 4
      const r = []
      for (let o = y * width; o <= (y + dy) * width; o += width) {
        r.push(this.buffer.slice(o + x * 4, o + (x + dx) * 4))
      }
      return r
    }

    const width = this.data.width
    const i = y * width * 4 + x * 4
    return this.buffer.slice(i, i + 4)
  }
}
