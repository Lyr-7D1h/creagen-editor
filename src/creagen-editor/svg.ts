import { CREAGEN_EDITOR_VERSION } from '../env'
import { Library } from '../settings/SettingsConfig'

export class Svg {
  svg: SVGElement
  constructor(svg: SVGElement) {
    this.svg = svg
  }

  export(name: string, libraries: Library[]) {
    const svg = this.svg.cloneNode(true) as SVGElement

    // TODO: add params used, code hash, date generated
    const metadata = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'metadata',
    )
    const creagen = document.createElement('creagen')
    creagen.setAttribute(
      'libraries',
      libraries.map((l) => `${l.name}@${l.version.toString()}`).join(','),
    )
    creagen.setAttribute('editor-version', CREAGEN_EDITOR_VERSION.toString())
    metadata.appendChild(creagen)
    svg.appendChild(metadata)

    const htmlStr = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>${svg.outerHTML}`
    const blob = new Blob([htmlStr], { type: 'image/svg+xml' })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('download', `${name}.svg`)
    a.setAttribute('href', url)
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
}
