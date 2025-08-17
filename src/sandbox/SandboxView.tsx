import React, { useEffect } from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'

export function SandboxView({
  width,
  ref,
}: {
  width?: string
  ref?: React.RefObject<HTMLDivElement | null>
}) {
  const creagenEditor = useCreagenEditor()

  useEffect(() => {
    if (!ref?.current) return
    const container = ref.current
    if (container) {
      const htmlElement = creagenEditor.sandbox.html()
      container.appendChild(htmlElement)
    }
  }, [ref])

  return (
    <div
      ref={ref}
      style={{
        width,
        border: 'none',
        position: 'absolute',
        display: 'flex',
        height: '100svh',
      }}
    ></div>
  )
}
