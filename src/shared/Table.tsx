import { Box, SxProps, Theme, Typography } from '@mui/material'
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'

export interface ColumnDef<T> {
  header: React.ReactNode
  accessorKey?: keyof T & string
  cell?: (row: T) => React.ReactNode
  width?: number | string
  sx?: SxProps<Theme>
  resizable?: boolean
}

interface TableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  getRowKey: (row: T) => React.Key
  getRowSx?: (row: T) => SxProps<Theme>
}

export function Table<T extends object>({
  columns,
  data,
  onRowClick,
  getRowKey,
  getRowSx,
}: TableProps<T>) {
  const [columnWidths, setColumnWidths] = useState<(number | string)[]>(() =>
    columns.map((c) => c.width ?? 150),
  )
  const resizingColumnIndex = useRef<number | null>(null)
  const startX = useRef(0)
  const startWidth = useRef(0)
  const tableRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (tableRef.current) {
      const totalWidth = tableRef.current.clientWidth
      const gap = 16 // theme.spacing(2)
      const padding = 32 // 16px on each side
      const marginLeft = 16 // theme.spacing(2)

      const columnsWithInitialWidth = columns.filter((c) => c.width)
      const fixedWidth = columnsWithInitialWidth.reduce(
        (sum, c) =>
          sum +
          (typeof c.width === 'number'
            ? c.width
            : parseInt(c.width ?? '0', 10)),
        0,
      )
      const flexColumns = columns.filter((c) => !c.width)
      const totalGapWidth = (columns.length - 1) * gap

      if (flexColumns.length > 0) {
        const availableWidth =
          totalWidth - fixedWidth - totalGapWidth - padding - marginLeft
        const flexWidth = Math.max(50, availableWidth / flexColumns.length)
        setColumnWidths(columns.map((c) => c.width ?? flexWidth))
      }
    }
  }, [columns])

  const handleMouseDown = (
    index: number,
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    resizingColumnIndex.current = index
    startX.current = e.clientX
    const currentWidth = columnWidths[index]
    startWidth.current =
      typeof currentWidth === 'number'
        ? currentWidth
        : parseInt(currentWidth ?? '150', 10) || 0
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (resizingColumnIndex.current === null) return
    const dx = e.clientX - startX.current
    const newWidth = Math.max(startWidth.current + dx, 50) // min width 50px
    setColumnWidths((prev) => {
      const newWidths = [...prev]
      newWidths[resizingColumnIndex.current!] = newWidth
      return newWidths
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    resizingColumnIndex.current = null
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }} ref={tableRef}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '4px 16px',
          borderBottom: 1,
          borderColor: 'divider',
          marginLeft: 2,
        }}
      >
        {columns.map((col, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: columnWidths[index],
              flex: 'none',
              position: 'relative',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 'bold',
                ...col.sx,
                flexGrow: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {col.header}
            </Typography>
            {col.resizable !== false && index < columns.length - 1 && (
              <Box
                onMouseDown={(e) => handleMouseDown(index, e)}
                sx={{
                  position: 'absolute',
                  right: '-2px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '4px',
                  height: '60%',
                  cursor: 'col-resize',
                  backgroundColor: 'divider',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                  },
                  zIndex: 1,
                }}
              />
            )}
          </Box>
        ))}
      </Box>
      {/* Rows */}
      {data.map((row) => (
        <Box
          key={getRowKey(row)}
          onClick={() => onRowClick?.(row)}
          sx={{
            marginLeft: 2,
            padding: '4px 16px',
            cursor: onRowClick ? 'pointer' : 'default',
            borderRadius: 1,
            '&:hover': {
              backgroundColor: onRowClick ? 'action.hover' : 'transparent',
            },
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            borderBottom: 1,
            borderColor: 'divider',
            ...getRowSx?.(row),
          }}
        >
          {columns.map((col, index) => {
            const cellContent = col.cell
              ? col.cell(row)
              : col.accessorKey && row[col.accessorKey]
                ? (row[col.accessorKey] as React.ReactNode)
                : null

            return (
              <Box
                key={index}
                sx={{
                  width: columnWidths[index],
                  flex: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  ...col.sx,
                }}
              >
                {typeof cellContent === 'string' ? (
                  <Typography component="span" variant="body2">
                    {cellContent}
                  </Typography>
                ) : (
                  cellContent
                )}
              </Box>
            )
          })}
        </Box>
      ))}
    </Box>
  )
}
