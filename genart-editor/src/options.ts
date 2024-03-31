import { type FolderApi, Pane, type ButtonApi } from 'tweakpane'
import { generateHumanReadableName } from './util'
import { GENART_VERSION, GENART_EDITOR_VERSION } from '../constants'

interface Folder {
  folder: FolderApi
  params: Record<string, any>
  buttons: Record<string, ButtonApi>
}

export class Options {
  private readonly options: Pane
  private readonly folders: Record<string, Folder>

  constructor() {
    this.options = new Pane()
    this.options.hidden = true
    this.folders = {}
  }

  createFolder(key: string) {
    this.options.hidden = false
    this.folders[key] = {
      folder: this.options.addFolder({
        title: key,
        expanded: true,
      }),
      params: {},
      buttons: {},
    }
  }

  /** add a parameter if it did not already exist */
  addParam(key: string, name: string, defaultValue: any): Folder {
    // create params under a key if not exists
    if (!(key in this.folders)) {
      this.createFolder(key)
    }

    const p = this.folders[key]!

    // add if param does not exists already
    if (!(name in p.params)) {
      p.params[name] = defaultValue
      p.folder.addBlade({
        view: 'text',
        label: name,
        value: p.params[name],
        parse: (v: any) => (p.params[name] = v),
      })
    }

    return p
  }

  /** create a new button, removing any older ones */
  addButton(key: string, title: string): ButtonApi {
    if (!(key in this.folders)) {
      this.createFolder(key)
    }

    const f = this.folders[key]!

    if (title in f.buttons) {
      f.buttons[title]?.dispose()
    }

    f.buttons[title] = f.folder.addButton({ title })

    return f.buttons[title]!
  }

  /** update options menu based on code ran and content */
  render(container: HTMLElement) {
    for (const c of Array.from(container.children)) {
      switch (c.tagName.toUpperCase()) {
        case 'CANVAS':
          return
        case 'SVG': {
          this.addParam('export', 'Name', generateHumanReadableName())

          const btn = this.addButton('export', 'Download')
          btn.on('click', () => {
            const svg = c.cloneNode(true) as SVGElement

            // TODO: add params used, code hash, date generated
            const metadata = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'metadata',
            )
            const genart = document.createElement('genart')
            genart.setAttribute('version', GENART_VERSION)
            genart.setAttribute('editor-version', GENART_EDITOR_VERSION)
            metadata.appendChild(genart)
            svg.appendChild(metadata)

            const htmlStr = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>${svg.outerHTML}`
            const blob = new Blob([htmlStr], { type: 'image/svg+xml' })

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.setAttribute(
              'download',
              `${this.folders['export']!.params['Name']}.svg`,
            )
            a.setAttribute('href', url)
            a.style.display = 'none'
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
          })
          return
        }
      }
    }
  }
}
