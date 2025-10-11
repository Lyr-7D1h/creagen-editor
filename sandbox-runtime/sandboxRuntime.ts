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

  messageHandler.send({ type: 'loaded' })

  let loadedLibraries: string[] = []
  messageHandler.on('render', async ({ code, libraries }) => {
    try {
      // Clear previous content
      document.body.innerHTML = ''

      // Load new libraries if needed
      for (const lib of libraries) {
        if (lib.type !== 'module' && !loadedLibraries.includes(lib.path)) {
          const script = document.createElement('script')
          script.src = lib.path
          await new Promise((resolve, reject) => {
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
          })
          loadedLibraries.push(lib.path)
        }
      }

      // Execute user code
      const script = document.createElement('script')
      script.type = 'module'
      script.textContent = code
      document.body.appendChild(script)

      messageHandler.send({ type: 'loaded' })

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
