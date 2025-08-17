import React from 'react'
import { Export } from './Export'
import { isMobile, useCreagenEditor } from './CreagenEditorView'
import { MenuBook, PlayCircleFilled } from '@mui/icons-material'
import { IconButton, useTheme } from '@mui/material'
import { useSettings } from '../events/useEditorEvents'
import { HtmlTooltip } from '../editor/HtmlTooltip'

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

  const size = isMobile() ? '60px' : '50px'
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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1003,
        ...style,
      }}
    >
      {buttons}
    </div>
  )
}
