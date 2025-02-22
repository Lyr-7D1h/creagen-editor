import React, { useEffect, useRef } from 'react'
import { LibraryImport } from '../../importer'
import { MODE } from '../../env'

export function SandboxView({
  code,
  libraries,
  width,
  height,
  left,
}: {
  code: string
  libraries: LibraryImport[]
  width?: string
  height?: string
  left?: string
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    window.addEventListener('message', (event) => {
      if (event.data.type === 'log') {
        console.log(...event.data.data)
      } else if (event.data.type === 'error') {
        console.error(...event.data.data)
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
        ${libraries.map((lib) => `<script src="${lib.importPath.path}"></script>`)}
      </head>
      <body style="margin: 0;"><script type="module">${code}</script></body>
    </html>
    `

    console.log(html)
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
