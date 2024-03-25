export interface PathOptions {
  stroke?: string
  strokeWidth?: string
}

class Path {
  private path: string
  private readonly element: SVGPathElement

  constructor(options?: PathOptions) {
    this.element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    )
    this.element.setAttribute('stroke', options?.stroke ?? '#000')
    this.element.setAttribute('strokeWidth', options?.strokeWidth ?? '0.4')
    this.path = ''
  }

  html(): SVGPathElement {
    this.element.setAttribute('d', this.path)
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
}
export function path(options?: PathOptions): Path {
  return new Path(options)
}

export function circle(r: number, cx?: number, cy?: number): SVGCircleElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  svg.setAttribute('r', r.toString())
  if (cx) svg.setAttribute('cx', cx.toString())
  if (cy) svg.setAttribute('cy', cy.toString())
  return svg
}

export type SvgChild = Path
export interface SvgOptions {
  width?: number
  height?: number
  fill?: number
}
class Svg {
  element: SVGElement
  children: SvgChild[]

  constructor(options?: Partial<SvgOptions>) {
    const opt: SvgOptions = {
      width: 1000,
      height: 1000,
      fill: 1,
      ...options,
    }
    this.element = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.element.setAttribute('xlms', 'http://www.w3.org/2000/svg')
    this.element.setAttribute('width', `${opt.width}px`)
    this.element.setAttribute('height', `${opt.height}px`)
    this.element.setAttribute('fill', `${opt.fill}`)
    this.children = []
  }

  path(options?: PathOptions) {
    const p = path(options)
    this.add(p)
    return p
  }

  add(element: SvgChild): void {
    this.children.push(element)
  }

  html(): SVGElement {
    const html = this.element.cloneNode(true) as SVGElement
    console.log(html, this.element)
    for (const c of this.children) {
      html.appendChild(c.html())
    }
    return html
  }
}
export function svg(options?: Partial<SvgOptions>): Svg {
  return new Svg(options)
}
