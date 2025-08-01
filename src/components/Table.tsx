import { Box, SxProps, Theme, Typography } from '@mui/material'
import React from 'react'

export interface ColumnDef<T> {
  header: React.ReactNode
  accessorKey?: keyof T & string
  cell?: (row: T) => React.ReactNode
  width?: number | string
  sx?: SxProps<Theme>
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
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
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
          <Typography
            key={index}
            variant="body2"
            sx={{
              width: col.width,
              flex: col.width ? 'none' : 1,
              fontWeight: 'bold',
              ...col.sx,
            }}
          >
            {col.header}
          </Typography>
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
              <React.Fragment key={index}>
                {typeof cellContent === 'string' ? (
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{
                      width: col.width,
                      flex: col.width ? 'none' : 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      ...col.sx,
                    }}
                  >
                    {cellContent}
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      width: col.width,
                      flex: col.width ? 'none' : 1,
                      ...col.sx,
                    }}
                  >
                    {cellContent}
                  </Box>
                )}
              </React.Fragment>
            )
          })}
        </Box>
      ))}
    </Box>
  )
}
