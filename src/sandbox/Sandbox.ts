import sandboxCode from '../../gen/sandbox'
import { CREAGEN_EDITOR_VERSION, MODE } from '../env'
import { editorEvents } from '../events/events'
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
      result: AnalyzeContainerResult
    }
  | {
      type: 'error'
      error: Error
    }
  | {
      type: 'svgExportResponse'
      data: string | null
    }
  /** Sent by Sandbox */
  | {
      type: 'init'
      constants: {
        creagenEditorVersion: string
      }
    }
  | {
      type: 'svgExportRequest'
      svgIndex: number
      optimize: boolean
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

export class Sandbox {
  iframe: HTMLIFrameElement

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
        switch (sandboxEvent.type) {
          case 'analysisResult':
            editorEvents.emit('sandbox:analysis-complete', sandboxEvent)
            break
          case 'error':
            editorEvents.emit('sandbox:error', sandboxEvent)
            throw sandboxEvent.error
          case 'log':
            if (sandboxEvent.level === 'error') {
              logger.error(...sandboxEvent.data)
              return
            }
            console[sandboxEvent.level](...sandboxEvent.data)
            break
          case 'loaded':
            editorEvents.emit('sandbox:loaded', undefined)
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
    editorEvents.emit('sandbox:render-complete', undefined)
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
