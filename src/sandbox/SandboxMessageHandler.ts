import { ImportPath } from '../importer'

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
      type: '__init__'
    }
  | {
      type: 'log'
      msg: {
        level: 'debug' | 'info' | 'warn' | 'error'
        data: any
      }
    }
  | {
      type: 'loaded'
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
      type: 'init'
      msg: {
        constants: {
          creagenEditorVersion: string
        }
      }
    }
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
        libraries: ImportPath[]
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

export function isSandboxMessage(msg: any): msg is SandboxMessage {
  return msg && typeof msg.type === 'string'
}

export enum SandboxMessageHandlerMode {
  Parent,
  Iframe,
}
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
      case SandboxMessageHandlerMode.Parent:
        const channel = new MessageChannel()

        function initListener() {
          let window = iframe?.contentWindow!
          // Must send an object message, not a plain string
          window.postMessage(
            { type: '__init__', constants: { creagenEditorVersion: '' } },
            '*',
            [channel.port2],
          )
          iframe?.removeEventListener('load', initListener)
        }

        if (iframe!.contentWindow) {
          initListener()
        } else {
          iframe?.addEventListener('load', initListener)
        }

        return new SandboxMessageHandler(channel.port1)
      case SandboxMessageHandlerMode.Iframe:
        return new Promise((res) => {
          window.addEventListener('message', (msg) => {
            if (isSandboxMessage(msg.data)) {
              if (msg.data.type === '__init__' && msg.ports[0]) {
                res(new SandboxMessageHandler(msg.ports[0]))
              }
            }
          })
        })
    }
  }

  constructor(
    private port: MessagePort,
    private listeners: Map<
      SandboxMessageType,
      Set<(msg: SandboxMessageDefinitions) => void>
    > = new Map(),
  ) {
    this.port.onmessage = (msg: MessageEvent) => {
      if (isSandboxMessage(msg.data)) {
        const handlers = this.listeners.get(msg.data.type)
        if (handlers) {
          handlers.forEach((handler) => handler(msg.data))
        }
      }
    }
  }

  /**
   * Wait for the handler to be ready (useful in iframe mode)
   */
  waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.port) {
          resolve()
        } else {
          setTimeout(checkReady, 10)
        }
      }
      checkReady()
    })
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
    if (!this.port) {
      console.warn('No port initialized')
      return
    }

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
      this.listeners
        .get(type)!
        .add(handler as (msg: SandboxMessageDefinitions) => void)
    })

    // Return unsubscribe function that removes from all types
    return () => {
      types.forEach((type) => {
        const handlers = this.listeners.get(type)
        if (handlers) {
          handlers.delete(handler as (msg: SandboxMessageDefinitions) => void)
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
        handlers.delete(handler as (msg: SandboxMessageDefinitions) => void)
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
      this.off(typeOrTypes as any, wrappedHandler)
    }

    return this.on(typeOrTypes as any, wrappedHandler)
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
