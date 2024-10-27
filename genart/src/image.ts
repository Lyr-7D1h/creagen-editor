// use p5 as ref https://p5js.org/reference/#/p5.Image

import { Color } from './color'

// https://github.dev/ronikaufman/poetical_computer_vision/blob/main/days01-10/day01/day01.pde
export class Image {
  private readonly img: HTMLImageElement
  private pixeldata: Uint8ClampedArray
  private pixelsLoaded: boolean

  static async create(input: string) {
    const image = new Image(input)
    await image.loadPixels()
    return image
  }

  /** @param input url or base64 string with image data */
  private constructor(input: string) {
    this.img = new globalThis.Image()
    this.img.src = input

    this.pixelsLoaded = false
    this.pixeldata = new Uint8ClampedArray()
  }

  /** load pixel data using html canvas */
  async loadPixels() {
    if (this.pixelsLoaded) {
      return
    }
    await new Promise<void>((resolve) => {
      this.img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = this.img.width
        canvas.height = this.img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(this.img, 0, 0)

        this.pixeldata = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data
        this.pixelsLoaded = true
        resolve()
      }
    })
  }

  width() {
    return this.img.width
  }

  height() {
    return this.img.height
  }

  pixels() {
    if (!this.pixelsLoaded) throw new Error('pixels not loaded')
    return this.pixeldata
  }

  get(x: number, y: number): Color
  get(x: number, y: number, dx: number, dy: number): Uint8ClampedArray[]
  get(
    x: number,
    y: number,
    dx?: number,
    dy?: number,
  ): Uint8ClampedArray | Uint8ClampedArray[] | Color {
    if (!this.pixelsLoaded) throw new Error('pixels not loaded')

    if (typeof dx !== 'undefined' && typeof dy !== 'undefined') {
      const width = this.img.width * 4
      const r = []
      const pixels = this.pixels()
      if ((x + dx) * 4 > pixels.length) {
        throw Error('x is out of bounds')
      }
      if ((y + dy) * width > pixels.length) {
        throw Error('y is out of bounds')
      }
      for (let o = y * width; o < (y + dy) * width; o += width) {
        r.push(pixels.slice(o + x * 4, o + (x + dx) * 4))
        o += width
      }
      return r
    }

    const width = this.img.width
    const i = y * width * 4 + x * 4
    return new Color(this.pixels().slice(i, i + 4))
  }

  html() {
    return this.img
  }
}
