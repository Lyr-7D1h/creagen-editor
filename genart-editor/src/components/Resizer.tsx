import React from 'react'

export function Resizer() {
  return (
    <div
      style={{
        top: 0,
        zIndex: 1001,
        left: '30%',
        width: '200px',
        height: '100vh',
        position: 'relative',
      }}
    >
      <div
        style={{
          cursor: 'ew-resize',
          height: '100%',
          width: '3px',
        }}
      ></div>
    </div>
  )
}
