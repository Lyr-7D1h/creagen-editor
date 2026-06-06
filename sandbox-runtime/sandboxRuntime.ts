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

  messageHandler.setupListeners((handler) => {
    function sendError(error: Error) {
      handler.send({ type: 'error', error })
    }

    // Capture errors thrown inside <script type="module"> tags — they execute
    // asynchronously and are invisible to the surrounding Promise chain.
    window.addEventListener('error', (event) => {
      sendError(
        event.error instanceof Error ? event.error : new Error(event.message),
      )
    })
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason as unknown
      sendError(reason instanceof Error ? reason : new Error(String(reason)))
    })

    // Capture before the tracker patches window.addEventListener so that
    // runtime listeners (e.g. mousemove forwarding) survive render resets.
    const nativeAddEventListener = window.addEventListener.bind(window)
    const eventListenerTracker = createWindowEventListenerTracker()
    const scheduledTaskController = createScheduledTaskController(sendError)

    let loadedLibraries: string[] = []
    handler.on('render', ({ code, preloadedLibraries }) => {
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

        handler.send({ type: 'renderComplete' })

        setTimeout(() => {
          const result = analyzeContainer(document.body)
          handler.send({ type: 'analysisResult', result })
        }, 500)
      })().catch(sendError)
    })

    handler.on('svgExportRequest', (msg) => {
      const svg = svgExportRequest(msg)
      if (svg) {
        handler.send({ type: 'svgExportResponse', svg })
      }
    })

    let pendingMouseMove: { x: number; y: number } | null = null
    let mouseMoveRafId: number | null = null

    function flushMouseMove() {
      mouseMoveRafId = null
      if (pendingMouseMove === null) return

      const { x, y } = pendingMouseMove
      pendingMouseMove = null
      handler.send({ type: 'mouseMove', x, y })
    }

    function onMouseMove(e: MouseEvent) {
      pendingMouseMove = {
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
      }

      if (mouseMoveRafId !== null) return
      mouseMoveRafId = window.requestAnimationFrame(flushMouseMove)
    }

    handler.on('setMouseTracking', ({ enabled }) => {
      if (enabled) {
        nativeAddEventListener('mousemove', onMouseMove)
      } else {
        window.removeEventListener('mousemove', onMouseMove)
        pendingMouseMove = null
        if (mouseMoveRafId !== null) {
          window.cancelAnimationFrame(mouseMoveRafId)
          mouseMoveRafId = null
        }
      }
    })

    setupConsoleBridge(handler)
  })
}

init().catch(console.error)
