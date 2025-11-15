import React, { useEffect, useRef } from 'react'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import { logger } from '../logs/logger'

export function SandboxView({
  width,
  height,
}: {
  width?: string
  height?: string
}) {
  const creagenEditor = useCreagenEditor()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const container = ref.current
    const htmlElement = creagenEditor.sandbox.html()
    container.appendChild(htmlElement)
    creagenEditor.sandbox.connectMessageHandler().catch(logger.error)
  }, [ref, creagenEditor])

  return (
    <div
      ref={ref}
      style={{
        width: width ?? '100%',
        height: height ?? '100%',
        border: 'none',
        position: 'relative',
        display: 'flex',
      }}
    />
  )
}
