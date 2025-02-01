// use p5 as ref https://p5js.org/reference/#/p5.Image

import { Color } from '../Color'
import { gaussianBlur } from './gaussianBlur'
import { edgeDetection } from './edgeDetection'
import { Vector } from '../Vector'

// https://github.dev/ronikaufman/poetical_computer_vision/blob/main/days01-10/day01/day01.pde
export class Image {
  private img: HTMLImageElement
  private pixeldata: Uint8ClampedArray
  private pixelsLoaded: boolean

  static create(input: string) {
    const image = new Image(input)
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

  get width() {
    return this.img.width
  }

  get height() {
    return this.img.height
  }

  get pixels(): Uint8ClampedArray {
    if (!this.pixelsLoaded)
      throw new Error(
        'pixels not loaded. use `await Image.loadPixels()` before accessing them',
      )
    return this.pixeldata
  }

  clone() {
    const img = new Image(this.img.src)
    img.pixeldata = new Uint8ClampedArray(this.pixeldata)
    img.pixelsLoaded = this.pixelsLoaded
    return img
  }

  get(x: number, y: number): Color
  get(p: Vector<2>): Color
  get(x: number, y: number, dx: number, dy: number): Uint8ClampedArray[]
  get(
    x: number | Vector<2>,
    y?: number,
    dx?: number,
    dy?: number,
  ): Uint8ClampedArray | Uint8ClampedArray[] | Color {
    if (x instanceof Vector) {
      return this.get(x.x, x.y)
    }

    if (typeof dx !== 'undefined' && typeof dy !== 'undefined') {
      const width = this.img.width * 4
      const r = []
      const pixels = this.pixels
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
    return new Color(this.pixels.slice(i, i + 4))
  }

  html() {
    if (this.pixeldata.length > 0) {
      const canvas = document.createElement('canvas')
      canvas.width = this.img.width
      canvas.height = this.img.height
      const ctx = canvas.getContext('2d')!
      ctx.putImageData(
        new ImageData(this.pixeldata, this.width, this.height),
        0,
        0,
      )
      this.img.src = canvas.toDataURL('image/png')
    }
    return this.img
  }

  gaussianBlur(radius: number) {
    gaussianBlur(this.pixels, this.width, this.height, radius)
    return this
  }

  private applyCanvasFilter(type: string) {
    const canvas = document.createElement('canvas')
    canvas.width = this.img.width
    canvas.height = this.img.height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(
      new ImageData(this.pixeldata, this.width, this.height),
      0,
      0,
    )
    ctx.filter = type
    this.pixeldata = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    return this
  }

  // TODO: not working
  brightness(percentage: number) {
    this.applyCanvasFilter(`brightness(${percentage})`)
  }

  horizontalGradient(startPercentage: number, endPercentage: number) {
    const width = this.width * 4
    for (let y = 0; y < this.height; y += 1) {
      const o = y * width
      const p =
        startPercentage + ((endPercentage - startPercentage) * y) / this.height
      for (let x = 0; x < width; x += 4) {
        this.pixeldata[o + x] *= p
        this.pixeldata[o + x + 1] *= p
        this.pixeldata[o + x + 2] *= p
      }
    }
    return this
  }

  edgeDetection() {
    const buff = edgeDetection(this.pixels, this.width)
    this.pixeldata = buff
    return this
  }
}
