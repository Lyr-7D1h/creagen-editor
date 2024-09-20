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

  drawFns: Array<() => void>

  constructor() {
    this.html = document.getElementById('sandbox')! as HTMLIFrameElement

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
      console.log('asdf')
      log.info(...msg)
    }

    this.drawFns = []
    window.draw = (fn: () => void) => {
      this.drawFns.push(fn)
    }
    this.drawLoop()
  }

  /** try to run a draw loop that runs drawFns every 1/60 seconds */
  drawLoop() {
    let then = Date.now()
    const draw = () => {
      requestAnimationFrame(draw)

      const now = Date.now()
      if (now - then > 16.6) {
        this.drawFns.forEach((fn) => {
          fn()
        })
      }
      then = now
    }
    draw()
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
function draw(fn: () => void): void;`
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
