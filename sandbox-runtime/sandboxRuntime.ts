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

  let loadedLibraries: string[] = []
  messageHandler.on('render', async ({ code, libraries }) => {
    try {
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
    } catch (error) {
      messageHandler.send({
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      })
    }
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

init()
