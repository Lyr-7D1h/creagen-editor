import React, { useEffect, useRef } from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'

export function SandboxView({ width }: { width?: string }) {
  const creagenEditor = useCreagenEditor()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref?.current) return
    const container = ref.current
    if (container) {
      const htmlElement = creagenEditor.sandbox.html()
      container.appendChild(htmlElement)
    }
  }, [ref, creagenEditor])

  return (
    <div
      ref={ref}
      style={{
        width: width || '100%',
        border: 'none',
        position: 'relative',
        display: 'flex',
        height: '100%',
      }}
    />
  )
}
