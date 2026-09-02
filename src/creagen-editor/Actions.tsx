import type { IconButtonProps } from '@mui/material'
import { IconButton, useTheme } from '@mui/material'
import {
  BookOpen,
  Maximize2,
  Minimize2,
  Pin,
  Play,
  QrCode,
  Share2,
  Square,
} from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { HtmlTooltip } from '../editor/HtmlTooltip'
import { editorEvents } from '../events/events'
import {
  useForceUpdateOnEditorEvent,
  useHead,
  useSettings,
} from '../events/useEditorEvents'
import { createContextLogger, log, Severity } from '../logs/logger'
import { KeybindHint } from '../shared/KeybindHint'
import { useCreagenEditor } from './CreagenContext'
import type { CreagenEditor } from './CreagenEditor'
import { Export } from './Export'
import { isMobile } from './isMobile'

const logger = createContextLogger('actions')

type ActionButtonProps = {
  title: React.ReactNode
  icon: React.ReactNode
  onClick: () => void
  color?: IconButtonProps['color']
  size?: IconButtonProps['size']
  sx?: IconButtonProps['sx']
}

function ActionButton({
  title,
  icon,
  onClick,
  color = 'primary',
  size = 'small',
  sx,
}: ActionButtonProps) {
  const theme = useTheme()
  return (
    <HtmlTooltip title={title}>
      <IconButton
        size={size}
        color={color}
        sx={{
          ...(isMobile()
            ? {
                padding: '8px',
                backgroundColor: theme.palette.background.paper,
                '&:hover': {
                  backgroundColor: theme.palette.primary.contrastText,
                },
              }
            : {}),
          ...sx,
        }}
        onClick={onClick}
        style={{
          cursor: 'pointer',
        }}
      >
        {icon}
      </IconButton>
    </HtmlTooltip>
  )
}

function shareCode(editor: CreagenEditor) {
  editor
    .commit()
    .then(async () => {
      const code = editor.editor.getValue()
      const head = editor.head
      const bookmarkName = editor.activeBookmark.name
      if (code.length === 0 || head === null) {
        logger.warn('Cannot create shareable link for empty code')
        return
      }

      const url = editor.mutateUrl().createShareableLink({
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
}

function pinVersion(editor: CreagenEditor) {
  void (async () => {
    try {
      const head = editor.head
      if (!head) return
      const url = editor.mutateUrl().setCommit(head.hash)
      await navigator.clipboard.writeText(url.toString())
      log(Severity.Success, 'Copied shareable link')
    } catch (e) {
      logger.error('Failed to create shareable link', e)
    }
  })()
}

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
  const head = useHead()
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

  const iconPixelSize = sizeVariant === 'compact' ? 16 : 50
  const iconSize = iconPixelSize + 'px'
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
    const color = isFullscreen ? 'inherit' : 'primary'
    return [
      !isMobileDevice &&
      controllerEnabled &&
      creagenEditor.controller?.open() &&
      creagenEditor.params.length > 0 ? (
        <ActionButton
          key="qr"
          title={showQR ? 'Disable controller QR' : 'Enable controller QR'}
          color={showQR ? 'primary' : isFullscreen ? 'inherit' : 'default'}
          sx={fullscreenActionButtonSx}
          icon={<QrCode size={iconSize} />}
          onClick={() => creagenEditor.executeCommand('sandbox.toggleQR')}
        />
      ) : null,
      exportEnabled ? (
        <Export
          key="export"
          color={
            isFullscreen
              ? theme.palette.common.white
              : theme.palette.primary.main
          }
          size={iconSize}
          isFullscreen={isFullscreen}
        />
      ) : null,
      !isMobileDevice && CREAGEN_REMOTE_URL == null ? (
        <ActionButton
          key="share"
          title="Copy shareable link"
          icon={<Share2 size={iconSize} />}
          color={color}
          sx={fullscreenActionButtonSx}
          onClick={() => shareCode(creagenEditor)}
        />
      ) : null,
      isMobileDevice && includeMenuToggle ? (
        <ActionButton
          key="menu"
          title="Toggle menu"
          icon={<BookOpen size={iconPixelSize - 6 + 'px'} />}
          color={color}
          sx={{ ...fullscreenActionButtonSx, padding: '11px' }}
          onClick={toggleMenu}
        />
      ) : null,
      !isMobileDevice && head ? (
        <ActionButton
          key="pin"
          title="Copy link to this current version"
          icon={<Pin size={iconSize} />}
          color={color}
          sx={fullscreenActionButtonSx}
          onClick={() => pinVersion(creagenEditor)}
        />
      ) : null,
      !isMobileDevice ? (
        <ActionButton
          key="fullscreen"
          color={color}
          title={
            <KeybindHint
              label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              keybind={creagenEditor.getKeybindKeyString(
                'editor.toggleFullscreen',
              )}
              wrapInParens
            />
          }
          icon={
            isFullscreen ? (
              <Minimize2 size={iconSize} />
            ) : (
              <Maximize2 size={iconSize} />
            )
          }
          sx={fullscreenActionButtonSx}
          onClick={() =>
            creagenEditor.executeCommand('editor.toggleFullscreen')
          }
        />
      ) : null,
      hasRun && !frozen ? (
        <ActionButton
          key="freeze"
          title="Freeze Sandbox"
          icon={<Square size={iconSize} />}
          color={color}
          sx={fullscreenActionButtonSx}
          onClick={() => creagenEditor.executeCommand('editor.freeze')}
        />
      ) : null,
      <ActionButton
        key="run"
        color={color}
        title={
          <KeybindHint
            label="Run code"
            keybind={creagenEditor.getKeybindKeyString('editor.run')}
            wrapInParens
          />
        }
        icon={<Play size={iconSize} />}
        size="medium"
        sx={fullscreenActionButtonSx}
        onClick={() => creagenEditor.executeCommand('editor.run')}
      />,
    ].filter((button): button is React.ReactElement => button !== null)
  }, [
    isFullscreen,
    isMobileDevice,
    controllerEnabled,
    creagenEditor,
    showQR,
    fullscreenActionButtonSx,
    iconSize,
    exportEnabled,
    theme.palette.common.white,
    theme.palette.primary.main,
    includeMenuToggle,
    iconPixelSize,
    toggleMenu,
    head,
    hasRun,
    frozen,
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
