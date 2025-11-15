import React, { useEffect, useMemo, useState } from 'react'
import { Export } from './Export'
import { useCreagenEditor } from './CreagenContext'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import { MenuBook, PlayCircleFilled } from '@mui/icons-material'
import { IconButton, useTheme } from '@mui/material'
import { useSettings } from '../events/useEditorEvents'
import { HtmlTooltip } from '../editor/HtmlTooltip'
import { editorEvents } from '../events/events'
import { isMobile } from './isMobile'

export function Actions({
  toggleMenu,
  style = {},
}: {
  toggleMenu: () => void
  style?: React.CSSProperties
}) {
  const theme = useTheme()
  const creagenEditor = useCreagenEditor()
  const exportEnabled = useSettings('actions.export_enabled')

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

  const size = isMobile() ? '60px' : '50px'
  const buttons = useMemo(() => {
    const buttons = []
    if (exportEnabled)
      buttons.push(
        <Export key="export" color={theme.palette.primary.main} size={size} />,
      )
    if (isMobile())
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
            <StopCircleIcon style={{ fontSize: size }} />
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
          <PlayCircleFilled style={{ fontSize: size }} />
        </IconButton>
      </HtmlTooltip>,
    )
    return buttons
  }, [
    creagenEditor,
    exportEnabled,
    frozen,
    hasRun,
    size,
    theme.palette.primary.main,
    toggleMenu,
  ])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        zIndex: 5,
        ...style,
      }}
    >
      {buttons}
    </div>
  )
}
