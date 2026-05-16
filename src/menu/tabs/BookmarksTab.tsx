import DeleteIcon from '@mui/icons-material/Delete'
import { IconButton, Typography } from '@mui/material'
import type React from 'react'
import type { Bookmark } from 'versie'
import { useCreagenEditor } from '../../creagen-editor/CreagenContext'
import { useBookmarks } from '../../events/useEditorEvents'
import { logger } from '../../logs/logger'
import type { ColumnDef } from '../../shared/Table'
import { Table } from '../../shared/Table'
import { dateString } from '../../util'

export const BookmarksTab = () => {
  const creagenEditor = useCreagenEditor()
  const bookmarks = useBookmarks()

  bookmarks.sort((a, b) => b.createdOn.getTime() - a.createdOn.getTime())

  const handleDeleteBookmark = (
    event: React.MouseEvent,
    bookmarkName: string,
  ) => {
    event.stopPropagation()
    creagenEditor.removeBookmark(bookmarkName).catch(logger.error)
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
            backgroundColor: 'background.paper',
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
      {bookmarks.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
          No bookmarks found
        </Typography>
      ) : (
        <Table
          columns={columns}
          data={bookmarks}
          getRowKey={(bookmark) => bookmark.commit.toHex() + bookmark.name}
          onRowClick={(bookmark) => {
            creagenEditor.checkoutBookmark(bookmark.name).catch(logger.error)
          }}
        />
      )}
    </>
  )
}
