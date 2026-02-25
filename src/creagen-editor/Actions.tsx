import QrCodeIcon from '@mui/icons-material/QrCode'
import React, { useEffect, useMemo, useState } from 'react'
import { Export } from './Export'
import { useCreagenEditor } from './CreagenContext'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import { MenuBook } from '@mui/icons-material'
import { IconButton, useTheme } from '@mui/material'
import {
  useForceUpdateOnEditorEvent,
  useSettings,
} from '../events/useEditorEvents'
import { HtmlTooltip } from '../editor/HtmlTooltip'
import { editorEvents } from '../events/events'
import { isMobile } from './isMobile'

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

  const size = sizeVariant === 'compact' ? '16px' : isMobile() ? '60px' : '50px'
  const isMobileDevice = isMobile()
  const buttons = useMemo(() => {
    const buttons = []
    if (
      !isMobileDevice &&
      controllerEnabled &&
      CREAGEN_EDITOR_CONTROLLER_URL != null &&
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
            onClick={() => creagenEditor.executeCommand('sandbox.toggleQR')}
            style={{
              cursor: 'pointer',
            }}
          >
            <QrCodeIcon style={{ fontSize: size }} />
          </IconButton>
        </HtmlTooltip>,
      )
    }
    if (exportEnabled)
      buttons.push(
        <Export key="export" color={theme.palette.primary.main} size={size} />,
      )
    if (isMobileDevice && includeMenuToggle)
      buttons.push(
        <HtmlTooltip key="menu" title="Toggle menu">
          <IconButton
            size="small"
            color="primary"
            onClick={toggleMenu}
            style={{
              cursor: 'pointer',
            }}
          >
            <MenuBook style={{ fontSize: size }} />
          </IconButton>
        </HtmlTooltip>,
      )
    if (hasRun && !frozen) {
      buttons.push(
        <HtmlTooltip key="freeze" title="Freeze Sandbox">
          <IconButton
            size="small"
            color="primary"
            onClick={() => {
              creagenEditor.executeCommand('editor.toggleFreeze')
            }}
            style={{
              cursor: 'pointer',
            }}
          >
            <StopIcon style={{ fontSize: size }} />
          </IconButton>
        </HtmlTooltip>,
      )
    }
    buttons.push(
      <HtmlTooltip key="run" title="Run Code">
        <IconButton
          size="small"
          color="primary"
          onClick={() => creagenEditor.executeCommand('editor.run')}
          style={{
            cursor: 'pointer',
          }}
        >
          <PlayArrowIcon style={{ fontSize: size }} />
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
    theme.palette.primary.main,
    toggleMenu,
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
