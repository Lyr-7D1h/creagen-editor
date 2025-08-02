import GitHubIcon from '@mui/icons-material/GitHub'
import { IconButton } from '@mui/material'
import React from 'react'
import BugReportIcon from '@mui/icons-material/BugReport'
import { HtmlTooltip } from '../editor/HtmlTooltip'
import { DiscordIcon } from '../editor/DiscordIcon'
import { useCreagenEditor } from '../creagen-editor/CreagenEditorView'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'

export function MenuLinks() {
  const creagenEditor = useCreagenEditor()
  return (
    <div>
      <HtmlTooltip title="Help">
        <IconButton
          size="small"
          sx={{ padding: 1 }}
          onClick={() => creagenEditor.executeCommand('welcome')}
        >
          <HelpOutlineIcon />
        </IconButton>
      </HtmlTooltip>
      <HtmlTooltip title="Join our discord">
        <IconButton
          size="small"
          component="a"
          href="https://discord.gg/dJcSMZeU4M"
          target="_blank"
          sx={{ padding: 1 }}
          rel="noopener noreferrer"
        >
          <DiscordIcon />
        </IconButton>
      </HtmlTooltip>
      <HtmlTooltip title="Its open-source!">
        <IconButton
          size="small"
          component="a"
          href="https://github.com/Lyr-7D1h/creagen-editor"
          target="_blank"
          sx={{ padding: 1 }}
          rel="noopener noreferrer"
        >
          <GitHubIcon />
        </IconButton>
      </HtmlTooltip>
      <HtmlTooltip title="Report a bug">
        <IconButton
          size="small"
          component="a"
          href="https://github.com/Lyr-7D1h/creagen-editor/issues"
          target="_blank"
          sx={{ padding: 1 }}
          rel="noopener noreferrer"
        >
          <BugReportIcon />
        </IconButton>
      </HtmlTooltip>
    </div>
  )
}
