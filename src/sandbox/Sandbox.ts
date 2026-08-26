import type { CommitHash } from 'versie'
import { editorEvents } from '../events/events'
import type { LibraryImport } from '../importer'
import { createContextLogger } from '../logs/logger'
import type { Settings } from '../settings/Settings'
import { SandboxLog } from './SandboxLog'
import {
  SANDBOX_MESSAGE_HANDLER_HANDSHAKE_TIMEOUT_MS,
  SandboxMessageHandler,
  SandboxMessageHandlerMode,
} from './SandboxMessageHandler'

const logger = createContextLogger('sandbox')

export class Sandbox {
  private parent: HTMLElement | null = null
  private nextSibling: Node | null = null
  private messageHandler?: SandboxMessageHandler
  log: SandboxLog
  isFrozen = false

  static create(settings: Settings, url: string, allowSameOrigin = false) {
    const iframe = document.createElement('iframe')
    iframe.title = ''
    iframe.style.display = 'block'
    iframe.style.border = 'none'
    iframe.style.flexGrow = '1'
    iframe.style.margin = '0px'
    iframe.style.padding = '0px'
    iframe.sandbox = `allow-scripts ${allowSameOrigin ? 'allow-same-origin' : ''}`

    // Use the separate sandbox URL
    iframe.src = url

    return new Sandbox(settings, iframe)
  }

  private constructor(
    private readonly settings: Settings,
    private readonly iframe: HTMLIFrameElement,
  ) {
    this.log = new SandboxLog(settings.get('console.buffer_size'))
    settings.on('console.buffer_size', (size) => {
      this.log.resize(size)
    })
    settings.on('sandbox.coordinates', (enabled) => {
      this.messageHandler?.send({ type: 'setMouseTracking', enabled })
    })
  }

  /** Wait for message handler connection if not already connected */
  ensureConnection(): Promise<SandboxMessageHandler> {
    if (typeof this.messageHandler !== 'undefined')
      return Promise.resolve(this.messageHandler)

    return new Promise((res, rej) => {
      const timer = setTimeout(() => {
        unsub()
        rej(new Error('Sandbox connection timeout'))
      }, SANDBOX_MESSAGE_HANDLER_HANDSHAKE_TIMEOUT_MS)

      const unsub = editorEvents.on(
        'sandbox:connect',
        () => {
          clearTimeout(timer)
          if (typeof this.messageHandler === 'undefined')
            return rej(
              new Error(
                'Sandbox Message Handler still not defined after connection',
              ),
            )
          res(this.messageHandler)
        },
        { once: true },
      )
    })
  }

  /**
   * Set up message handler event listeners
   * This is extracted to a separate method so it can be called after unfreezing
   */
  private setupMessageHandlers() {
    if (!this.messageHandler) return
    this.messageHandler.setupListeners((handler) => {
      handler.on('analysisResult', (event) =>
        editorEvents.emit('sandbox:analysis-complete', event),
      )
      handler.on('error', (event) => {
        event.error.name = 'Uncaught error'
        console.error(event.error)
        this.log.addLog('uncaught', event.error)
        editorEvents.emit('sandbox:error', event)
      })
      handler.on('log', (event) => {
        const args: unknown[] = Array.isArray(event.data)
          ? event.data
          : [event.data]
        // eslint-disable-next-line no-console
        if (CREAGEN_MODE === 'dev') console.debug(...args)
        this.log.addLog(event.level, ...args)
      })
      handler.on('renderComplete', () => {
        editorEvents.emit('sandbox:render-complete', undefined)
      })
      handler.on('mouseMove', (event) => {
        editorEvents.emit('sandbox:mouse-move', { x: event.x, y: event.y })
      })
    })
  }

  async connectMessageHandler() {
    this.messageHandler = await SandboxMessageHandler.create(
      SandboxMessageHandlerMode.Parent,
      this.iframe,
    )
    editorEvents.emit('sandbox:connect', undefined)
    this.setupMessageHandlers()
    // Sync current tracking preference on (re)connect
    this.messageHandler.send({
      type: 'setMouseTracking',
      enabled: this.settings.get('sandbox.coordinates'),
    })
    logger.info('Message handler (re)connected')
  }

  html() {
    return this.iframe
  }

  async render(code: string, libraryImports: LibraryImport[]) {
    // wait for sandbox to be connected before sending anything
    const messageHandler = await this.ensureConnection()

    this.log.reset()
    editorEvents.emit('sandbox:render', undefined)
    if (this.isFrozen) await this.unfreeze()
    messageHandler.send({
      type: 'render',
      code,
      preloadedLibraries: libraryImports.map(
        ({ typings: _typings, ...lib }) => [
          lib.name + lib.version.toString(),
          lib.preload ?? [],
        ],
      ),
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
    const messageHandler = await this.ensureConnection()
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe()
        reject(new Error('SVG export timeout'))
      }, 20000)

      const unsubscribe = messageHandler.once('svgExportResponse', (event) => {
        clearTimeout(timeout)
        resolve(event.svg)
      })

      messageHandler.send({
        type: 'svgExportRequest',
        svgIndex,
        optimize,
        head: head ? head.toHex() : undefined,
      })
    })
  }
}
