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
  private parent: HTMLElement | null = null
  private nextSibling: Node | null = null
  private messageHandler?: SandboxMessageHandler
  isFrozen = false

  static create() {
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

    return new Sandbox(iframe)
  }

  private constructor(private readonly iframe: HTMLIFrameElement) {
    this.setupMessageHandlers()
  }

  /**
   * Set up message handler event listeners
   * This is extracted to a separate method so it can be called after unfreezing
   */
  private setupMessageHandlers() {
    if (!this.messageHandler) return
    this.messageHandler.on('analysisResult', (event) =>
      editorEvents.emit('sandbox:analysis-complete', event),
    )
    this.messageHandler.on('error', (event) =>
      editorEvents.emit('sandbox:error', event),
    )
    this.messageHandler.on('log', (event) => {
      const args: unknown[] = Array.isArray(event.data)
        ? event.data
        : [event.data]
      if (event.level === 'error') {
        logger.error(...args)
        return
      }
      logger[event.level](...args)
    })
    this.messageHandler.on('renderComplete', () => {
      editorEvents.emit('sandbox:render-complete', undefined)
    })
  }

  async connectMessageHandler() {
    this.messageHandler = await SandboxMessageHandler.create(
      SandboxMessageHandlerMode.Parent,
      this.iframe,
    )
    this.setupMessageHandlers()
    logger.info('Message handler reconnected')
  }

  html() {
    return this.iframe
  }

  async render(code: string, libraryImports: LibraryImport[]) {
    if (!this.messageHandler) return
    editorEvents.emit('sandbox:render', undefined)
    if (this.isFrozen) await this.unfreeze()
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

  /**
   * Freeze the iframe by removing it from the DOM.
   * This stops all JavaScript execution and resource usage.
   */
  freeze() {
    if (this.isFrozen) {
      logger.warn('Sandbox already frozen')
      return
    }

    // Store the iframe's position in the DOM
    this.parent = this.iframe.parentElement
    this.nextSibling = this.iframe.nextSibling

    // Remove from DOM to stop all execution
    if (this.parent) {
      this.parent.removeChild(this.iframe)
      this.isFrozen = true
      logger.info('Sandbox frozen (removed from DOM)')
    } else {
      logger.error('Cannot freeze: iframe has no parent element')
    }
    editorEvents.emit('sandbox:freeze', undefined)
  }

  /**
   * Unfreeze the iframe by restoring it to the DOM.
   * This resumes JavaScript execution.
   */
  async unfreeze() {
    if (!this.isFrozen) {
      logger.warn('Sandbox not frozen')
      return
    }

    // Restore iframe to its original position
    if (this.parent) {
      if (this.nextSibling) {
        this.parent.insertBefore(this.iframe, this.nextSibling)
      } else {
        this.parent.appendChild(this.iframe)
      }
      this.isFrozen = false
    } else {
      logger.error('Cannot unfreeze: parent element reference lost')
      return
    }

    await this.connectMessageHandler()

    editorEvents.emit('sandbox:unfreeze', undefined)
  }

  async svgExport(
    svgIndex: number,
    optimize: boolean,
    head?: CommitHash,
  ): Promise<Blob | null> {
    return new Promise((resolve, reject) => {
      if (!this.messageHandler) return
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
