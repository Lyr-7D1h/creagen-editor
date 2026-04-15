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

function getMessageType(data: unknown): unknown {
  if (data === null || typeof data !== 'object' || !('type' in data)) {
    return undefined
  }
  return (data as { type: unknown }).type
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
  ): Promise<SandboxMessageHandler>
  static async create(
    mode: SandboxMessageHandlerMode.Iframe,
  ): Promise<SandboxMessageHandler>
  static async create(
    mode: SandboxMessageHandlerMode,
    iframe?: HTMLIFrameElement,
  ) {
    switch (mode) {
      case SandboxMessageHandlerMode.Parent: {
        const channel = new MessageChannel()
        await waitForMessage(
          (event) =>
            event.source === iframe?.contentWindow &&
            getMessageType(event.data) === '__runtime_ready__',
          'Sandbox parent handshake timeout',
        )

        const targetWindow = iframe?.contentWindow
        if (!targetWindow) {
          throw new Error(
            'Sandbox parent handshake failed: iframe contentWindow unavailable',
          )
        }

        targetWindow.postMessage(
          { type: '__init__', constants: { creagenEditorVersion: '' } },
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

        window.parent.postMessage({ type: '__runtime_ready__' }, '*')

        const initMessage = await waitForMessage(
          (event) =>
            getMessageType(event.data) === '__init__' &&
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
    this.port.onmessage = (msg: MessageEvent) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = msg.data
      if (isSandboxMessage(data)) {
        const handlers = this.listeners.get(data.type)
        if (handlers) {
          handlers.forEach((handler) => handler(data))
        }
      }
    }
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
