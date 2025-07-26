import { useState } from 'react'
import { useCreagenEditor } from './CreagenEditorView'
import React from 'react'
import { Download, ExpandMore } from '@mui/icons-material'
import {
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
} from '@mui/material'
import { logger } from '../logs/logger'
import { Svg } from './svg'
import {
  useActiveBookmark,
  useEditorEvent,
  useHead,
} from '../events/useEditorEvents'

export function Export() {
  const theme = useTheme()
  const analysisResult = useEditorEvent('sandbox:analysis-complete')
  const creagenEditor = useCreagenEditor()
  const id = useHead()
  const activeRef = useActiveBookmark()

  const [downloading, setDownloading] = useState<boolean>(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [expanded, setExpanded] = useState<boolean>(false)

  async function download() {
    if (downloading) return
    setDownloading(true)
    const svgString = await creagenEditor.sandbox.svgExport(selectedIndex)
    if (svgString === null) {
      logger.error('No svg found')
      setDownloading(false)
      return
    }
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgString, 'image/svg+xml')
    const svgInstance = new Svg(doc.documentElement as unknown as SVGElement)
    svgInstance.export({ name: activeRef.name ?? '', id: id ?? undefined })
    setDownloading(false)
  }

  if (analysisResult === null) return ''
  if (analysisResult.result.svgs.length === 0) return ''

  const hasMultipleSvgs = analysisResult.result.svgs.length > 1

  return (
    <Box sx={{ position: 'relative' }}>
      <Tooltip title="Download svg">
        <IconButton
          sx={{
            color: theme.palette.grey[400],
            zIndex: 99999999,
            padding: 0,
            margin: 0,
            '&:hover': {
              color: 'inherit',
            },
          }}
          onClick={() => download()}
          size="small"
        >
          {downloading ? <CircularProgress size="20px" /> : <Download />}
        </IconButton>
      </Tooltip>

      {hasMultipleSvgs && (
        <>
          <Tooltip title="Select SVG">
            <IconButton
              sx={{
                color: theme.palette.grey[400],
                zIndex: 99999999,
                padding: 0,
                margin: 0,
                ml: 0.5,
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                '&:hover': {
                  color: 'inherit',
                },
              }}
              onClick={() => setExpanded(!expanded)}
              size="small"
            >
              <ExpandMore />
            </IconButton>
          </Tooltip>

          <Collapse in={expanded}>
            <List
              sx={{
                position: 'absolute',
                top: '100%',
                right: 0,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                minWidth: 120,
                zIndex: 99999999,
                boxShadow: 2,
              }}
            >
              {analysisResult.result.svgs.map((_, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemButton
                    selected={selectedIndex === index}
                    onClick={() => {
                      setSelectedIndex(index)
                      setExpanded(false)
                    }}
                    sx={{ py: 0.5, px: 1 }}
                  >
                    <ListItemText
                      primary={`SVG ${index + 1}`}
                      slotProps={{
                        primary: {
                          variant: 'body2',
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </>
      )}
    </Box>
  )
}
