import React from 'react'
import { useCreagenEditor } from '../../creagen-editor/CreagenEditorView'
import { Typography, Box, IconButton } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { useBookmarks } from '../../events/useEditorEvents'

export function VCSTab() {
  const creagenEditor = useCreagenEditor()
  const vcs = creagenEditor.vcs
  const bms = useBookmarks().getBookmarks()

  bms.sort((a, b) => b.createdOn.getTime() - a.createdOn.getTime())

  const handleDeleteBookmark = (
    event: React.MouseEvent,
    bookmarkName: string,
  ) => {
    event.stopPropagation()
    vcs.removeBookmark(bookmarkName)
  }

  return (
    <>
      {bms.length === 0 ? (
        <Typography component="span">No bookmarks found</Typography>
      ) : (
        ''
      )}
      {bms.map((bookmark) => (
        <React.Fragment key={bookmark.commit + bookmark.name}>
          <Box
            onClick={() => creagenEditor.checkout(bookmark)}
            sx={{
              marginLeft: 2,
              padding: 1,
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography component="span">{bookmark.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
              <IconButton
                size="small"
                onClick={(event) => handleDeleteBookmark(event, bookmark.name)}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'error.main',
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </React.Fragment>
      ))}
    </>
  )
}
