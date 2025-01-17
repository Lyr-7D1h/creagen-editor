import React from 'react'

export function Sandbox({ width }: { width?: string }) {
  return (
    <iframe
      style={{ width, border: 'none' }}
      title="Sandbox"
      sandbox="allow-same-origin allow-scripts"
    ></iframe>
  )
}
