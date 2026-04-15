import { createContextLogger } from '../logs/logger'
import type { EditorEvent, EditorEventData } from './EditorEvent'

const logger = createContextLogger('events')

class _EditorEventBus {
  private readonly target = new EventTarget()

  emit<K extends EditorEvent>(type: K, data: EditorEventData<K>) {
    logger.trace(type, data)
    this.target.dispatchEvent(new CustomEvent(type, { detail: data }))
  }

  on<K extends EditorEvent>(
    type: K | K[],
    callback: (data: EditorEventData<K>) => void,
    opts?: AddEventListenerOptions,
  ): () => void {
    const handler = (e: Event) => {
      callback((e as CustomEvent<EditorEventData<K>>).detail)
    }

    if (Array.isArray(type)) {
      type.forEach((type) => {
        this.target.addEventListener(type, handler)
      })
      return () => {
        type.forEach((type) => {
          this.target.removeEventListener(type, handler)
        })
      }
    }

    this.target.addEventListener(type, handler, opts)
    return () => {
      this.target.removeEventListener(type, handler)
    }
  }
}

export const editorEvents = new _EditorEventBus()
export type EditorEventBus = _EditorEventBus
