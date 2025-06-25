import { EDITOR_EVENTS, EditorEvent, EditorEventData } from './EditorEvent'

class _EditorEventBus {
  private target = new EventTarget()

  emit<K extends EditorEvent>(type: K, data: EditorEventData<K>) {
    this.target.dispatchEvent(new CustomEvent(type, { detail: data }))
  }

  on<K extends EditorEvent>(
    type: K,
    callback: (data: EditorEventData<K>) => void,
  ): () => void {
    const handler = (e: Event) => {
      callback((e as CustomEvent).detail)
    }

    this.target.addEventListener(type, handler)

    return () => {
      this.target.removeEventListener(type, handler)
    }
  }

  onAny(callback: (type: EditorEvent, data: any) => void): () => void {
    const handler = (e: Event) => {
      callback(e.type as EditorEvent, (e as CustomEvent).detail)
    }

    EDITOR_EVENTS.forEach((eventType) => {
      this.target.addEventListener(eventType, handler)
    })

    return () => {
      EDITOR_EVENTS.forEach((eventType) => {
        this.target.removeEventListener(eventType, handler)
      })
    }
  }

  onPattern(
    pattern: string,
    callback: (type: EditorEvent, data: any) => void,
  ): () => void {
    return this.onAny((type, data) => {
      if (type.startsWith(pattern)) {
        callback(type, data)
      }
    })
  }
}

export const editorEvents = new _EditorEventBus()
export type EditorEventBus = _EditorEventBus
