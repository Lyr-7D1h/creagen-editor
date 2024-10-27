import { FixedArray, Vector } from './Vector'

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
    this.element.setAttribute('d', `${this.path}`)
    return this.element
  }

  moveTo(x: number, y: number): Path
  moveTo(x: Vector<2>): Path
  moveTo(x: number | Vector<2>, y?: number) {
    if (typeof x !== 'number') {
      y = x.y
      x = x.x
    }
    this.path += `M ${x} ${y}`
    return this
  }

  lineTo(x: number, y: number): Path
  lineTo(x: Vector<2>): Path
  lineTo(x: number | Vector<2>, y?: number) {
    if (typeof x !== 'number') {
      y = x.y
      x = x.x
    }
    this.path += `L ${x} ${y}`
    return this
  }

  /** Quadratic Bezier Curve */
  qCurve(x: number, y: number, dx: number, dy: number) {
    this.path += ` Q ${x} ${y}, ${dx} ${dy}`
    return {
      ...this,
      tCurve: (x: number, y: number) => {
        this.path += `T ${x} ${y}`
      },
    }
  }
  /** Extend your quadratic curve with a new point */
  tCurve(x: number, y: number) {
    this.path += `T ${x} ${y}`
    return this
  }

  /** Cubic Bezier Curve */
  cCurve(
    dx1: number,
    dy1: number,
    dx2: number,
    dy2: number,
    x: number,
    y: number,
  ) {
    this.path += `C ${dx1} ${dy1} ${dx2} ${dy2} ${x} ${y}`
    return {
      ...this,
      sCurve(dx2: number, dy2: number, x: number, y: number) {
        this.path += `S ${dx2} ${dy2} ${x} ${y}`
      },
    }
  }
  sCurve(dx2: number, dy2: number, x: number, y: number) {
    this.path += `S ${dx2} ${dy2} ${x} ${y}`
  }
}
export function path(options?: PathOptions): Path {
  return new Path(options)
}

class Polygon {
  private readonly element: SVGPolygonElement

  constructor(points: [number, number][], options?: GeometricOptions) {
    this.element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'polygon',
    )
    this.element.setAttribute(
      'points',
      points.map((p) => p.join(',')).join(' '),
    )
    applyRectangleOptions(this.element, options)
  }

  html() {
    return this.element
  }
}
export function polygon(
  points: [number, number][],
  options?: GeometricOptions,
): Polygon {
  return new Polygon(points, options)
}

export interface RectangleOptions extends GeometricOptions {
  x?: number | string
  y?: number | string
  rx?: number
  ry?: number
}
function applyRectangleOptions(element: SVGElement, opts?: RectangleOptions) {
  if (typeof opts === 'undefined') return
  applyGeometricOptions(element, opts)
  if (opts.x) element.setAttribute('x', opts.x.toString())
  if (opts.y) element.setAttribute('y', opts.y.toString())
  if (opts.rx) element.setAttribute('rx', opts.rx.toString())
  if (opts.ry) element.setAttribute('ry', opts.ry.toString())
}
class Rectangle {
  private readonly element: SVGRectElement

  constructor(width: number, height: number, options?: RectangleOptions) {
    this.element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect',
    )
    this.element.setAttribute('width', width.toString())
    this.element.setAttribute('height', height.toString())
    applyRectangleOptions(this.element, options)
  }

  html() {
    return this.element
  }
}
export function rect(
  width: number,
  height: number,
  options?: RectangleOptions,
): Rectangle {
  return new Rectangle(width, height, options)
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

class Circle {
  private readonly element: SVGCircleElement

  constructor(
    r: number | string,
    cx: number,
    cy: number,
    options?: GeometricOptions,
  ) {
    this.element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle',
    )
    this.element.setAttribute('r', r.toString())
    this.element.setAttribute('cx', cx.toString())
    this.element.setAttribute('cy', cy.toString())
    applyGeometricOptions(this.element, options)
  }

  html(): SVGCircleElement {
    return this.element
  }
}
export function circle(
  r: number | string,
  cx: number,
  cy: number,
  options?: GeometricOptions,
) {
  return new Circle(r, cx, cy, options)
}

export type SvgChild = Path | Text | Rectangle | Circle | Polygon
export interface SvgOptions {
  width?: number | string
  height?: number | string
  fill?: string
}
function applySvgOptions(element: SVGElement, opts?: SvgOptions) {
  element.setAttribute(
    'width',
    typeof opts?.width !== 'undefined' ? opts.width.toString() : '1000px',
  )
  element.setAttribute(
    'height',
    typeof opts?.height !== 'undefined' ? opts.height.toString() : '1000px',
  )
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

  clear() {
    this.children = []
    this.element.innerHTML = ''
  }

  path(options?: PathOptions) {
    const p = path(options)
    this.add(p)
    return p
  }

  circle(
    r: number | string,
    cx: number,
    cy: number,
    options?: GeometricOptions,
  ) {
    const p = circle(r, cx, cy, options)
    this.add(p)
    return p
  }

  rect(width: number, height: number, options?: RectangleOptions) {
    const p = rect(width, height, options)
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
    if (typeof this.options?.height !== 'undefined') {
      if (typeof this.options?.height === 'number') {
        return this.options.height
      }
      return null
    }
    return 1000
  }

  polygon(points: [number, number][], options?: GeometricOptions) {
    const p = polygon(points, options)
    this.add(p)
    return p
  }

  triangle(points: FixedArray<Vector<2>, 3>, opts?: PathOptions) {
    const p = this.path(opts)
    p.moveTo(points[0].x, points[0].y)
      .lineTo(points[1].x, points[1].y)
      .lineTo(points[2].x, points[2].y)
      .lineTo(points[0].x, points[0].y)
    return this
  }

  curve(points: Vector<2>[], opts?: PathOptions) {
    if (points.length < 2) {
      throw Error('Need at least 2 points to draw a curve')
    }
    const path = this.path(opts)
    path.moveTo(points[0])
    let i = 0
    for (i; i < points.length - 2; i++) {
      const { x, y } = points[i]
      const { x: nx, y: ny } = points[i + 1]
      var xc = (x + nx) / 2
      var yc = (y + ny) / 2
      path.qCurve(x, y, xc, yc)
    }
    path.qCurve(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y)
  }

  /** Create a grid onto your svg with boxes of width and height */
  grid(size: number): void
  grid(width: number, height: number): void
  grid(width: number, height?: number): void {
    if (typeof height === 'undefined') {
      height = width
    }
    const w = this.width()
    const h = this.height()
    if (w === null || h === null) {
      throw Error("Can't draw grid if width and height are not numeric")
    }
    const p = this.path()
    for (let x = width; x < w; x += width) {
      p.moveTo(x, 0).lineTo(x, h)
    }
    for (let y = height; y < h; y += width) {
      p.moveTo(0, y).lineTo(w, y)
    }
  }
}
export function svg(options?: SvgOptions): Svg {
  return new Svg(options)
}
