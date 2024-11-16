import { GeneratorSettings } from './generator'
import log from './log'

export type LoadableObject =
  | Node
  | {
      html: () => Node
    }

export class Sandbox {
  html: HTMLIFrameElement
  /** Where js libraries are stored */
  libraries: HTMLDivElement
  /** Html element that holds code rendered by load() */
  container: HTMLDivElement

  settings: GeneratorSettings

  drawFns: Array<(dt: number) => void>

  constructor(settings: GeneratorSettings) {
    this.html = document.getElementById('sandbox')! as HTMLIFrameElement
    this.settings = settings

    const window = this.html.contentWindow!

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
      console.log(this.settings.get('debug.fps'))
      if (this.settings.get('debug.fps') === undefined) {
        this.settings.addParam('debug.fps', 'FPS', 0, {
          format: (v: number) => `${v.toFixed(0)} fps`,
          readonly: true,
        })
      }

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
        this.settings.set('debug.fps', frames)
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
}
