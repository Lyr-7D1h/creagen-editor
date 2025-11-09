import { useState } from 'react'
import { useCreagenEditor } from './CreagenEditorView'
import React from 'react'
import { Download, ExpandMore } from '@mui/icons-material'
import {
  CircularProgress,
  IconButton,
  useTheme,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
} from '@mui/material'
import { logger } from '../logs/logger'
import {
  useActiveBookmark,
  useEditorEvent,
  useHead,
  useSettings,
} from '../events/useEditorEvents'
import { HtmlTooltip } from '../editor/HtmlTooltip'

export function Export({ color, size }: { color: string; size: string }) {
  const theme = useTheme()
  const optimizeExport = useSettings('actions.export_optimize')
  const analysisResult = useEditorEvent('sandbox:analysis-complete')
  const creagenEditor = useCreagenEditor()
  const head = useHead()
  const activeRef = useActiveBookmark()

  const [downloading, setDownloading] = useState<boolean>(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [expanded, setExpanded] = useState<boolean>(false)

  async function download() {
    if (downloading) return
    setDownloading(true)
    const blob = await creagenEditor.sandbox.svgExport(
      selectedIndex,
      optimizeExport,
      head?.hash,
    )
    if (blob === null) {
      logger.error('No svg found')
      setDownloading(false)
      return
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('download', `${activeRef.name}.svg`)
    a.setAttribute('href', url)
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    setDownloading(false)
  }

  if (analysisResult === null) return ''
  if (analysisResult.result.svgs.length === 0) return ''

  const hasMultipleSvgs = analysisResult.result.svgs.length > 1

  return (
    <Box sx={{ position: 'relative', fontSize: size }}>
      <HtmlTooltip title="Download svg">
        <IconButton
          sx={{
            color,
            paddingRight: 0,
            '&:hover': {
              color: 'inherit',
            },
          }}
          onClick={() => download()}
          size="small"
        >
          {downloading ? (
            <CircularProgress size={size} />
          ) : (
            <Download style={{ fontSize: size }} />
          )}
        </IconButton>
      </HtmlTooltip>

      {hasMultipleSvgs && (
        <>
          <HtmlTooltip title="Select SVG">
            <IconButton
              sx={{
                color: theme.palette.grey[400],
                padding: 0,
                marginTop: '5px',
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
              <ExpandMore style={{ fontSize: size }} />
            </IconButton>
          </HtmlTooltip>

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
