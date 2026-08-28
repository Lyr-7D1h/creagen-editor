import { IconButton, useTheme } from '@mui/material'
import type { IconButtonProps } from '@mui/material'
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
import { BAR_HEIGHT } from '../editor/EditorBar'
import { HtmlTooltip } from '../editor/HtmlTooltip'
import { editorEvents } from '../events/events'
import {
  useForceUpdateOnEditorEvent,
  useHead,
  useSettings,
} from '../events/useEditorEvents'
import { createContextLogger, log, Severity } from '../logs/logger'
import { KeybindHint } from '../shared/KeybindHint'
import type { CreagenEditor } from './CreagenEditor'
import { useCreagenEditor } from './CreagenContext'
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
  return (
    <HtmlTooltip title={title}>
      <IconButton
        size={size}
        color={color}
        sx={sx}
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

  const size =
    sizeVariant === 'compact'
      ? BAR_HEIGHT - 6 + 'px'
      : isMobile()
        ? '60px'
        : '50px'
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
          sx={showQR ? undefined : fullscreenActionButtonSx}
          icon={<QrCode size={size} />}
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
          size={size}
          isFullscreen={isFullscreen}
        />
      ) : null,
      !isMobileDevice && CREAGEN_REMOTE_URL == null ? (
        <ActionButton
          key="share"
          title="Copy shareable link"
          icon={<Share2 size={size} />}
          color={color}
          sx={fullscreenActionButtonSx}
          onClick={() => shareCode(creagenEditor)}
        />
      ) : null,
      isMobileDevice && includeMenuToggle ? (
        <ActionButton
          key="menu"
          title="Toggle menu"
          icon={<BookOpen size={size} />}
          color={color}
          sx={fullscreenActionButtonSx}
          onClick={toggleMenu}
        />
      ) : null,
      !isMobileDevice && head ? (
        <ActionButton
          key="pin"
          title="Copy link to this current version"
          icon={<Pin size={size} />}
          color={color}
          sx={fullscreenActionButtonSx}
          onClick={() => pinVersion(creagenEditor)}
        />
      ) : null,
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
          isFullscreen ? <Minimize2 size={size} /> : <Maximize2 size={size} />
        }
        sx={fullscreenActionButtonSx}
        onClick={() => creagenEditor.executeCommand('editor.toggleFullscreen')}
      />,
      hasRun && !frozen ? (
        <ActionButton
          key="freeze"
          title="Freeze Sandbox"
          icon={<Square size={size} />}
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
        icon={<Play size={size} />}
        size="medium"
        sx={fullscreenActionButtonSx}
        onClick={() => creagenEditor.executeCommand('editor.run')}
      />,
    ].filter((button): button is React.ReactElement => button !== null)
  }, [
    controllerEnabled,
    creagenEditor,
    exportEnabled,
    frozen,
    hasRun,
    head,
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
