import { useTheme } from '@mui/material'
import React, { RefAttributes } from 'react'

export const RESIZER_WIDTH_PX = 3
export function Resizer({
  ref,
  resizing,
  onResize,
  hidden,
}: {
  resizing: boolean
  onResize: () => void
  hidden?: boolean
} & RefAttributes<HTMLDivElement>) {
  const theme = useTheme()
  return (
    <div ref={ref} style={{ position: 'absolute', zIndex: 1002 }}>
      <div
        onMouseDown={onResize}
        style={{
          cursor: 'ew-resize',
          height: '100svh',
          width: RESIZER_WIDTH_PX + 'px',
          borderLeft: resizing
            ? `2px solid ${theme.palette.primary.main}`
            : hidden
              ? undefined
              : `2px solid ${theme.palette.divider}`,
          top: 0,
        }}
      />
      {/* mouse capturing box layer above other window that might capture mouse events */}
      {resizing && (
        <div
          style={{
            top: 0,
            transform: 'translateX(-50%)',
            width: '800px',
            height: '100svh',
            position: 'absolute',
            overflow: 'hidden',
          }}
        />
      )}
    </div>
  )
}
