import { FixedArray, Vector } from './vec'

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
    this.element.appendChild(element.html())
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
    const path = this.path(opts)
    path.moveTo(points[0][0], points[0][1])
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
  // curve(
  //   points: [number, number][],
  //   tension?: number,
  //   isClosed?: boolean,
  //   numOfSegments?: number,
  // ) {
  //   const newPoints = getCurvePoints(points, tension, isClosed, numOfSegments)
  //   const path = this.path()
  //   console.log(newPoints)
  //   path.moveTo(newPoints[0], newPoints[1])
  //   for (let i = 2; i < newPoints.length - 1; i += 2) {
  //     // const [x, y] = newPoints[i]
  //     path.lineTo(newPoints[i], newPoints[i + 1])
  //   }
  //   // for (let i = 1; i < newPoints.length; i += 1) {
  //   //   const [x, y] = newPoints[i]
  //   //   path.lineTo(x, y)
  //   // }
  // }

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

function getCurvePoints(
  points: [number, number][],
  tension?: number,
  isClosed?: boolean,
  numOfSegments?: number,
): number[] {
  // use input value if provided, or use a default value
  tension = typeof tension != 'undefined' ? tension : 0.5
  isClosed = isClosed ? isClosed : false
  numOfSegments = numOfSegments ? numOfSegments : 16

  let _pts = [],
    res = [], // clone array
    x,
    y, // our x,y coords
    t1x,
    t2x,
    t1y,
    t2y, // tension vectors
    c1,
    c2,
    c3,
    c4, // cardinal points
    st,
    t,
    i // steps based on num. of segments

  // clone array so we don't change the original
  //
  _pts = points.slice(0).flat()

  // The algorithm require a previous and next point to the actual point array.
  // Check if we will draw closed or open curve.
  // If closed, copy end points to beginning and first points to end
  // If open, duplicate first points to befinning, end points to end
  if (isClosed) {
    _pts.unshift(points[points.length - 1])
    _pts.unshift(points[points.length - 2])
    _pts.unshift(points[points.length - 1])
    _pts.unshift(points[points.length - 2])
    _pts.push(points[0])
    _pts.push(points[1])
  } else {
    _pts.unshift(points[1]) //copy 1. point and insert at beginning
    _pts.unshift(points[0])
    _pts.push(points[points.length - 2]) //copy last point and append
    _pts.push(points[points.length - 1])
  }

  // ok, lets start..

  // 1. loop goes through point array
  // 2. loop goes through each segment between the 2 pts + 1e point before and after
  for (i = 2; i < _pts.length - 4; i += 2) {
    for (t = 0; t <= numOfSegments; t++) {
      // calc tension vectors
      t1x = (_pts[i + 2] - _pts[i - 2]) * tension
      t2x = (_pts[i + 4] - _pts[i]) * tension

      t1y = (_pts[i + 3] - _pts[i - 1]) * tension
      t2y = (_pts[i + 5] - _pts[i + 1]) * tension

      // calc step
      st = t / numOfSegments

      // calc cardinals
      c1 = 2 * Math.pow(st, 3) - 3 * Math.pow(st, 2) + 1
      c2 = -(2 * Math.pow(st, 3)) + 3 * Math.pow(st, 2)
      c3 = Math.pow(st, 3) - 2 * Math.pow(st, 2) + st
      c4 = Math.pow(st, 3) - Math.pow(st, 2)

      // calc x and y cords with common control vectors
      x = c1 * _pts[i] + c2 * _pts[i + 2] + c3 * t1x + c4 * t2x
      y = c1 * _pts[i + 1] + c2 * _pts[i + 3] + c3 * t1y + c4 * t2y

      //store points in array
      res.push(x)
      res.push(y)
    }
  }

  return res
}
