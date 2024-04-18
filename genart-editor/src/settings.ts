import {
  type FolderApi,
  Pane,
  type ButtonApi,
  type BindingParams,
} from 'tweakpane'
import { generateHumanReadableName } from './util'
import { GENART_VERSION, GENART_EDITOR_VERSION } from '../constants'
import { type BindingApi, type BladeState } from '@tweakpane/core'

export interface Folder {
  type: 'folder'
  title: string
}

export interface Button {
  type: 'button'
  label: string
}

export interface Param {
  type: 'param'
  label: string
  value: any
  opts?: BindingParams
}

type Generic<T> = {
  [K in keyof T]: K extends 'type' ? string : T[K]
}

type GenericSettingsConfig = Record<
  string,
  Generic<Param> | Generic<Folder> | Generic<Button>
>

export type SettingsConfig<T extends GenericSettingsConfig> = {
  [K in keyof T]: T[K] extends { value: any }
    ? Param
    : T[K] extends { label: string }
      ? Button
      : Folder
}

export type Params<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Param ? K : never
}[keyof T]
export type Folders<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Folder ? K : never
}[keyof T]
export type Buttons<T extends SettingsConfig<T>> = {
  [K in keyof T]: T[K] extends Button ? K : never
}[keyof T]

export class Settings<T extends SettingsConfig<T>> {
  private readonly html: HTMLElement
  private readonly pane: Pane
  private values: Record<Params<T> | string, any>
  private readonly params: Record<Params<T> | string, BindingApi>
  private folders: Record<Folders<T> | string, FolderApi>
  private readonly buttons: Record<Buttons<T> | string, ButtonApi>

  constructor(config: T) {
    this.html = document.getElementById('settings')!
    this.pane = new Pane({ container: this.html })

    this.values = {}
    this.params = {}
    this.buttons = {}
    this.folders = {}

    const entries: Array<[string, Param | Folder]> = Object.entries(config)
    entries.sort(([k, v]) => (v.type === 'folder' ? -k.split('.').length : 0))

    for (const [key, entry] of entries) {
      switch (entry.type) {
        case 'folder':
          this.addFolders(key, entry.title)
          break
        case 'param': {
          this.addParam(key, entry.label, entry.value, entry.opts)
          break
        }
      }
    }
  }

  folder(key: Folders<T>) {
    return this.folders[key]
  }

  set(key: Params<T>, value: any) {
    this.values[key] = value
    this.pane.refresh()
  }

  get(key: Params<T>) {
    return this.values[key]
  }

  onChange(handler: () => void): void
  onChange(key: Params<T>, handler: (value: any) => void): void
  onChange(
    key: Params<T> | (() => void),
    handler?: (value: any) => void,
  ): void {
    if (typeof key !== 'function') {
      this.params[key].on('change', (e) => {
        handler!(e.value)
      })
      return
    }
    this.pane.on('change', () => {
      key()
    })
  }

  onClick(key: Buttons<T> | string, handler: () => void) {
    this.buttons[key].on('click', () => {
      handler()
    })
  }

  /** create folders recursively */
  addFolders(key: string, title?: string) {
    if (key in this.folders) {
      return
    }

    const parts = key.split('.')
    const lastFolderIndex = parts.pop()!
    const prev = []
    for (const p of parts) {
      prev.push(p)
      const key = prev.join('.')
      this.addFolders(key, key)
    }

    this.folders[key] = this.pane.addFolder({
      title: title ?? lastFolderIndex,
      expanded: false,
    })
  }

  /** add a parameter if it did not already exist */
  addParam<T>(key: string, label: string, value: T, opts?: BindingParams) {
    if (key in this.params) return

    const parts = key.split('.')
    parts.pop()
    const folder = parts.join('.')
    this.addFolders(folder, folder)

    this.values[key] = value
    this.params[key] = this.folders[folder]!.addBinding(this.values, key, {
      label,
      ...opts,
    })
  }

  /** create a new button, removing any older ones */
  addButton(key: string, title: string) {
    const parts = key.split('.')
    parts.pop()
    const folder = parts.join('.')
    this.addFolders(folder, folder)

    if (key in this.buttons) {
      this.buttons[key]?.dispose()
    }

    this.buttons[key] = this.folders[folder]!.addButton({ title })
  }

  import(state: BladeState) {
    // filter out settings that don't exist or got changed
    const folders = []
    if ('children' in state && Array.isArray(state['children'])) {
      for (const folder of state.children) {
        if (
          typeof Object.values(this.folders).find(
            (f) => f.title === folder.title,
          ) !== 'undefined'
        ) {
          const items = []
          for (const item of folder.children) {
            if ('binding' in item) {
              const { key, value } = item.binding
              if (
                typeof this.values[key] === typeof value &&
                typeof key !== 'undefined'
              ) {
                items.push(item)
              }
            }
          }
          folder.children = items
          folders.push(folder)
        }
      }
    }
    state.children = folders

    this.pane.importState(state)
  }

  export() {
    return this.pane.exportState()
  }

  /** update options menu based on code ran and content */
  updateRenderSettings(container: HTMLElement) {
    for (const c of Array.from(container.children)) {
      switch (c.tagName.toUpperCase()) {
        case 'CANVAS':
          return
        case 'SVG': {
          this.addFolders('export', 'Export')
          this.addParam('export.name', 'Name', generateHumanReadableName())

          this.addButton('export.download', 'Download')
          this.onClick('export.download', () => {
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
            a.setAttribute('download', `${this.values['export.name']}.svg`)
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
