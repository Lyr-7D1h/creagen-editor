import { Pane } from 'tweakpane'
import { generateHumanReadableName } from './util'
import { Editor } from './editor'

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
  private readonly html: HTMLElement
  // eslint-disable-next-line @typescript-eslint/prefer-readonly
  private settings: GeneratorSettings
  private readonly editor: Editor

  constructor(opts?: Partial<GeneratorSettings>) {
    this.settings = { ...defaultGeneratorSettings(), ...opts }
    this.html = document.getElementById('generator')!
    this.editor = new Editor()
    this.buildUI()
  }

  buildUI(): void {
    const pane = new Pane()

    const folder = pane.addFolder({ title: 'Export', expanded: false })

    for (const [label, value] of Object.entries(this.settings)) {
      if (typeof value === 'string') {
        let parse = (v: string): void => (this.settings[label] = v)

        if (label === 'width' || label === 'height') {
          parse = (v: string) => {
            this.svg.setAttribute(label, v)
            return (this.settings[label] = v)
          }
        }

        folder.addBlade({
          view: 'text',
          label,
          parse,
          value,
        })
      }
    }

    const btn = folder.addButton({
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
}
