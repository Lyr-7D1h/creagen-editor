import { LibraryImport } from '../../importer'
import log from '../../log'

export type SandboxWindow = Window & {
  console: Console
}

export class Sandbox {
  html: HTMLIFrameElement
  /** Html element that holds code rendered by load() */
  container: HTMLDivElement

  libraries: LibraryImport[] = []

  // drawFns: Array<(dt: number) => void>

  constructor(iframe: HTMLIFrameElement) {
    this.html = iframe

    const window = this.html.contentWindow! as SandboxWindow

    window.document.body.style.margin = '0'

    this.container = window.document.createElement('div')
    this.container.id = 'canvas-container'
    window.document.body.appendChild(this.container)

    window.onerror = (e) => {
      log.error(e)
    }

    window.console.log = (...msg: any[]) => {
      console.log(...msg)
    }
  }

  addLibrary(library: LibraryImport) {
    if (this.libraries.find((lib) => lib.name === library.name)) {
      console.warn(`Library ${library.name} already loaded`)
      return
    }

    console.log(
      `Sandbox: loading ${library.name}@${library.version} at ${library.importPath.path}`,
    )
    this.libraries.push(library)
    const document =
      this.html.contentDocument || this.html.contentWindow!.document
    const script = document.createElement('script')
    script.src = library.importPath.path
    script.type = 'module'
    script.onerror = log.error
    script.onload = () => {
      console.log(`Sandbox: loaded ${library.name}@${library.version}`)
    }
    document.head.appendChild(script)
  }

  reloadLibraries() {
    console.log('Sandbox: reloading libraries')
    const libraries = [...this.libraries]
    this.clearLibraries()
    libraries.forEach((lib) => {
      this.addLibrary(lib)
    })
  }

  clearLibraries() {
    const document =
      this.html.contentDocument || this.html.contentWindow!.document
    document.head.innerHTML = ''
    this.libraries = []
  }

  globalTypings(): string {
    return ''
  }

  run(code: string, libraries: LibraryImport[] = []) {
    this.clearLibraries()
    libraries.forEach((lib) => {
      this.addLibrary(lib)
    })
    this.runScript(code)
  }

  runScript(code: string) {
    console.log('Running script\n', code)
    // reset draw functions
    // this.drawFns = []

    const document =
      this.html.contentDocument || this.html.contentWindow!.document

    document.getElementById('canvas-container')!.innerHTML = ''

    const oldScript = document.getElementById('script')
    if (oldScript) oldScript.remove()
    const script = document.createElement('script')
    script.onerror = log.error
    script.type = 'module'
    script.id = 'script'
    script.textContent = code
    document.body.appendChild(script)
  }

  analyzeContainer(): AnalyzeContainerResult {
    const result: AnalyzeContainerResult = { svgs: [] }
    for (const c of Array.from(this.container.children)) {
      switch (c.tagName.toLocaleLowerCase()) {
        case 'svg': {
          // add svg information
          result.svgs.push({
            svg: c as SVGElement,
            ...analyzeSvg(c),
          })
        }
      }
    }
    return result
  }
}

export interface AnalyzeContainerResult {
  svgs: (SvgProps & { svg: SVGElement })[]
}

export interface SvgProps {
  width?: number
  height?: number
  paths: number
  circles: number
  rects: number
}
function analyzeSvg(html: Element): SvgProps {
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

  if (html.tagName === 'svg') {
    const height = Number(html.getAttribute('height')) ?? undefined
    const width = Number(html.getAttribute('width')) ?? undefined
    return { paths, circles, rects, width, height }
  }

  return { paths, circles, rects }
}
