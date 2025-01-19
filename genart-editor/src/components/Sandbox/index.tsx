import React, { useEffect, useRef } from 'react'
import { Sandbox } from './sandbox'

export function SandboxView({
  width,
  left,
  onLoad,
}: {
  width?: string
  left?: string
  onLoad: (sandbox: Sandbox) => void
}) {
  const iframe = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!iframe.current) return
    const sandbox = new Sandbox(iframe.current)
    onLoad(sandbox)
  })

  return (
    <iframe
      ref={iframe}
      style={{ width, border: 'none', position: 'absolute', left }}
      title="Sandbox"
      sandbox="allow-same-origin allow-scripts"
    ></iframe>
  )
}
