export interface PathOptions {
  stroke?: string
  strokeWidth?: string
}

class Path {
  private readonly inner: string

  constructor(options?: PathOptions) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    svg.style.stroke = options?.stroke ?? '#000'
    svg.style.strokeWidth = options?.stroke ?? '0.4'
    this.inner = ''
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

export interface SvgOptions {
  width?: number
  height?: number
  fill?: number
}
class Svg extends SVGElement {
  svg: SVGElement

  constructor(options?: Partial<SvgOptions>) {
    const opt: SvgOptions = {
      width: 1000,
      height: 1000,
      fill: 1,
      ...options,
    }
    super()
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.svg.setAttribute('xlms', 'http://www.w3.org/2000/svg')
    this.svg.setAttribute('width', `${opt.width}px`)
    this.svg.setAttribute('height', `${opt.height}px`)
    this.svg.setAttribute('fill', `${opt.fill}`)
  }
}
export function svg(options?: Partial<SvgOptions>): Svg {
  return new Svg(options)
}
