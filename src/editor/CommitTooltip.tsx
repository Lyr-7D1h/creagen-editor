import { Typography } from '@mui/material'
import type React from 'react'
import { timeAgoString, dateString } from '../util'
import type { HistoryItem } from 'versie'
import { HtmlTooltip } from './HtmlTooltip'
import type { CommitMetadata } from '../creagen-editor/CommitMetadata'

export function CommitTooltip({
  historyItem,
  children,
}: {
  historyItem: HistoryItem<CommitMetadata>
  children: React.ReactElement
}) {
  const { commit, bookmarks } = historyItem

  const tooltip = (
    <div style={{ lineHeight: 1.5, position: 'relative' }}>
      <Typography sx={{ textAlign: 'right' }} variant="body2" color="grey">
        {timeAgoString(commit.createdOn)} ({dateString(commit.createdOn)})
      </Typography>
      <Typography variant="body2">
        <strong>Bookmarks:</strong> {bookmarks.map((bm) => bm.name).join(', ')}
      </Typography>
      <Typography variant="body2">
        <strong>Author:</strong> {commit.metadata.author ?? 'local'}
      </Typography>
      <Typography variant="body2">
        <strong>Editor Version:</strong>{' '}
        {commit.metadata.editorVersion.toString()}
      </Typography>
      {commit.metadata.libraries.length > 0 && (
        <Typography variant="body2">
          <strong>Libraries:</strong>{' '}
          {commit.metadata.libraries
            .map((l) => `${l.name}@${l.version.toString()}`)
            .join(', ')}
        </Typography>
      )}
      <Typography variant="body2" sx={{ mt: 1 }}>
        <em>{commit.toHex()}</em>
      </Typography>
    </div>
  )

  return <HtmlTooltip title={tooltip}>{children}</HtmlTooltip>
}
