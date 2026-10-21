import type { ImportPath } from '../importer'

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

type SandboxMessageDefinitions =
  | {
      type: 'log'
      msg: {
        level: 'debug' | 'info' | 'warn' | 'error'
        data: unknown
      }
    }
  | {
      type: 'analysisResult'
      msg: {
        result: AnalyzeContainerResult
      }
    }
  | {
      type: 'error'
      msg: {
        error: Error
      }
    }
  | {
      type: 'svgExportResponse'
      msg: {
        svg: Blob
      }
    }
  | { type: 'renderComplete' }
  | {
      type: 'mouseMove'
      msg: {
        x: number
        y: number
      }
    }
  /** Sent by Parent to enable/disable mouse coordinate forwarding */
  | {
      type: 'setMouseTracking'
      msg: {
        enabled: boolean
      }
    }
  /** Sent by Sandbox */
  | {
      type: 'svgExportRequest'
      msg: {
        /** Commit hash */
        head?: string
        svgIndex: number
        optimize: boolean
      }
    }
  | {
      type: 'render'
      msg: {
        code: string
        /** [identifier, import] */
        preloadedLibraries: [string, ImportPath[]][]
      }
    }

export type SandboxMessage = SandboxMessageDefinitions extends infer T
  ? T extends { type: infer Type; msg: infer Msg }
    ? { type: Type } & Msg
    : T extends { type: infer Type }
      ? { type: Type }
      : never
  : never

type SandboxMessageType = SandboxMessageDefinitions['type']

export type SandboxMessageByType<T extends SandboxMessageType> = Extract<
  SandboxMessage,
  { type: T }
>

export type ExtractTransferables<T extends SandboxMessageType> =
  Extract<SandboxMessageDefinitions, { type: T }> extends {
    transferables?: infer U
  }
    ? U extends Transferable[]
      ? U
      : never
    : never

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isSandboxMessage(msg: any): msg is SandboxMessage {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return Boolean(msg) && 'type' in msg && typeof msg.type === 'string'
}

export enum SandboxMessageHandlerMode {
  Parent,
  Iframe,
}

export const SANDBOX_MESSAGE_HANDLER_HANDSHAKE_TIMEOUT_MS = 5000

export const SANDBOX_HANDSHAKE_NONCE_PARAM = 'nonce'

/**
 * Fresh random value binding a single parent <-> runtime handshake.
 * The parent stamps it into the runtime URL before loading the iframe; a page
 * the sandboxed code navigated the iframe to cannot know it.
 */
export function createHandshakeNonce(): string {
  if (typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }
  // Secure-context fallbacks for older engines (e.g. plain http dev hosts).
  if (typeof window.crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    window.crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Runtime URL with the handshake nonce appended as a query parameter */
export function withHandshakeNonce(runtimeUrl: string, nonce: string): string {
  const url = new URL(runtimeUrl, window.location.origin)
  url.searchParams.set(SANDBOX_HANDSHAKE_NONCE_PARAM, nonce)
  return url.toString()
}

/** Nonce the parent stamped into this document's URL (runtime side) */
function getHandshakeNonceFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(
    SANDBOX_HANDSHAKE_NONCE_PARAM,
  )
}

function getMessageType(data: unknown): unknown {
  if (data === null || typeof data !== 'object' || !('type' in data)) {
    return undefined
  }
  return (data as { type: unknown }).type
}

function getMessageNonce(data: unknown): unknown {
  if (data === null || typeof data !== 'object' || !('nonce' in data)) {
    return undefined
  }
  return (data as { nonce: unknown }).nonce
}

function waitForMessage(
  shouldResolve: (event: MessageEvent) => boolean,
  timeoutMessage: string,
): Promise<MessageEvent> {
  return new Promise((resolve, reject) => {
    let settled = false

    const finish = (cb: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      window.removeEventListener('message', listener)
      cb()
    }

    const listener = (event: MessageEvent) => {
      if (!shouldResolve(event)) return
      finish(() => resolve(event))
    }

    const timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error(timeoutMessage)))
    }, SANDBOX_MESSAGE_HANDLER_HANDSHAKE_TIMEOUT_MS)

    window.addEventListener('message', listener)
  })
}

