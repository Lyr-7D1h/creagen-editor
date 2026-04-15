type TrackedListener = {
  listener: EventListenerOrEventListenerObject
  options?: AddEventListenerOptions | boolean
}

export type WindowEventListenerTracker = {
  reset: () => void
}

export function createWindowEventListenerTracker(): WindowEventListenerTracker {
  const windowEventListeners = new Map<string, Set<TrackedListener>>()

  const originalAddEventListener = window.addEventListener.bind(window)
  window.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean,
  ) {
    if (!windowEventListeners.has(type)) {
      windowEventListeners.set(type, new Set())
    }
    windowEventListeners.get(type)!.add({ listener, options })
    return originalAddEventListener(type, listener, options)
  } as typeof window.addEventListener

  const reset = () => {
    windowEventListeners.forEach((listeners, eventType) => {
      listeners.forEach(({ listener, options }) => {
        window.removeEventListener(eventType, listener, options)
      })
    })
    windowEventListeners.clear()
  }

  return { reset }
}
