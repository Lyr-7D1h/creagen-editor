import {
  type FolderApi,
  Pane,
  type ButtonApi,
  type BindingParams,
} from 'tweakpane'
import { generateHumanReadableName } from './util'
import { GENART_VERSION, GENART_EDITOR_VERSION } from '../constants'

interface Folder {
  folder: FolderApi
  params: Record<string, any>
  handlers: Record<string, (v: any) => void>
  buttons: Record<string, ButtonApi>
}

export class Options {
  private readonly pane: Pane
  private readonly folders: Record<string, Folder>

  constructor() {
    this.pane = new Pane()
    this.pane.hidden = true
    this.folders = {}
  }

  createFolder(key: string) {
    this.pane.hidden = false
    this.folders[key] = {
      folder: this.pane.addFolder({
        title: key,
        expanded: true,
      }),
      params: {},
      buttons: {},
      handlers: {},
    }
  }

  /** add a parameter if it did not already exist */
  addParam<T>(
    folder: string,
    name: string,
    value: T,
    onChange?: (value: T) => void,
    options?: BindingParams,
  ): Folder {
    // create params under a key if not exists
    if (!(folder in this.folders)) {
      this.createFolder(folder)
    }

    const p = this.folders[folder]!

    // add if param does not exists already
    if (!(name in p.params)) {
      p.params[name] = value
      if (onChange) p.handlers[name] = onChange
      const param = p.folder.addBinding(p.params, name, options)

      if (onChange) {
        param.on('change', (e) => {
          if (typeof e.value !== 'undefined') {
            onChange(e.value)
          }
        })
      }
    }

    return p
  }

  /** create a new button, removing any older ones */
  addButton(folder: string, title: string): ButtonApi {
    if (!(folder in this.folders)) {
      this.createFolder(folder)
    }

    const f = this.folders[folder]!

    if (title in f.buttons) {
      f.buttons[title]?.dispose()
    }

    f.buttons[title] = f.folder.addButton({ title })

    return f.buttons[title]!
  }

  /** update options menu based on code ran and content */
  updateRenderOptions(container: HTMLElement) {
    for (const c of Array.from(container.children)) {
      switch (c.tagName.toUpperCase()) {
        case 'CANVAS':
          return
        case 'SVG': {
          this.addParam('Export', 'Name', generateHumanReadableName())

          const btn = this.addButton('Export', 'Download')
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
