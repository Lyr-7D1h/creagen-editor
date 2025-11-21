import z from 'zod'
import { fetch } from '../fetch'
import { createContextLogger } from '../logs/logger'
import { paramConfigSchema } from '../params/Params'

const newSchema = z.object({
  id: z.string(),
})

const editorMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('editor:param-delete'),
    key: z.string(),
  }),
  z.object({
    type: z.literal('editor:param-add'),
    key: z.string(),
    config: paramConfigSchema,
  }),
  z.object({
    type: z.literal('editor:param-value'),
    key: z.string(),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal('editor:param-regen-interval'),
    value: z.number(),
  }),
  z.object({
    type: z.literal('editor:state'),
    configs: z.array(z.tuple([z.string(), paramConfigSchema])),
    values: z.array(z.tuple([z.string(), z.unknown()])),
    regenInterval: z.number(),
  }),
])

const clientMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('client:param-value'),
    key: z.string(),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal('client:statereq'),
  }),
  z.object({
    type: z.literal('client:param-regen-interval'),
    /** Interval in ms */
    interval: z.number(),
  }),
])

const systemMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('connection'),
  }),
  z.object({
    type: z.literal('disconnection'),
  }),
  z.object({
    type: z.literal('error'),
    error: z.string(),
  }),
])
const controllerMessage = z.union([editorMessage, clientMessage, systemMessage])

export type ControllerMessage = z.infer<typeof controllerMessage>

const logger = createContextLogger('controller')

/** Controller class to connect to or create a broadcast which sends controls to other machines  */
export class Controller {
  activeId: string | null = null
  private ws: WebSocket | null = null
  private readonly messageHandlers: Set<(msg: ControllerMessage) => void> =
    new Set()

  constructor(private readonly url: string) {}

  /** Make a new controller channel */
  async new() {
    const res = await fetch(`${this.url}/api/new`)
    const body = (await res.json()) as unknown
    const r = await newSchema.parseAsync(body)
    return r.id
  }

  open() {
    return this.ws != null && this.ws.readyState === WebSocket.OPEN
  }

  connect(id: string) {
    // Close existing connection if open
    if (this.open()) {
      this.ws!.close()
    }
    this.activeId = id

    this.ws = new WebSocket(`${this.url}/api/connect/${id}`)

    return new Promise<void>((resolve, reject) => {
      if (!this.ws) return

      this.ws.onopen = () => {
        logger.info(`Connected to ${id}`)
        resolve()
      }

      this.ws.onmessage = async (event) => {
        try {
          const message: ControllerMessage = await controllerMessage.parseAsync(
            JSON.parse(event.data as string),
          )
          this.messageHandlers.forEach((handler) => handler(message))
        } catch (err) {
          logger.error('Failed to parse WebSocket message:', err)
        }
      }

      this.ws.onerror = (error) => {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(error)
      }

      this.ws.onclose = () => {
        logger.info(`Disconnected from ${id}`)
        reject(new Error('Closed unexpectedly'))
      }
    })
  }

  send(msg: ControllerMessage) {
    if (!this.open()) {
      throw new Error('WebSocket not connected')
    }
    this.ws!.send(JSON.stringify(msg))
  }

  onMessage(handler: (msg: ControllerMessage) => void) {
    this.messageHandlers.add(handler)
  }

  off(handler: (msg: ControllerMessage) => void) {
    this.messageHandlers.delete(handler)
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.messageHandlers.clear()
  }
}
