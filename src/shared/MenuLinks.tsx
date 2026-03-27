import GitHubIcon from '@mui/icons-material/GitHub'
import { IconButton } from '@mui/material'
import React from 'react'
import BugReportIcon from '@mui/icons-material/BugReport'
import { HtmlTooltip } from '../editor/HtmlTooltip'
import { DiscordIcon } from '../editor/DiscordIcon'
import { useCreagenEditor } from '../creagen-editor/CreagenContext'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'

export function MenuLinks() {
  const creagenEditor = useCreagenEditor()
  return (
    <div>
      <HtmlTooltip title="Help">
        <IconButton
          size="small"
          sx={{ padding: '5px' }}
          onClick={() => creagenEditor.executeCommand('welcome')}
        >
          <HelpOutlineIcon style={{ fontSize: '1.3rem' }} />
        </IconButton>
      </HtmlTooltip>
      <HtmlTooltip title="Join our discord">
        <IconButton
          size="small"
          component="a"
          href="https://discord.gg/dJcSMZeU4M"
          target="_blank"
          sx={{ padding: '5px' }}
          rel="noopener noreferrer"
        >
          <DiscordIcon style={{ fontSize: '1.3rem' }} />
        </IconButton>
      </HtmlTooltip>
      <HtmlTooltip title="Its open-source!">
        <IconButton
          size="small"
          component="a"
          href="https://github.com/Lyr-7D1h/creagen-editor"
          target="_blank"
          sx={{ padding: '5px' }}
          rel="noopener noreferrer"
        >
          <GitHubIcon style={{ fontSize: '1.3rem' }} />
        </IconButton>
      </HtmlTooltip>
      <HtmlTooltip title="Report a bug">
        <IconButton
          size="small"
          component="a"
          href="https://github.com/Lyr-7D1h/creagen-editor/issues"
          target="_blank"
          sx={{ padding: '5px' }}
          rel="noopener noreferrer"
        >
          <BugReportIcon style={{ fontSize: '1.3rem' }} />
        </IconButton>
      </HtmlTooltip>
    </div>
  )
}
