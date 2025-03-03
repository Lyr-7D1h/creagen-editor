import React, { useEffect, useRef } from 'react'
import { LibraryImport } from '../importer'
import { CREAGEN_EDITOR_VERSION, MODE } from '../env'
import log from '../log'
import sandboxCode from '../sandbox'
import { Library } from '../SettingsProvider'

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
      type: 'analysisResult'
      analysisResult: AnalyzeContainerResult
    }
  | {
      type: 'error'
      error: Error
    }
  | {
      type: 'svgExportRequest'
      svgIndex: number
      optimize: boolean
      libraries: Library[]
    }
  | {
      type: 'svgExportResponse'
      data: string | null
    }
  | {
      type: 'init'
      constants: {
        creagenEditorVersion: string
      }
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

export class SandboxLink {
  iframe: HTMLIFrameElement

  constructor(iframe: HTMLIFrameElement) {
    this.iframe = iframe
  }

  sendMessage(message: SandboxEvent) {
    this.iframe.contentWindow!.postMessage(message, '*')
  }

  async svgExport(
    svgIndex: number,
    libraries: Library[],
  ): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.sendMessage({
        type: 'svgExportRequest',
        svgIndex,
        optimize: true,
        libraries,
      })

      const listener = (event: MessageEvent) => {
        if (isSandboxEvent(event.data)) {
          if (event.data.type === 'svgExportResponse') {
            window.removeEventListener('message', listener)
            resolve(event.data.data)
          }
        }
      }

      window.addEventListener('message', listener)

      setTimeout(() => {
        window.removeEventListener('message', listener)
        reject(new Error('Timeout'))
      }, 5000)
    })
  }
}

export function Sandbox({
  code,
  libraries,
  width,
  height,
  left,
  onAnalysis,
}: {
  code: string
  libraries: LibraryImport[]
  width?: string
  height?: string
  left?: string
  onAnalysis?: (result: AnalyzeContainerResult, link: SandboxLink) => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const link = useRef<SandboxLink | null>(null)

  useEffect(() => {
    window.addEventListener('message', (event) => {
      const sandboxEvent = event.data
      if (isSandboxEvent(sandboxEvent)) {
        switch (sandboxEvent.type) {
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
            link.current?.sendMessage({
              type: 'init',
              constants: { creagenEditorVersion: CREAGEN_EDITOR_VERSION },
            })
            break
          case 'analysisResult':
            if (onAnalysis)
              onAnalysis(
                sandboxEvent.analysisResult,
                link.current as SandboxLink,
              )
            break
        }
      }
    })
  }, [])

  // reset iframe on code and library changes
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${libraries.filter((lib) => lib.importPath.type !== 'module').map((lib) => `<script src="${lib.importPath.path}"></script>`)}
      </head>
      <body style="margin: 0;">
        <script type="module">${sandboxCode}</script>
        <script type="module">${code}</script>
      </body>
    </html>
    `

    const blob = new Blob([html], { type: 'text/html' })
    const blobURL = URL.createObjectURL(blob)

    // Update iframe source
    iframe.src = blobURL
    link.current = new SandboxLink(iframe)
    console.log(`Sandbox: Loading code into iframe`, libraries)
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
