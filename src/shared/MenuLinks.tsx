import { FileText, Bug, GitFork } from 'lucide-react'
import { IconButton } from '@mui/material'
import { HtmlTooltip } from '../editor/HtmlTooltip'
import { DiscordIcon } from '../menu/DiscordIcon'

export function MenuLinks() {
  return (
    <div>
      <HtmlTooltip title="Documentation">
        <IconButton
          size="small"
          component="a"
          href="https://creagen.dev/docs/"
          target="_blank"
          sx={{ padding: '5px' }}
          rel="noopener noreferrer"
        >
          <FileText size={18}  />
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
          <DiscordIcon style={{ fontSize: '1.1rem' }} />
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
          <GitFork size={18}  />
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
          <Bug size={18}  />
        </IconButton>
      </HtmlTooltip>
    </div>
  )
}
