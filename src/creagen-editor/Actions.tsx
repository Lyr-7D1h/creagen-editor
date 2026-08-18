import {
  Minimize2,
  Maximize2,
  BookOpen,
  Play,
  QrCode,
  Share2,
  Square,
} from 'lucide-react'
import { IconButton, useTheme } from '@mui/material'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { HtmlTooltip } from '../editor/HtmlTooltip'
import { editorEvents } from '../events/events'
import {
  useForceUpdateOnEditorEvent,
  useSettings,
} from '../events/useEditorEvents'
import { createContextLogger, log, Severity } from '../logs/logger'
import { KeybindHint } from '../shared/KeybindHint'
import { UrlMutator } from '../UrlMutator'
import { useCreagenEditor } from './CreagenContext'
import { Export } from './Export'
import { isMobile } from './isMobile'
import { BAR_HEIGHT } from '../editor/EditorBar'

const logger = createContextLogger('actions')

export function Actions({
  toggleMenu,
  style = {},
  sizeVariant = 'default',
  orientation = 'column',
  includeMenuToggle = true,
}: {
  toggleMenu: () => void
  style?: React.CSSProperties
  sizeVariant?: 'default' | 'compact'
  orientation?: 'column' | 'row'
  includeMenuToggle?: boolean
}) {
  const theme = useTheme()
  const creagenEditor = useCreagenEditor()
  useForceUpdateOnEditorEvent('params:config')
  const exportEnabled = useSettings('actions.export_enabled')
  const showQR = useSettings('show_qr')
  const controllerEnabled = useSettings('controller.enabled')
  const isFullscreen = useSettings('editor.fullscreen')

  const [frozen, setFrozen] = useState(false)
  useEffect(() => {
    return editorEvents.on(['sandbox:freeze', 'sandbox:unfreeze'], () => {
      setFrozen(creagenEditor.sandbox.isFrozen)
    })
  }, [creagenEditor])

  const [hasRun, setHasRun] = useState(false)
  useEffect(() => {
    return editorEvents.on('sandbox:render-complete', () => {
      setHasRun(true)
    })
  }, [])

  const size = sizeVariant === 'compact' ? BAR_HEIGHT - 6 + 'px' : isMobile() ? '60px' : '50px'
  const isMobileDevice = isMobile()

  const fullscreenActionButtonSx = useMemo(
    () =>
      isFullscreen
        ? {
            color: theme.palette.common.white,
            '&:hover': {
              color: theme.palette.primary.main,
            },
          }
        : undefined,
    [isFullscreen, theme.palette.common.white, theme.palette.primary.main],
  )

  const buttons = useMemo(() => {
    const buttons = []
    if (
      !isMobileDevice &&
      controllerEnabled &&
      creagenEditor.controller?.open() &&
      creagenEditor.params.length > 0
    ) {
      buttons.push(
        <HtmlTooltip
          key="qr"
          title={showQR ? 'Disable controller QR' : 'Enable controller QR'}
        >
          <IconButton
            size="small"
            color={showQR ? 'primary' : isFullscreen ? 'inherit' : 'default'}
            sx={showQR ? undefined : fullscreenActionButtonSx}
            onClick={() => creagenEditor.executeCommand('sandbox.toggleQR')}
            style={{
              cursor: 'pointer',
            }}
          >
            <QrCode size={size}  />
          </IconButton>
        </HtmlTooltip>,
      )
    }
    if (exportEnabled)
      buttons.push(
        <Export
          key="export"
          color={
            isFullscreen
              ? theme.palette.common.white
              : theme.palette.primary.main
          }
          size={size}
          isFullscreen={isFullscreen}
        />,
      )
    if (!isMobileDevice && CREAGEN_REMOTE_URL == null) {
      buttons.push(
        <HtmlTooltip key="share" title="Copy shareable link">
          <IconButton
            size="small"
            color={isFullscreen ? 'inherit' : 'primary'}
            sx={fullscreenActionButtonSx}
            onClick={() => {
              creagenEditor
                .commit()
                .then(async () => {
                  const code = creagenEditor.editor.getValue()
                  const head = creagenEditor.head
                  const bookmarkName = creagenEditor.activeBookmark.name
                  if (code.length === 0 || head === null) {
                    logger.warn('Cannot create shareable link for empty code')
                    return
                  }

                  const url = UrlMutator.createShareableLink({
                    code,
                    bookmarkName,
                    editorVersion: head.metadata.editorVersion,
                    libraries: head.metadata.libraries,
                    createdOn: head.createdOn,
                    author: head.metadata.author,
                  })

                  await navigator.clipboard.writeText(url.toString())
                  log(Severity.Success, 'Copied shareable link')
                })
                .catch((error) => {
                  logger.error('Failed to create shareable link', error)
                })
            }}
            style={{
              cursor: 'pointer',
            }}
          >
            <Share2 size={size}  />
          </IconButton>
        </HtmlTooltip>,
      )
    }
    if (isMobileDevice && includeMenuToggle)
      buttons.push(
        <HtmlTooltip key="menu" title="Toggle menu">
          <IconButton
            size="small"
            color={isFullscreen ? 'inherit' : 'primary'}
            sx={fullscreenActionButtonSx}
            onClick={toggleMenu}
            style={{
              cursor: 'pointer',
            }}
          >
            <BookOpen size={size}  />
          </IconButton>
        </HtmlTooltip>,
      )
    if (!isMobileDevice)
      buttons.push(
        <HtmlTooltip
          key="fullscreen"
          title={
            <KeybindHint
              label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              keybind={creagenEditor.getKeybindKeyString(
                'editor.toggleFullscreen',
              )}
              wrapInParens
            />
          }
        >
          <IconButton
            size="small"
            color={isFullscreen ? 'inherit' : 'primary'}
            sx={fullscreenActionButtonSx}
            onClick={() =>
              creagenEditor.executeCommand('editor.toggleFullscreen')
            }
            style={{
              cursor: 'pointer',
            }}
          >
            {isFullscreen ? (
              <Minimize2 size={size} />
            ) : (
              <Maximize2 size={size} />
            )}
          </IconButton>
        </HtmlTooltip>,
      )
    if (hasRun && !frozen) {
      buttons.push(
        <HtmlTooltip key="freeze" title="Freeze Sandbox">
          <IconButton
            size="small"
            color={isFullscreen ? 'inherit' : 'primary'}
            sx={fullscreenActionButtonSx}
            onClick={() => {
              creagenEditor.executeCommand('editor.freeze')
            }}
            style={{
              cursor: 'pointer',
            }}
          >
            <Square size={size} />
          </IconButton>
        </HtmlTooltip>,
      )
    }
    buttons.push(
      <HtmlTooltip
        key="run"
        title={
          <KeybindHint
            label="Run code"
            keybind={creagenEditor.getKeybindKeyString('editor.run')}
            wrapInParens
          />
        }
      >
        <IconButton
          color={isFullscreen ? 'inherit' : 'primary'}
          sx={fullscreenActionButtonSx}
          onClick={() => creagenEditor.executeCommand('editor.run')}
          style={{
            cursor: 'pointer',
          }}
        >
            <Play size={size}  />
        </IconButton>
      </HtmlTooltip>,
    )
    return buttons
  }, [
    controllerEnabled,
    creagenEditor,
    exportEnabled,
    frozen,
    hasRun,
    includeMenuToggle,
    isMobileDevice,
    isFullscreen,
    showQR,
    size,
    theme.palette.common.white,
    theme.palette.primary.main,
    toggleMenu,
    fullscreenActionButtonSx,
  ])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: orientation,
        gap: sizeVariant === 'compact' ? 2 : 6,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        ...style,
      }}
    >
      {buttons}
    </div>
  )
}
