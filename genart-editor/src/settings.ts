import {
  type FolderApi,
  Pane,
  type ButtonApi,
  type BindingParams,
} from 'tweakpane'
import { generateHumanReadableName } from './util'
import { GENART_VERSION, GENART_EDITOR_VERSION } from '../constants'
import { type BindingApi, type BladeState } from '@tweakpane/core'

interface Folder {
  self: FolderApi
  params: Record<string, any>
  buttons: Record<string, ButtonApi>
}

export type SettingsConfig = Record<
  string,
  | {
      type: 'folder'
      title: string
    }
  | {
      type: 'param'
      label: string
      value: any
      opts?: BindingParams
    }
>

type Params<T extends SettingsConfig> = {
  [K in keyof T]: T[K] extends {
    type: 'param'
    label: string
    value?: any
    opts?: BindingParams
  }
    ? K
    : never
}[keyof T]

export class Settings<Conf extends SettingsConfig> {
  private readonly html: HTMLElement
  private readonly pane: Pane
  private readonly params: Record<Params<Conf>, any>
  private readonly settings: Record<keyof Conf, FolderApi | BindingApi>

  constructor(config: Conf) {
    this.html = document.getElementById('settings')!
    this.pane = new Pane({ container: this.html })
    this.pane.hidden = true

    this.params = {}
    this.settings = {}
    const keys = Object.keys(config) as [keyof Conf]
    console.log(keys)
    keys.sort((a, b) => (config[a]?.type === 'folder' ? -1 : 0))

    for (const key of keys) {
      const entry = config[key]!
      switch (entry.type) {
        case 'folder':
          this.createFolder(key, entry.title)
          break
        case 'param': {
          const parts = key.split('.')
          parts.pop()
          for (const key of parts) {
            this.createFolder(key, key)
          }
          this.params[key] = entry.value
          if (parts.length === 0) {
            this.settings[key] = this.pane.addBinding(
              this.params,
              key,
              entry.opts,
            )
          }
          break
        }
      }
      console.log(key)
    }
  }

  folder(folder: string) {
    return this.settings[folder]!
  }

  createFolder(key: keyof Conf, title: string) {
    if (key in this.settings) {
      return
    }
    this.settings[key] = this.pane.addFolder({
      title,
      expanded: false,
    })
  }

  set(folder: string, name: string, value: any) {
    this.settings[folder]!.params[name] = value
    this.pane.refresh()
  }

  get(folder: string, name: string) {
    return this.settings[folder]!.params[name]
  }

  onChange<K extends Params<Conf>>(
    key: Params<Conf>,
    onChange?: (value: K) => void,
  ) {
    this.settings[key].on('change', onChange)
  }

  /** add a parameter if it did not already exist */
  // addParam<T>(
  //   key: string,
  //   folder: string,
  //   name: string,
  //   value: T,
  //   onChange?: (value: T) => void,
  //   options?: BindingParams,
  // ): Folder {
  //   // create params under a key if not exists
  //   if (!(folder in this.settings)) {
  //     this.createFolder(folder)
  //   }

  //   const p = this.settings[folder]!

  //   // add if param does not exists already
  //   if (!(name in p.params)) {
  //     p.params[name] = value
  //     const param = p.self.addBinding(p.params, name, options)

  //     if (onChange) {
  //       param.on('change', (e) => {
  //         if (typeof e.value !== 'undefined') {
  //           onChange(e.value)
  //         }
  //       })
  //     }
  //   }

  //   return p
  // }

  import(state: BladeState) {
    this.pane.importState(state)
  }

  export() {
    return this.pane.exportState()
  }

  /** create a new button, removing any older ones */
  addButton(folder: string, title: string): ButtonApi {
    if (!(folder in this.settings)) {
      this.createFolder(folder)
    }

    const f = this.settings[folder]!

    if (title in f.buttons) {
      f.buttons[title]?.dispose()
    }

    f.buttons[title] = f.self.addButton({ title })

    return f.buttons[title]!
  }

  /** update options menu based on code ran and content */
  updateRenderSettings(container: HTMLElement) {
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
              `${this.settings['Export']!.params.Name}.svg`,
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
