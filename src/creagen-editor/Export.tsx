import { Download, ExpandMore } from '@mui/icons-material'
import {
  Box,
  CircularProgress,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useTheme,
} from '@mui/material'
import JSZip from 'jszip'
import { useState } from 'react'
import { HtmlTooltip } from '../editor/HtmlTooltip'
import {
  useActiveBookmark,
  useEditorEvent,
  useHead,
  useSettings,
} from '../events/useEditorEvents'
import { logger } from '../logs/logger'
import { useCreagenEditor } from './CreagenContext'

export function Export({
  color,
  size,
  isFullscreen = false,
}: {
  color: string
  size: string
  isFullscreen?: boolean
}) {
  const theme = useTheme()
  const optimizeExport = useSettings('actions.export_optimize')
  const analysisResult = useEditorEvent('sandbox:analysis-complete')
  const creagenEditor = useCreagenEditor()
  const head = useHead()
  const activeBookmark = useActiveBookmark()

  const [downloading, setDownloading] = useState<boolean>(false)
  const [selectedIndex, setSelectedIndex] = useState<number | 'all'>(0)
  const [expanded, setExpanded] = useState<boolean>(false)

  async function download() {
    if (downloading) return
    setDownloading(true)

    function triggerDownload(blob: Blob, filename: string) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.setAttribute('download', filename)
      a.setAttribute('href', url)
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }

    try {
      let index = selectedIndex
      const svgCount = analysisResult?.result.svgs.length ?? 0
      if (index === 'all' && svgCount <= 1) index = 0
      if (index === 'all') {
        const zip = new JSZip()

        for (let index = 0; index < svgCount; index += 1) {
          const blob = await creagenEditor.sandbox.svgExport(
            index,
            optimizeExport,
            head,
          )

          if (blob === null) {
            logger.error(`No svg found at index ${index}`)
            continue
          }

          zip.file(`${activeBookmark.name}-${index + 1}.svg`, blob)
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' })
        triggerDownload(zipBlob, `${activeBookmark.name}.zip`)

        return
      }

      const blob = await creagenEditor.sandbox.svgExport(
        index,
        optimizeExport,
        head,
      )

      if (blob === null) {
        logger.error('No svg found')
        return
      }

      triggerDownload(blob, `${activeBookmark.name}.svg`)
    } finally {
      setDownloading(false)
    }
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
              color: isFullscreen ? theme.palette.primary.main : 'inherit',
            },
          }}
          onClick={() => {
            download().catch(logger.error)
          }}
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
          <HtmlTooltip title="Select SVG" style={{ zIndex: 5 }}>
            <IconButton
              sx={{
                color: isFullscreen
                  ? theme.palette.common.white
                  : theme.palette.grey[400],
                padding: 0,
                marginTop: '5px',
                ml: 0.5,
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                '&:hover': {
                  color: isFullscreen ? theme.palette.primary.main : 'inherit',
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
                maxHeight: 220,
                overflowY: 'auto',
                boxShadow: 2,
              }}
            >
              <ListItem disablePadding>
                <ListItemButton
                  selected={selectedIndex === 'all'}
                  onClick={() => {
                    setSelectedIndex('all')
                    setExpanded(false)
                  }}
                  sx={{ py: 0.5, px: 1 }}
                >
                  <ListItemText
                    primary="All SVGs"
                    slotProps={{
                      primary: {
                        variant: 'body2',
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>

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
