export interface GeometricOptions {
  fill?: string
  fillOpacity?: number | string
  stroke?: string
  strokeWidth?: number
  transform?: string
}
function applyGeometricOptions(element: SVGElement, opts?: GeometricOptions) {
  element.setAttribute('stroke', opts?.stroke ?? 'black')
  if (typeof opts === 'undefined') return
  if (opts.fill) element.setAttribute('fill', opts.fill)
  if (opts.fillOpacity) {
    element.setAttribute('fill-opacity', opts.fillOpacity.toString())
  }
  if (opts.strokeWidth) {
    element.setAttribute('stroke-width', opts.strokeWidth.toString())
  }
  if (opts.transform) {
    element.setAttribute('transform', opts.transform)
  }
}
export interface PathOptions extends GeometricOptions {}
function applyPathOptions(element: SVGElement, opts?: PathOptions) {
  applyGeometricOptions(element, opts)
}
class Path {
  private path: string
  private readonly element: SVGPathElement

  constructor(options?: PathOptions) {
    this.element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    )
    applyPathOptions(this.element, options)
    this.path = ''
  }

  html(): SVGPathElement {
    this.element.setAttribute('d', `${this.path}Z`)
    return this.element
  }

  moveTo(x: number, y: number) {
    this.path += `M ${x} ${y}`
    return this
  }

  lineTo(x: number, y: number) {
    this.path += `L ${x} ${y}`
    return this
  }

  /** Quadratic Bezier Curve */
  qCurve(x: number, y: number, dx: number, dy: number) {
    this.path += `Q ${x} ${y} ${dx} ${dy}`
    return {
      ...this,
      tCurve: (x: number, y: number) => {
        this.path += `T ${x} ${y}`
      },
    }
  }
}
export function path(options?: PathOptions): Path {
  return new Path(options)
}

export interface TextOptions extends GeometricOptions {
  content?: string
  x?: number | string
  y?: number | string
  dx?: number | string
  dy?: number | string
  rotate?: number
  textLength?: number
  fontSize?: number
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number
  // TODO: what type?
  // lengthAdjust?: number
}
function applyTextOptions(element: SVGElement, opts?: TextOptions) {
  if (typeof opts === 'undefined') return
  applyGeometricOptions(element, opts)
  if (opts.content) element.innerHTML = opts.content
  if (opts.x) element.setAttribute('x', opts.x.toString())
  if (opts.y) element.setAttribute('y', opts.y.toString())
  if (opts.dx) element.setAttribute('dx', opts.dx.toString())
  if (opts.dy) element.setAttribute('dy', opts.dy.toString())
  if (opts.rotate) element.setAttribute('rotate', opts.rotate.toString())
  if (opts.textLength) {
    element.setAttribute('text-length', opts.textLength.toString())
  }
  if (opts.fontSize) {
    element.setAttribute('font-size', opts.fontSize.toString())
  }
  if (opts.fontWeight) {
    if (typeof opts.fontWeight === 'string') {
      element.setAttribute('font-weight', opts.fontWeight)
    } else {
      element.setAttribute('font-weight', opts.fontWeight.toString())
    }
  }
}
class Text {
  private readonly element: SVGTextElement

  constructor(options?: TextOptions) {
    this.element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'text',
    )
    applyTextOptions(this.element, options)
  }

  setContent(text: string) {
    this.element.innerHTML = text
  }

  html(): SVGTextElement {
    return this.element
  }
}
export function text(options?: TextOptions): Text {
  return new Text(options)
}

// export function circle(r: number, cx?: number, cy?: number): SVGCircleElement {
//   const svg = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
//   svg.setAttribute('r', r.toString())
//   if (cx) svg.setAttribute('cx', cx.toString())
//   if (cy) svg.setAttribute('cy', cy.toString())
//   return svg
// }

export type SvgChild = Path | Text
export interface SvgOptions {
  width?: number | string
  height?: number | string
  fill?: string
}
function applySvgOptions(element: SVGElement, opts?: SvgOptions) {
  if (typeof opts === 'undefined') return
  element.setAttribute(
    'width',
    typeof opts?.width !== 'undefined' ? opts.width.toString() : '1000px',
  )
  element.setAttribute(
    'height',
    typeof opts?.height !== 'undefined' ? opts.height.toString() : '1000px',
  )
  if (opts.fill) element.setAttribute('fill', `${opts.fill}`)
}
class Svg {
  element: SVGElement
  children: SvgChild[]

  private readonly options?: SvgOptions

  constructor(options?: SvgOptions) {
    this.element = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.element.setAttribute('xlms', 'http://www.w3.org/2000/svg')
    applySvgOptions(this.element, options)
    this.options = options
    this.children = []
  }

  path(options?: PathOptions) {
    const p = path(options)
    this.add(p)
    return p
  }

  text(options?: TextOptions) {
    const p = text(options)
    this.add(p)
    return p
  }

  add(element: SvgChild): void {
    this.children.push(element)
  }

  html(): SVGElement {
    const html = this.element.cloneNode(true) as SVGElement
    for (const c of this.children) {
      html.appendChild(c.html())
    }
    return html
  }

  width(): number | null {
    if (typeof this.options?.width !== 'undefined') {
      if (typeof this.options?.width === 'number') {
        return this.options.width
      }
      return null
    }
    return 1000
  }

  height(): number | null {
    if (typeof this.options?.width !== 'undefined') {
      if (typeof this.options?.width === 'number') {
        return this.options.width
      }
      return null
    }
    return 1000
  }

  grid(): void {
    const width = this.width()
    const height = this.height()
    if (width === null || height === null) {
      throw Error("Can't draw grid if width and height are not numeric")
    }
    const wo = width / 10

    for (let i = 1; i < 10; i++) {
      const o = wo * i
      this.path().moveTo(o, 0).lineTo(o, height)
      this.path().moveTo(0, o).lineTo(width, o)
    }
  }
}
export function svg(options?: SvgOptions): Svg {
  return new Svg(options)
}
