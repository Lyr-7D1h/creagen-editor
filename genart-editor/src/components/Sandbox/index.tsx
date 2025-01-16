import React from 'react'

export function Sandbox({ width }: { width?: string }) {
  return (
    <iframe
      style={{ width }}
      id="sandbox"
      title="Sandbox"
      sandbox="allow-same-origin allow-scripts"
    ></iframe>
  )
}
