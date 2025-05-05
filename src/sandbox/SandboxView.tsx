import React, { useEffect, useRef } from 'react'
import { MODE } from '../env'
import { Sandbox } from './Sandbox'

export function SandboxView({
  width,
  height,
  left,
  onLoad,
}: {
  width?: string
  height?: string
  left?: string
  onLoad: (sandbox: Sandbox) => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (iframeRef.current === null) return
    onLoad(new Sandbox(iframeRef.current))
  }, [iframeRef])

  return (
    <div
      id="sandbox"
      style={{
        width,
        border: 'none',
        position: 'absolute',
        left,
        height,
        // HACK: for some reason the iframe is not 100% height
        overflow: 'hidden',
      }}
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
