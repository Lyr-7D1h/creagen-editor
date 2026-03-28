import { Typography } from '@mui/material'
import React from 'react'
import { timeAgoString, dateString } from '../util'
import { HistoryItem } from 'versie'
import { HtmlTooltip } from './HtmlTooltip'
import { CommitMetadata } from '../creagen-editor/CommitMetadata'

export function CommitText({
  historyItem,
}: {
  historyItem: HistoryItem<CommitMetadata>
}) {
  const { commit, bookmarks } = historyItem
  return (
    <div style={{ lineHeight: 1.5, position: 'relative' }}>
      <Typography textAlign="right" variant="body2" color="grey">
        {timeAgoString(commit.createdOn)} ({dateString(commit.createdOn)})
      </Typography>
      {bookmarks.map((bm) => (
        <Typography variant="body1" key={bm.name}>
          {bm.name}
        </Typography>
      ))}
      <Typography variant="body2">
        <em>{commit.toHex()}</em>
      </Typography>
    </div>
  )
}
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
      <Typography textAlign="right" variant="body2" color="grey">
        {timeAgoString(commit.createdOn)} ({dateString(commit.createdOn)})
      </Typography>
      {bookmarks.map((bm) => (
        <Typography variant="body1" key={bm.name}>
          {bm.name}
        </Typography>
      ))}
      <Typography variant="body2">
        <em>{commit.toHex()}</em>
      </Typography>
    </div>
  )

  return <HtmlTooltip title={tooltip}>{children}</HtmlTooltip>
}
