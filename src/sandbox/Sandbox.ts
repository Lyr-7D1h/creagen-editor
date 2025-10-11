import { editorEvents } from '../events/events'
import { LibraryImport } from '../importer'
import { createContextLogger } from '../logs/logger'
import { CommitHash } from '../vcs/Commit'
import {
  SandboxMessageHandler,
  SandboxMessageHandlerMode,
} from './SandboxMessageHandler'

const logger = createContextLogger('sandbox')

export class Sandbox {
  static async create() {
    const iframe = document.createElement('iframe')
    iframe.title = ''
    iframe.style.display = 'block'
    iframe.style.border = 'none'
    iframe.style.flexGrow = '1'
    iframe.style.margin = '0px'
    iframe.style.padding = '0px'
    iframe.sandbox = `allow-scripts ${CREAGEN_MODE === 'dev' ? 'allow-same-origin' : ''}`

    // Use the separate sandbox URL
    iframe.src = CREAGEN_EDITOR_SANDBOX_RUNTIME_URL

    const messageHandler = await SandboxMessageHandler.create(
      SandboxMessageHandlerMode.Parent,
      iframe,
    )
    return new Sandbox(iframe, messageHandler)
  }

  private constructor(
    private iframe: HTMLIFrameElement,
    private messageHandler: SandboxMessageHandler,
  ) {
    this.messageHandler.on('analysisResult', (event) =>
      editorEvents.emit('sandbox:analysis-complete', event),
    )
    this.messageHandler.on('error', (event) =>
      editorEvents.emit('sandbox:error', event),
    )
    this.messageHandler.on('log', (event) => {
      if (event.level === 'error') {
        logger.error(...event.data)
        return
      }
      logger[event.level](...event.data)
    })
    this.messageHandler.on('renderComplete', () => {
      logger.info('render complete')
    })
  }

  html() {
    return this.iframe
  }

  async render(code: string, libraryImports: LibraryImport[]) {
    this.messageHandler.send({
      type: 'render',
      code,
      libraries: libraryImports.map((lib) => lib.importPath),
    })

    logger.trace(
      `Loading code with '${code.length}' characters into iframe with libraries: `,
      JSON.stringify(libraryImports),
    )
  }

  async svgExport(
    svgIndex: number,
    optimize: boolean,
    head?: CommitHash,
  ): Promise<Blob | null> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe()
        reject(new Error('SVG export timeout'))
      }, 20000)

      const unsubscribe = this.messageHandler.once(
        'svgExportResponse',
        (event) => {
          clearTimeout(timeout)
          resolve(event.svg)
        },
      )

      this.messageHandler.send({
        type: 'svgExportRequest',
        svgIndex,
        optimize,
        head: head ? head.toHex() : undefined,
      })
    })
  }
}
