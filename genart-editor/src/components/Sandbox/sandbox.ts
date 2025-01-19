import log from '../../log'

export type LoadableObject =
  | Node
  | {
      html: () => Node
    }

export type SandboxWindow = Window & {
  load: (obj: LoadableObject) => void
  draw: (fn: (dt: number) => void) => void
  console: Console
}

export class Sandbox {
  html: HTMLIFrameElement
  /** Where js libraries are stored */
  libraries: HTMLDivElement
  /** Html element that holds code rendered by load() */
  container: HTMLDivElement

  drawFns: Array<(dt: number) => void>

  constructor(iframe: HTMLIFrameElement) {
    this.html = iframe

    const window = this.html.contentWindow! as SandboxWindow

    window.document.body.style.margin = '0'

    this.container = window.document.createElement('div')
    this.container.id = 'container'
    window.document.body.appendChild(this.container)

    this.libraries = document.createElement('div')
    this.libraries.id = 'libraries'

    window.onerror = (e) => {
      log.error(e)
    }

    // setup global functions
    window.load = (obj: LoadableObject) => {
      if ('html' in obj) {
        this.container.appendChild(obj.html())
      } else {
        this.container.appendChild(obj)
      }
    }
    window.console.log = (...msg: any[]) => {
      console.log(...msg)
      // log.info(...msg)
    }

    this.drawFns = []
    window.draw = (fn: (dt: number) => void) => {
      // if (this.settings.get('debug.fps') === undefined) {
      //   this.settings.addParam('debug.fps', 'FPS', 0, {
      //     format: (v: number) => `${v.toFixed(0)} fps`,
      //     readonly: true,
      //   })
      // }

      this.drawFns.push(fn)
    }
    this.drawLoop()
  }

  /** try to run a draw loop that runs drawFns every 1/60 seconds */
  drawLoop() {
    let t0 = (document.timeline.currentTime as number) ?? 0
    let frames = 0
    let s = 0
    const draw = (t1: DOMHighResTimeStamp) => {
      // const t1 = performance.now()
      frames += 1
      if (t1 - s >= 1000) {
        // this.settings.set('debug.fps', frames)
        s += 1000
        frames = 0
      }
      const dt = t1 - t0

      this.drawFns.forEach((fn) => {
        fn(dt)
      })
      t0 = t1
      requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw)
  }

  globalTypings(): string {
    return `
const container: HTMLElement;
type LoadableObject =
  | Node
  | {
      html: () => Node
    }
function load(obj: LoadableObject): void;
/** 
 * Call a drawing function every 1/60 seconds
 * @param fn draw callback
 * */
function draw(fn: (dt: number) => void): void;`
  }

  runScript(code: string) {
    // reset draw functions
    this.drawFns = []

    const doc = this.html.contentDocument!

    doc.getElementById('container')!.innerHTML = ''

    doc.getElementById('script')?.remove()
    const script = doc.createElement('script')
    script.type = 'module'
    script.id = 'script'

    script.innerHTML = code
    doc.body.appendChild(script)
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
