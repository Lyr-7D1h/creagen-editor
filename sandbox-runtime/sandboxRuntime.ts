// This file is used to run code in a sandboxed environment

import {
  SandboxMessageHandler,
  SandboxMessageHandlerMode,
} from '../src/sandbox/SandboxMessageHandler'
import { analyzeContainer } from './analyzeContainer'
import { svgExportRequest } from './svgExport'
import { serializeForPostMessage } from './serializeForPostMessage'

declare global {
  interface Window {
    creagen: {
      constants: {
        creagenEditorVersion: string
      }
    }
  }
}
window.creagen = {
  constants: {
    creagenEditorVersion: '',
  },
}

async function init() {
  // Create message handler in iframe mode
  const messageHandler = await SandboxMessageHandler.create(
    SandboxMessageHandlerMode.Iframe,
  )

  function sendError(error: Error) {
    messageHandler.send({ type: 'error', error })
  }

  // Track event listeners added to window
  const windowEventListeners = new Map<
    string,
    Set<{
      listener: EventListenerOrEventListenerObject
      options?: AddEventListenerOptions | boolean
    }>
  >()

  // Override addEventListener to track listeners
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

  // Function to reset all window event handlers
  function resetWindowEventHandlers() {
    windowEventListeners.forEach((listeners, eventType) => {
      listeners.forEach(({ listener, options }) => {
        window.removeEventListener(eventType, listener, options)
      })
    })
    windowEventListeners.clear()
  }

  // Track and control requestAnimationFrame, setTimeout and setInterval
  const originalRequestAnimationFrame =
    window.requestAnimationFrame.bind(window)
  const originalCancelAnimationFrame = window.cancelAnimationFrame.bind(window)
  let rafActive = true
  const rafHandles = new Set<number>()

  window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    if (!rafActive) return -1
    const wrapped: FrameRequestCallback = (time) => {
      if (!rafActive) return
      try {
        cb(time)
      } catch (e) {
        sendError(e as Error)
      }
    }
    const id = originalRequestAnimationFrame(wrapped)
    rafHandles.add(id)
    return id
  }

  window.cancelAnimationFrame = (id: number) => {
    rafHandles.delete(id)
    return originalCancelAnimationFrame(id)
  }

  const originalSetTimeout = window.setTimeout.bind(window)
  const originalClearTimeout = window.clearTimeout.bind(window)
  const originalSetInterval = window.setInterval.bind(window)
  const originalClearInterval = window.clearInterval.bind(window)
  let timersActive = true
  const timeoutHandles = new Set<number>()
  const intervalHandles = new Set<number>()

  window.setTimeout = (
    cb: TimerHandler,
    ms?: number,
    ...args: unknown[]
  ): number => {
    if (!timersActive) return -1
    const wrapped = () => {
      if (!timersActive) return
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (typeof cb === 'function') cb(...args)
        else eval(String(cb))
      } catch (e) {
        sendError(e as Error)
      }
    }
    const id = originalSetTimeout(wrapped, ms) as unknown as number
    timeoutHandles.add(id)
    return id
  }

  window.clearTimeout = (id?: number) => {
    if (id != null) timeoutHandles.delete(id)
    return originalClearTimeout(id)
  }

  window.setInterval = (
    cb: TimerHandler,
    ms?: number,
    ...args: unknown[]
  ): number => {
    if (!timersActive) return -1
    const wrapped = () => {
      if (!timersActive) return
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (typeof cb === 'function') cb(...args)
        else eval(String(cb))
      } catch (e) {
        sendError(e as Error)
      }
    }
    const id = originalSetInterval(wrapped, ms) as unknown as number
    intervalHandles.add(id)
    return id
  }

  window.clearInterval = (id?: number) => {
    if (id != null) intervalHandles.delete(id)
    return originalClearInterval(id)
  }

  function resetScheduledTasks() {
    // prevent new callbacks from running while we cancel existing handles
    rafActive = false
    timersActive = false

    for (const id of rafHandles) {
      try {
        originalCancelAnimationFrame(id)
      } catch {
        /* empty */
      }
    }
    rafHandles.clear()

    for (const id of timeoutHandles) {
      try {
        originalClearTimeout(id)
      } catch {
        /* empty */
      }
    }
    timeoutHandles.clear()

    for (const id of intervalHandles) {
      try {
        originalClearInterval(id)
      } catch {
        /* empty */
      }
    }
    intervalHandles.clear()

    // re-enable scheduling for the next render
    rafActive = true
    timersActive = true
  }

  let loadedLibraries: string[] = []
  messageHandler.on('render', ({ code, preloadedLibraries }) => {
    ;(async () => {
      // Reset window event handlers
      resetWindowEventHandlers()

      // Reset scheduled tasks (rAF, timeouts, intervals)
      resetScheduledTasks()

      // Clear previous content
      document.body.innerHTML = ''

      for (const [name, lib] of preloadedLibraries) {
        if (loadedLibraries.includes(name)) continue
        loadedLibraries.push(name)

        for (const path of lib) {
          switch (path.type) {
            case 'main': {
              const script = document.createElement('script')
              script.dataset['libname'] = name
              script.src = path.path
              await new Promise((resolve, reject) => {
                script.onload = resolve
                script.onerror = reject
                document.head.appendChild(script)
              })
              break
            }
            case 'module': {
              const link = document.createElement('link')
              link.dataset['libname'] = name
              link.rel = 'modulepreload'
              link.href = path.path
              document.head.appendChild(link)
              break
            }
          }
        }
      }

      // Remove libraries that are no longer active
      loadedLibraries = loadedLibraries.filter((name) => {
        for (const [lname] of preloadedLibraries) {
          if (name === lname) {
            return true
          }
        }
        // Remove any elements with this libname
        const elements = document.querySelectorAll(`[data-libname="${name}"]`)
        elements.forEach((element) => element.remove())

        return false
      })

      // Execute user code
      const script = document.createElement('script')
      script.type = 'module'
      script.textContent = code
      document.body.appendChild(script)

      messageHandler.send({ type: 'renderComplete' })

      setTimeout(() => {
        const result = analyzeContainer(document.body)
        messageHandler.send({ type: 'analysisResult', result })
      }, 500)
    })().catch(sendError)
  })

  messageHandler.on('init', (msg) => {
    window.creagen.constants = msg.constants
  })

  messageHandler.on('svgExportRequest', (msg) => {
    const svg = svgExportRequest(msg)
    if (svg) {
      messageHandler.send({ type: 'svgExportResponse', svg })
    }
  })

  try {
    window.console = {
      ...window.console,
      debug: (...args) =>
        messageHandler.send({
          type: 'log',
          level: 'debug',
          data: serializeForPostMessage(args),
        }),
      info: (...args) =>
        messageHandler.send({
          type: 'log',
          level: 'info',
          data: serializeForPostMessage(args),
        }),
      log: (...args) =>
        messageHandler.send({
          type: 'log',
          level: 'info',
          data: serializeForPostMessage(args),
        }),
      error: (...args) =>
        messageHandler.send({
          type: 'log',
          level: 'error',
          data: serializeForPostMessage(args),
        }),
    }
  } catch (error) {
    messageHandler.send({ type: 'error', error: error as Error })
  }
}

init().catch(console.error)
