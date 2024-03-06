import { Pane } from 'tweakpane'
import { path } from './svg'
import { generateHumanReadableName } from './util'

interface GeneratorSettings {
  name: string
  width: string
  height: string
  fill: string
}
function defaultGeneratorSettings(): GeneratorSettings {
  return {
    name: generateHumanReadableName(),
    width: '1000px',
    height: '1000px',
    fill: 'none',
  }
}
export class Generator {
  private readonly svg: SVGSVGElement
  private readonly html: HTMLElement
  // eslint-disable-next-line @typescript-eslint/prefer-readonly
  private settings: GeneratorSettings

  constructor(opts?: Partial<GeneratorSettings>) {
    this.settings = { ...defaultGeneratorSettings(), ...opts }
    this.html = document.getElementById('generator')!
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.svg.setAttribute('xlms', 'http://www.w3.org/2000/svg')
    this.svg.setAttribute('width', this.settings.width)
    this.svg.setAttribute('height', this.settings.height)
    this.svg.setAttribute('fill', this.settings.fill)
    this.html.appendChild(this.svg)

    this.buildUI()
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

  buildUI(): void {
    const pane = new Pane()

    for (const [label, value] of Object.entries(this.settings)) {
      if (typeof value === 'string') {
        let parse = (v: string): void => (this.settings[label] = v)

        if (label === 'width' || label === 'height') {
          parse = (v: string) => {
            this.svg.setAttribute(label, v)
            return (this.settings[label] = v)
          }
        }

        pane.addBlade({
          view: 'text',
          label,
          parse,
          value,
        })
      }
    }

    const btn = pane.addButton({
      title: 'Download',
    })
    btn.on('click', () => {
      const htmlStr = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>${this.svg.outerHTML}`
      const blob = new Blob([htmlStr], { type: 'image/svg+xml' })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.setAttribute('download', `${this.settings.name}.svg`)
      a.setAttribute('href', url)
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    })
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
