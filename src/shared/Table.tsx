import {
  Box,
  Paper,
  SxProps,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Theme,
  Typography,
} from '@mui/material'
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
  const tableRef = useRef<HTMLTableElement>(null)

  useLayoutEffect(() => {
    if (tableRef.current) {
      const totalWidth = tableRef.current.parentElement?.clientWidth ?? 0
      if (totalWidth === 0) return

      const columnsWithInitialWidth = columns.filter((c) => c.width)
      const fixedWidth = columnsWithInitialWidth.reduce(
        (sum, c) =>
          sum +
          (typeof c.width === 'number'
            ? c.width
            : parseInt(c.width?.toString() ?? '0', 10)),
        0,
      )
      const flexColumns = columns.filter((c) => !c.width)

      if (flexColumns.length > 0) {
        const availableWidth = totalWidth - fixedWidth
        const flexWidth = Math.max(50, availableWidth / flexColumns.length)
        setColumnWidths(columns.map((c) => c.width ?? flexWidth))
      }
    }
  }, [columns, data]) // Rerun when data changes as well to account for scrollbar

  const handleMouseDown = (
    index: number,
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    resizingColumnIndex.current = index
    startX.current = e.clientX
    const th = tableRef.current?.querySelectorAll('th')[index]
    startWidth.current = th?.offsetWidth ?? 0
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
    <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 200px)' }}>
      <MuiTable stickyHeader ref={tableRef} sx={{ tableLayout: 'auto' }}>
        <TableHead>
          <TableRow>
            {columns.map((col, index) => (
              <TableCell
                key={index}
                sx={{
                  width: columnWidths[index],
                  fontWeight: 'bold',
                  position: 'relative',
                  overflow: 'hidden',
                  ...col.sx,
                }}
              >
                <Box
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.header}
                </Box>
                {col.resizable !== false && (
                  <Box
                    onMouseDown={(e) => handleMouseDown(index, e)}
                    sx={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '5px',
                      cursor: 'col-resize',
                      zIndex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover::after': {
                        backgroundColor: 'primary.main',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: '1px',
                        height: '50%',
                        backgroundColor: 'divider',
                        transition: 'background-color 0.2s',
                      }}
                      className="resize-handle"
                    />
                  </Box>
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={getRowKey(row)}
              onClick={() => onRowClick?.(row)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': {
                  backgroundColor: onRowClick ? 'action.hover' : 'transparent',
                },
                '&:last-child td, &:last-child th': { border: 0 },
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
                  <TableCell
                    key={index}
                    sx={{
                      width: columnWidths[index],
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
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </MuiTable>
    </TableContainer>
  )
}
