// This file is used to run code in a sandboxed environment

import {
  SandboxMessageHandler,
  SandboxMessageHandlerMode,
} from '../src/sandbox/SandboxMessageHandler'
import { analyzeContainer } from './analyzeContainer'
import { createScheduledTaskController } from './createScheduledTaskController'
import { createWindowEventListenerTracker } from './createWindowEventListenerTracker'
import { setupConsoleBridge } from './setupConsoleBridge'
import { svgExportRequest } from './svgExport'
import { syncPreloadedLibraries } from './syncPreloadedLibraries'

async function init() {
  // Create message handler in iframe mode
  const messageHandler = await SandboxMessageHandler.create(
    SandboxMessageHandlerMode.Iframe,
  )

  function sendError(error: Error) {
    messageHandler.send({ type: 'error', error })
  }

  const eventListenerTracker = createWindowEventListenerTracker()
  const scheduledTaskController = createScheduledTaskController(sendError)

  let loadedLibraries: string[] = []
  messageHandler.on('render', ({ code, preloadedLibraries }) => {
    ;(async () => {
      eventListenerTracker.reset()
      scheduledTaskController.reset()

      // Clear previous content
      document.body.innerHTML = ''

      loadedLibraries = await syncPreloadedLibraries(
        preloadedLibraries,
        loadedLibraries,
      )

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

  messageHandler.on('svgExportRequest', (msg) => {
    const svg = svgExportRequest(msg)
    if (svg) {
      messageHandler.send({ type: 'svgExportResponse', svg })
    }
  })

  setupConsoleBridge(messageHandler)
}

init().catch(console.error)