/** Sandbox message handler, run in an iframe or normal browser window */
export class SandboxMessageHandler {
  static async create(
    mode: SandboxMessageHandlerMode.Parent,
    iframe: HTMLIFrameElement,
    nonce: string,
  ): Promise<SandboxMessageHandler>
  static async create(
    mode: SandboxMessageHandlerMode.Iframe,
  ): Promise<SandboxMessageHandler>
  static async create(
    mode: SandboxMessageHandlerMode,
    iframe?: HTMLIFrameElement,
    nonce?: string,
  ) {
    switch (mode) {
      case SandboxMessageHandlerMode.Parent: {
        const channel = new MessageChannel()
        await waitForMessage(
          (event) =>
            event.source === iframe?.contentWindow &&
            getMessageType(event.data) === '__runtime_ready__' &&
            getMessageNonce(event.data) === nonce,
          'Sandbox parent handshake timeout',
        )

        const targetWindow = iframe?.contentWindow
        if (!targetWindow) {
          throw new Error(
            'Sandbox parent handshake failed: iframe contentWindow unavailable',
          )
        }

        targetWindow.postMessage(
          {
            type: '__init__',
            nonce,
            constants: { creagenEditorVersion: '' },
          },
          '*',
          [channel.port2],
        )

        return new SandboxMessageHandler(channel.port1)
      }
      case SandboxMessageHandlerMode.Iframe: {
        if (window.parent === window) {
          throw new Error(
            'Sandbox iframe handshake failed: no parent window available',
          )
        }

        const expectedNonce = getHandshakeNonceFromUrl()
        window.parent.postMessage(
          { type: '__runtime_ready__', nonce: expectedNonce },
          '*',
        )

        const initMessage = await waitForMessage(
          (event) =>
            event.source === window.parent &&
            getMessageType(event.data) === '__init__' &&
            getMessageNonce(event.data) === expectedNonce &&
            Boolean(event.ports[0]),
          'Sandbox iframe handshake timeout',
        )

        const port = initMessage.ports[0]
        if (!port) {
          throw new Error(
            'Sandbox iframe handshake failed: missing message port',
          )
        }

        return new SandboxMessageHandler(port)
      }
    }
  }

  constructor(
    private readonly port: MessagePort,
    private readonly listeners: Map<
      SandboxMessageType,
      Set<(msg: SandboxMessage) => void>
    > = new Map(),
  ) {
    // Use addEventListener so the port does not auto-start; call
    // `setupListeners()` to register handlers before messages are delivered.
    // using addEventListener will queue up all messages sent until port is started
    this.port.addEventListener('message', (msg: MessageEvent) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = msg.data
      if (isSandboxMessage(data)) {
        const handlers = this.listeners.get(data.type)
        if (handlers) {
          handlers.forEach((handler) => handler(data))
        }
      }
    })
  }

  /**
   * Register all listeners via `fn`, then start the port.
   * This guarantees every listener is in place before any message is delivered.
   */
  setupListeners(fn: (handler: this) => void): void {
    fn(this)
    this.port.start()
  }

  /**
   * Send a message through the channel.
   * If the message has a `transferables` property, those objects will be transferred.
   * @param msg The message to send
   * @param transferables Optional additional transferable objects not in the message
   */
  send<T extends SandboxMessageType>(
    msg: SandboxMessageByType<T>,
    transferables?: ExtractTransferables<T>,
  ) {
    this.port.postMessage(msg, transferables)
  }

  on<T extends SandboxMessageType>(
    type: T,
    handler: (msg: SandboxMessageByType<T>) => void,
  ): () => void
  on<T extends SandboxMessageType>(
    types: T[],
    handler: (msg: SandboxMessageByType<T>) => void,
  ): () => void
  on<T extends SandboxMessageType>(
    typeOrTypes: T | T[],
    handler: (msg: SandboxMessageByType<T>) => void,
  ): () => void {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes]

    types.forEach((type) => {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, new Set())
      }
      this.listeners.get(type)!.add(handler as (msg: SandboxMessage) => void)
    })

    // Return unsubscribe function that removes from all types
    return () => {
      types.forEach((type) => {
        const handlers = this.listeners.get(type)
        if (handlers) {
          handlers.delete(handler as (msg: SandboxMessage) => void)
          if (handlers.size === 0) {
            this.listeners.delete(type)
          }
        }
      })
    }
  }

  off<T extends SandboxMessageType>(
    type: T,
    handler: (msg: SandboxMessageByType<T>) => void,
  ): void
  off<T extends SandboxMessageType>(
    types: T[],
    handler: (msg: SandboxMessageByType<T>) => void,
  ): void
  off<T extends SandboxMessageType>(
    typeOrTypes: T | T[],
    handler: (msg: SandboxMessageByType<T>) => void,
  ): void {
    const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes]

    types.forEach((type) => {
      const handlers = this.listeners.get(type)
      if (handlers) {
        handlers.delete(handler as (msg: SandboxMessage) => void)
        if (handlers.size === 0) {
          this.listeners.delete(type)
        }
      }
    })
  }

  once<T extends SandboxMessageType>(
    type: T,
    handler: (msg: SandboxMessageByType<T>) => void,
  ): () => void
  once<T extends SandboxMessageType>(
    types: T[],
    handler: (msg: SandboxMessageByType<T>) => void,
  ): () => void
  once<T extends SandboxMessageType>(
    typeOrTypes: T | T[],
    handler: (msg: SandboxMessageByType<T>) => void,
  ): () => void {
    const wrappedHandler = (msg: SandboxMessageByType<T>) => {
      handler(msg)
      this.off(typeOrTypes as T[], wrappedHandler)
    }

    return this.on(typeOrTypes as T[], wrappedHandler)
  }

  onAny(handler: (msg: SandboxMessage) => void) {
    this.port.onmessage = (msg: MessageEvent) => {
      if (isSandboxMessage(msg.data)) {
        handler(msg.data)
      }
    }
  }

  removeAllListeners(type?: SandboxMessageType): void {
    if (type) {
      this.listeners.delete(type)
    } else {
      this.listeners.clear()
    }
  }
}
