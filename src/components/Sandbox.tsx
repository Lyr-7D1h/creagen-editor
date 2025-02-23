import React, { useEffect, useRef } from 'react'
import { LibraryImport } from '../importer'
import { MODE } from '../env'
import log from '../log'
import sandboxCode from '../sandbox'

export type SandboxEvent =
  | {
      type: 'log'
      level: 'debug' | 'info' | 'warn' | 'error'
      data: any[]
    }
  | {
      type: 'loaded'
    }
  | {
      type: 'error'
      error: Error
    }
  | {
      type: 'analysis'
      result: AnalyzeContainerResult
    }

export interface AnalyzeContainerResult {
  svgs: SvgProps[]
}

export interface SvgProps {
  width?: number
  height?: number
  paths: number
  circles: number
  rects: number
}

function isSandboxEvent(event: any): event is SandboxEvent {
  return event && typeof event.type === 'string'
}

export function SandboxView({
  code,
  libraries,
  width,
  height,
  left,
  onLoad,
  onAnalysis,
}: {
  code: string
  libraries: LibraryImport[]
  width?: string
  height?: string
  left?: string
  onLoad?: () => void
  onAnalysis?: (result: AnalyzeContainerResult) => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    window.addEventListener('message', (event) => {
      const sandboxEvent = event.data
      if (isSandboxEvent(sandboxEvent)) {
        switch (sandboxEvent.type) {
          case 'analysis':
            if (onAnalysis) onAnalysis(sandboxEvent.result)
            break
          case 'error':
            throw sandboxEvent.error
          case 'log':
            if (sandboxEvent.level === 'error') {
              log.error(...sandboxEvent.data)
              return
            }
            console[sandboxEvent.level](...sandboxEvent.data)
            break
          case 'loaded':
            if (onLoad) onLoad()
            break
        }
      }
    })
  }, [])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        ${libraries.filter((lib) => lib.importPath.type !== 'module').map((lib) => `<script src="${lib.importPath.path}"></script>`)}
      </head>
      <body style="margin: 0;">
        <script>${sandboxCode}</script>
        <script type="module">${code}</script>
      </body>
    </html>
    `

    const blob = new Blob([html], { type: 'text/html' })
    const blobURL = URL.createObjectURL(blob)

    // Update iframe source
    iframe.src = blobURL
  }, [code, libraries])

  return (
    <div
      id="sandbox"
      style={{ width, border: 'none', position: 'absolute', left, height }}
    >
      <iframe
        ref={iframeRef}
        title="Sandbox"
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox={`allow-scripts ${MODE === 'dev' ? 'allow-same-origin' : ''}`}
      ></iframe>
    </div>
  )
}
