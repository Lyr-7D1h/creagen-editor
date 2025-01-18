import {
  type FolderApi,
  Pane,
  type ButtonApi,
  type BindingParams,
} from 'tweakpane'
import { generateHumanReadableName, roundToDec } from './util'
import { GENART_VERSION, GENART_EDITOR_VERSION } from './env'
import { type BindingApi, type BladeState } from '@tweakpane/core'

export interface Folder {
  type: 'folder'
  title: string
}

export interface Button {
  type: 'button'
  title: string
}

export interface Param {
  type: 'param'
  label: string
  value: any
  opts?: BindingParams
}

export type Entry = Folder | Button | Param

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
  values: Record<Params<T> | string, any>
  config: T
  private readonly params: Record<Params<T> | string, BindingApi>
  private readonly buttons: Record<Buttons<T> | string, ButtonApi>
  private folders: Record<Folders<T> | string, FolderApi>

  constructor(config: T) {
    this.config = config
    // this.html = document.getElementById('settings')!
    this.html = document.createElement('div')!
    this.pane = new Pane({ container: this.html })

    this.values = {} as Record<Params<T> | string, any>
    this.params = {} as Record<Params<T> | string, BindingApi>
    this.buttons = {} as Record<Buttons<T> | string, ButtonApi>
    this.folders = {} as Record<Folders<T> | string, FolderApi>

    const entries: Array<[string, Entry]> = Object.entries(config)
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
        case 'button': {
          this.addButton(key, entry.title)
        }
      }
    }
  }

  folder(key: Folders<T>) {
    return this.folders[key]
  }

  set(key: Params<T>, value: any) {
    if (key in this.params) {
      this.values[key] = value
      this.pane.refresh()
    }
  }

  get(key: Params<T> | string) {
    return this.values[key]
  }

  onChange(handler: () => void): void
  onChange(key: Params<T>, handler: (value: any) => void): void
  onChange(x1: Params<T> | (() => void), x2?: (value: any) => void): void {
    if (typeof x1 !== 'function') {
      this.params[x1].on('change', (e) => {
        x2!(e.value)
      })
      return
    }
    this.pane.on('change', x1)
    this.html.onclick = x1
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

    if (typeof value === 'undefined')
      throw Error("Can't give undefined value to param")
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
      for (const folder of state['children']) {
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
    state['children'] = folders

    this.pane.importState(state)
  }

  export() {
    return this.pane.exportState()
  }

  /** update options menu based on code ran and content */
  updateRenderSettings(container: HTMLElement) {
    for (const c of Array.from(container.children)) {
      switch (c.tagName.toLocaleLowerCase()) {
        case 'canvas':
          return
        case 'svg': {
          this.addFolders('export', 'Export')

          // add svg information
          const { paths, circles, rects, opts: props } = analyzeSvg(c)
          this.addParam('export.paths', 'Paths', paths, {
            readonly: true,
            format: (v) => v.toString(),
          })
          this.addParam('export.circles', 'Circles', circles, {
            readonly: true,
            format: (v) => v.toString(),
          })
          this.addParam('export.rects', 'Rects', rects, {
            readonly: true,
            format: (v) => v.toString(),
          })

          this.addParam('export.name', 'Name', generateHumanReadableName())

          this.addParam('export.optimize', 'Optimize', true)

          this.addButton('export.download', 'Download')
          this.onClick('export.download', () => {
            let svg = c.cloneNode(true) as SVGElement

            if (this.values['export.optimize']) {
              optimizeSvg(svg, props)
            }

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

interface SvgProps {
  width?: number
  height?: number
}
function optimizeSvg(html: Element, opts: SvgProps) {
  for (const c of Array.from(html.children)) {
    switch (c.tagName.toLocaleLowerCase()) {
      case 'path':
        // TODO: fix for http://localhost:5173/af438744df3a711f006203aaa39cd24e157f0f16f59ddfd6c93ea8ba00624032302e302e313a313733363532363839323337353a5b2267656e61727440302e302e35225d
        // if (optimizePath(c as SVGPathElement, opts)) {
        //   c.remove()
        // }
        break
      case 'circle':
        break
      case 'rect':
        break
    }

    optimizeSvg(c, opts)
  }
}

/**
 * Makes all coordinates fixed to two decimal
 * and removes non sensical paths.
 * Will also remove coordinates outside of svg bounds
 *
 * return `true` if should be removed
 * */
function optimizePath(el: SVGPathElement, opts: SvgProps) {
  const d = el.getAttribute('d')
  if (d === null || d.length === 0) {
    return true
  }
  const m = d.matchAll(/(\w) ?((?:[\d|\.]*(,? ?|(?<=\w)))+)/gi)
  let nd = ''
  for (const match of m) {
    const cmd = match[1]!
    const args = match[2]!
      .split(' ')
      .filter((a) => a !== ' ' && a !== '')
      .map((a) => a.replace(',', ''))
    if (args.length < 2) {
      console.warn(`Path command doesn't have enough arguments: ${match}`)
      // return true
    }
    nd += cmd
    const nargs = []
    // round numbers
    for (let i = 0; i < args.length; i += 2) {
      const x = roundToDec(Number(args[i]), 2)
      const y = roundToDec(Number(args[i + 1]), 2)
      if (
        (typeof opts.width !== 'undefined' && x > opts.width) ||
        x < 0 ||
        (typeof opts.height !== 'undefined' && y > opts.height) ||
        y < 0
      ) {
        continue
      }

      nargs.push(x)
      nargs.push(y)
    }
    nd += nargs.join(' ')
  }
  el.setAttribute('d', nd)
  return false
}

function analyzeSvg(html: Element, opts: SvgProps = {}) {
  if (html.tagName === 'svg') {
    opts = {
      height: Number(html.getAttribute('height')) ?? undefined,
      width: Number(html.getAttribute('width')) ?? undefined,
    }
  }
  let paths = 0
  let circles = 0
  let rects = 0
  for (const c of Array.from(html.children)) {
    switch (c.tagName.toLocaleLowerCase()) {
      case 'path':
        const d = c.getAttribute('d')
        if (d === null || d.length === 0) {
          console.warn('Path has no d attribute')
          // c.remove()
          continue
        }
        paths++
        break
      case 'circle':
        circles++
        break
      case 'rect':
        rects++
        break
    }

    const { paths: p, circles: ci, rects: r } = analyzeSvg(c)

    paths += p
    circles += ci
    rects += r
  }

  return { paths, circles, rects, opts }
}
