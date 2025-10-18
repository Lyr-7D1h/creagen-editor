// This file is used to run code in a sandboxed environment

import {
  SandboxMessageHandler,
  SandboxMessageHandlerMode,
} from '../src/sandbox/SandboxMessageHandler'
import { analyzeContainer } from './analyzeContainer'
import { svgExportRequest } from './svgExport'

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

  let loadedLibraries: string[] = []
  messageHandler.on('render', ({ code, libraries }) => {
    ;(async () => {
      // Reset window event handlers
      resetWindowEventHandlers()

      // Clear previous content
      document.body.innerHTML = ''

      for (const lib of libraries) {
        if (loadedLibraries.includes(lib.path)) continue
        switch (lib.type) {
          case 'main': {
            const script = document.createElement('script')
            script.src = lib.path
            await new Promise((resolve, reject) => {
              script.onload = resolve
              script.onerror = reject
              document.head.appendChild(script)
            })
            break
          }
          case 'module': {
            const link = document.createElement('link')
            link.rel = 'modulepreload'
            link.href = lib.path
            document.head.appendChild(link)
            break
          }
        }
        loadedLibraries.push(lib.path)
      }

      // Remove libraries that are no longer active
      loadedLibraries = loadedLibraries.filter((path) => {
        for (const lib of libraries) {
          if (lib.path === path) {
            return true
          }
        }
        // Remove script tags with this src
        const scripts = document.querySelectorAll(`script[src="${path}"]`)
        scripts.forEach((script) => script.remove())

        // Remove link tags with this href
        const links = document.querySelectorAll(`link[href="${path}"]`)
        links.forEach((link) => link.remove())

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
        messageHandler.send({ type: 'log', level: 'debug', data: args }),
      info: (...args) =>
        messageHandler.send({ type: 'log', level: 'info', data: args }),
      log: (...args) =>
        messageHandler.send({ type: 'log', level: 'info', data: args }),
      error: (...args) =>
        messageHandler.send({ type: 'log', level: 'error', data: args }),
    }
  } catch (error) {
    messageHandler.send({ type: 'error', error: error as Error })
  }
}

init().catch(console.error)
