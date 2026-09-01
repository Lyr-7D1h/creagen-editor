import React from 'react'
import { Stack } from '@mui/material'
import { Triangle } from 'lucide-react'
import { useActiveBookmark, useHead, useSettings } from '../events/useEditorEvents'
import { HistoryItemChip } from './HistoryItemChip'
import type { HistoryItem } from 'versie'
import type { CommitMetadata } from '../creagen-editor/CommitMetadata'
import type { ActiveBookmark } from '../creagen-editor/CreagenEditor'

function HistoryLink({
  item,
  last,
  fullscreen,
  head,
  activeBookmark,
}: {
  item: HistoryItem<CommitMetadata>
  last: boolean
  fullscreen: boolean
  head?: string
  activeBookmark: ActiveBookmark
}) {
  return (
    <>
      <HistoryItemChip
        active={head === item.commit.hash.toHex()}
        item={item}
        fullscreen={fullscreen}
        activeBookmark={activeBookmark}
      />
      {!last && (
        <Triangle
          fill='currentColor'
          style={{
            color: fullscreen ? '#bbb' : '#868686',
            transform: 'rotate(-90deg)',
          }}
          size={7}
        />
      )}
    </>
  )
}

export function History({
  items,
}: {
  items: HistoryItem<CommitMetadata>[]
}) {
  const fullscreen = useSettings('editor.fullscreen')
  const activeBookmark = useActiveBookmark()
  const head = useHead()

  const renderHistoryItems = () => {
    return items.map((item, index) => (
      <React.Fragment key={index}>
        <HistoryLink
          item={item}
          head={head?.toHex()}
          last={index >= items.length - 1}
          fullscreen={fullscreen}
          activeBookmark={activeBookmark}
        />
      </React.Fragment>
    ))
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: 'center',
        color: 'black',
        paddingLeft: 1,
        paddingRight: 1,
        flexWrap: 'nowrap',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      {renderHistoryItems()}
    </Stack>
  )
}
