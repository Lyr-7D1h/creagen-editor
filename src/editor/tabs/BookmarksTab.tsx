import React from 'react'
import { useCreagenEditor } from '../../creagen-editor/CreagenContext'
import { Typography, IconButton } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { useBookmarks } from '../../events/useEditorEvents'
import { dateString } from '../../util'
import { ColumnDef, Table } from '../../shared/Table'
import { Bookmark } from '../../vcs/Bookmarks'
import { logger } from '../../logs/logger'

export const BookmarksTab = () => {
  const creagenEditor = useCreagenEditor()
  const vcs = creagenEditor.vcs
  const bms = useBookmarks().getBookmarks()

  bms.sort((a, b) => b.createdOn.getTime() - a.createdOn.getTime())

  const handleDeleteBookmark = (
    event: React.MouseEvent,
    bookmarkName: string,
  ) => {
    event.stopPropagation()
    vcs.removeBookmark(bookmarkName).catch(logger.error)
  }

  const columns: ColumnDef<Bookmark>[] = [
    {
      header: 'Name',
      accessorKey: 'name',
    },
    {
      header: 'Created On',
      width: 140,
      cell: (bookmark) => (
        <Typography
          component="span"
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            color: 'text.secondary',
          }}
        >
          {dateString(bookmark.createdOn)}
        </Typography>
      ),
    },
    {
      header: 'Commit',
      width: 80,
      sx: { textAlign: 'center' },
      cell: (bookmark) => (
        <Typography
          component="span"
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            color: 'text.secondary',
            backgroundColor: 'grey.100',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          {bookmark.commit.toSub()}
        </Typography>
      ),
    },
    {
      header: '',
      width: 34,
      cell: (bookmark) => (
        <IconButton
          size="small"
          onClick={(event) => handleDeleteBookmark(event, bookmark.name)}
          sx={{
            width: 34,
            height: 34,
            color: 'text.secondary',
            '&:hover': {
              color: 'error.main',
            },
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ]

  return (
    <>
      {bms.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
          No bookmarks found
        </Typography>
      ) : (
        <Table
          columns={columns}
          data={bms}
          getRowKey={(bookmark) => bookmark.commit.toHex() + bookmark.name}
          onRowClick={(bookmark) => void creagenEditor.checkout(bookmark)}
        />
      )}
    </>
  )
}
