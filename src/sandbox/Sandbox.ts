import sandboxCode from '../../gen/sandbox'
import { CREAGEN_EDITOR_VERSION, MODE } from '../env'
import { LibraryImport } from '../importer'
import { logger } from '../logs/logger'

export type SandboxEvent =
  | {
      type: 'log'
      level: 'debug' | 'info' | 'warn' | 'error'
      data: any[]
    }
  | {
      type: 'loaded'
    }
  | {
      type: 'analysisResult'
      analysisResult: AnalyzeContainerResult
    }
  | {
      type: 'error'
      error: Error
    }
  | {
      type: 'svgExportRequest'
      svgIndex: number
      optimize: boolean
    }
  | {
      type: 'svgExportResponse'
      data: string | null
    }
  | {
      type: 'init'
      constants: {
        creagenEditorVersion: string
      }
    }

export interface AnalyzeContainerResult {
  svgs: SvgProps[]
}

export interface SvgProps {
  width?: number
  height?: number
  paths: number
  circles: number
  rects: number
}

function isSandboxEvent(event: any): event is SandboxEvent {
  return event && typeof event.type === 'string'
}

type EventListener<T extends SandboxEvent> = (event: T) => void

export class Sandbox {
  iframe: HTMLIFrameElement
  private eventListeners: {
    [K in SandboxEvent['type']]?: EventListener<any>[]
  } = {}

  constructor() {
    this.iframe = document.createElement('iframe')
    this.iframe.title = ''
    this.iframe.style.width = '100%'
    this.iframe.style.height = '100%'
    this.iframe.style.border = 'none'
    this.iframe.sandbox = `allow-scripts ${MODE === 'dev' ? 'allow-same-origin' : ''}`
    this.setup()
  }

  html() {
    return this.iframe
  }

  setup() {
    window.addEventListener('message', (event) => {
      const sandboxEvent = event.data
      if (isSandboxEvent(sandboxEvent)) {
        this.dispatchEvent(sandboxEvent)
        switch (sandboxEvent.type) {
          case 'error':
            throw sandboxEvent.error
          case 'log':
            if (sandboxEvent.level === 'error') {
              logger.error(...sandboxEvent.data)
              return
            }
            console[sandboxEvent.level](...sandboxEvent.data)
            break
          case 'loaded':
            this.sendMessage({
              type: 'init',
              constants: {
                creagenEditorVersion: CREAGEN_EDITOR_VERSION.toString(),
              },
            })
            break
        }
      }
    })
  }

  addEventListener<T extends SandboxEvent['type']>(
    eventType: T,
    listener: EventListener<Extract<SandboxEvent, { type: T }>>,
  ) {
    if (!this.eventListeners[eventType]) {
      this.eventListeners[eventType] = []
    }
    this.eventListeners[eventType]!.push(listener)
  }

  removeEventListener<T extends SandboxEvent['type']>(
    eventType: T,
    listener: EventListener<Extract<SandboxEvent, { type: T }>>,
  ) {
    if (!this.eventListeners[eventType]) return
    this.eventListeners[eventType] = this.eventListeners[eventType]!.filter(
      (l) => l !== listener,
    )
  }

  private dispatchEvent(event: SandboxEvent) {
    const listeners = this.eventListeners[event.type] || []
    for (const listener of listeners) {
      listener(event)
    }
  }

  render(code: string, libraryImports: LibraryImport[]) {
    const html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${libraryImports
          .filter((lib) => lib.importPath.type !== 'module')
          .map((lib) => `<script src="${lib.importPath.path}"></script>`)}
      </head>
      <body style="margin: 0;">
        <script type="module">${sandboxCode}</script>
        <script type="module">${code}</script>
      </body>
    </html>
    `

    const blob = new Blob([html], { type: 'text/html' })
    const blobURL = URL.createObjectURL(blob)

    // Update iframe source
    this.iframe.src = blobURL
    console.log(
      `[Sandbox] Loading code with '${code.length}' characters into iframe with libraries: `,
      JSON.stringify(libraryImports),
    )
  }

  sendMessage(message: SandboxEvent) {
    this.iframe.contentWindow!.postMessage(message, '*')
  }

  async svgExport(svgIndex: number): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.sendMessage({
        type: 'svgExportRequest',
        svgIndex,
        optimize: true,
      })

      const listener = (event: MessageEvent) => {
        if (isSandboxEvent(event.data)) {
          if (event.data.type === 'svgExportResponse') {
            window.removeEventListener('message', listener)
            resolve(event.data.data)
          }
        }
      }

      window.addEventListener('message', listener)

      setTimeout(() => {
        window.removeEventListener('message', listener)
        reject(new Error('Timeout'))
      }, 5000)
    })
  }
}
