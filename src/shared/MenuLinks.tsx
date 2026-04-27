import GitHubIcon from '@mui/icons-material/GitHub'
import { IconButton } from '@mui/material'
import BugReportIcon from '@mui/icons-material/BugReport'
import { HtmlTooltip } from '../editor/HtmlTooltip'
import { DiscordIcon } from '../editor/DiscordIcon'
import ArticleIcon from '@mui/icons-material/Article'
import { LoginButton } from '../user/LoginButton'

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
          <ArticleIcon style={{ fontSize: '1.3rem' }} />
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
      {CREAGEN_REMOTE_URL != null && <LoginButton />}
    </div>
  )
}
