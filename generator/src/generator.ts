import { path } from "./svg"

interface GeneratorOptions {
  width?: string
  height?: string
}
export class Generator {
  readonly svg: SVGSVGElement

  constructor(opts?: GeneratorOptions) {
    const main = document.getElementsByTagName('main')[0]!
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.svg.setAttribute('xlms', 'http://www.w3.org/2000/svg')
    this.svg.setAttribute('width', opts?.width ?? '1000px')
    this.svg.setAttribute('height', opts?.height ?? '1000px')
    this.svg.style.width = '1000px'
    this.svg.style.height = '1000px'
    main.appendChild(this.svg)
  }

  width(): number {
    const boundingBox = this.svg.getBoundingClientRect()
    return boundingBox.width
  }

  height(): number {
    const boundingBox = this.svg.getBoundingClientRect()
    return boundingBox.height
  }

  add(element: SVGElement): void {
    this.svg.appendChild(element)
  }

  toggleGrid(): void {
    const width = this.width()
    const height = this.height()
    const wo = width / 10
    for (let i = 1; i < 10; i++) {
      const o = wo * i
      this.add(path(`M0 ${o} L${width} ${o}Z`))
      this.add(path(`M${o} 0 L${o} ${height}Z`))
    }
  }
}
