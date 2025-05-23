import React, { useEffect, useRef } from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'

export function SandboxView({
  width,
  height,
  left,
}: {
  width?: string
  height?: string
  left?: string
}) {
  const creagenEditor = useCreagenEditor()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      const htmlElement = creagenEditor.sandbox.html()
      container.appendChild(htmlElement)
      creagenEditor.editor.layout()
    }
  }, [])

  return (
    <div
      style={{
        width,
        border: 'none',
        position: 'absolute',
        left,
        height,
        // HACK: for some reason the iframe is not 100% height
        overflow: 'hidden',
      }}
      ref={containerRef}
    ></div>
  )
}
