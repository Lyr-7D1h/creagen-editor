import React from 'react'
import { Export } from './Export'
import { isMobile, useCreagenEditor } from './CreagenEditorView'
import { MenuBook, PlayCircleFilled } from '@mui/icons-material'
import { IconButton, useTheme } from '@mui/material'
import { useSettings } from '../events/useEditorEvents'
import { HtmlTooltip } from '../editor/HtmlTooltip'

export function Actions({ toggleMenu }: { toggleMenu?: () => void }) {
  const theme = useTheme()
  const creagenEditor = useCreagenEditor()
  const exportEnabled = useSettings('actions.export_enabled')

  console.log(exportEnabled)
  const size = isMobile() ? '60px' : '40px'
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

  const style: React.CSSProperties = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    display: 'flex',
    flexDirection: 'row',
    zIndex: 1002,
  }

  if (isMobile()) {
    style.flexDirection = 'column'
    style.top = undefined
    style.bottom = '10px'
  }

  return <div style={style}>{buttons}</div>
}
