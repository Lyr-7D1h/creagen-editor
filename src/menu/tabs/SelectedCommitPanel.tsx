import { Box, Button, Menu, MenuItem, Typography } from '@mui/material'
import type React from 'react'
import { useState } from 'react'
import type { Commit, CommitHash } from 'versie'
import type { CommitMetadata } from '../../creagen-editor/CommitMetadata'
import { useCreagenEditor } from '../../creagen-editor/CreagenContext'
import type { ActiveBookmark } from '../../creagen-editor/CreagenEditor'
import { logger } from '../../logs/logger'

interface SelectedCommitPanelProps {
  selectedCommit: Commit<CommitMetadata>
  onFocusCommit: (hash: string) => void
}

export function SelectedCommitPanel({
  selectedCommit,
  onFocusCommit,
}: SelectedCommitPanelProps) {
  const creagenEditor = useCreagenEditor()
  const [checkoutMenuAnchor, setCheckoutMenuAnchor] =
    useState<null | HTMLElement>(null)

  const handleCheckout = async (commit: CommitHash) => {
    try {
      await creagenEditor.checkoutCommitHeadless(commit)
      logger.info('Successfully checked out commit', {
        hash: commit.toHex(),
      })
      onFocusCommit(commit.toHex())
    } catch (e) {
      logger.error(`Failed to checkout ${commit.toSub()}: `, e)
    }
  }

  const handleSetActiveBookmarkCommit = async (commit: CommitHash) => {
    try {
      const bookmark = await creagenEditor.setBookmarkCommit(
        creagenEditor.activeBookmark.name,
        commit,
      )
      logger.info('Successfully checked out bookmark', {
        bookmark: bookmark.name,
      })
      onFocusCommit(commit.toHex())
    } catch (e) {
      logger.error('Failed to checkout bookmark', e)
    }
  }

  const handleCheckoutCommitAsBookmark = async (
    commit: Commit<CommitMetadata>,
    bookmarkName: string,
  ) => {
    try {
      await creagenEditor.setBookmarkCommit(bookmarkName, commit.hash)
      await creagenEditor.checkoutBookmark(bookmarkName)
      logger.info('Successfully checked out commit as bookmark', {
        hash: commit.hash.toHex(),
        bookmark: bookmarkName,
      })
      onFocusCommit(commit.hash.toHex())
    } catch (e) {
      logger.error(e)
      setCheckoutMenuAnchor(null)
    }
    setCheckoutMenuAnchor(null)
  }

  const handleOpenCheckoutMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    setCheckoutMenuAnchor(event.currentTarget)
  }

  const handleCloseCheckoutMenu = () => {
    setCheckoutMenuAnchor(null)
  }

  const isCurrentCommit =
    creagenEditor.head?.hash.toHex() === selectedCommit.hash.toHex()

  const commitBookmarks: (ActiveBookmark & { active?: boolean })[] = [
    ...(creagenEditor.bookmarkLookup(selectedCommit.hash) ?? []),
    ...(creagenEditor.activeBookmark.commit
      ? [{ ...creagenEditor.activeBookmark, active: true as const }]
      : []),
  ]

  const renderCheckoutBookmarkButton =
    commitBookmarks.length === 0 ? null : commitBookmarks.length === 1 ? (
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          const bookmark = commitBookmarks[0]!
          if (bookmark.active) {
            handleSetActiveBookmarkCommit(selectedCommit.hash).catch(
              console.error,
            )
          } else {
            handleCheckoutCommitAsBookmark(selectedCommit, bookmark.name).catch(
              console.error,
            )
          }
        }}
      >
        Checkout as {commitBookmarks[0]!.name}
      </Button>
    ) : (
      <>
        <Button
          variant="outlined"
          size="small"
          onClick={handleOpenCheckoutMenu}
          disabled={isCurrentCommit}
        >
          Checkout as...
        </Button>
        <Menu
          anchorEl={checkoutMenuAnchor}
          open={Boolean(checkoutMenuAnchor)}
          onClose={handleCloseCheckoutMenu}
        >
          {commitBookmarks.map((bookmark) => (
            <MenuItem
              key={bookmark.name}
              onClick={() => {
                if (bookmark.active) {
                  handleSetActiveBookmarkCommit(selectedCommit.hash).catch(
                    console.error,
                  )
                } else {
                  handleCheckoutCommitAsBookmark(
                    selectedCommit,
                    bookmark.name,
                  ).catch(console.error)
                }
              }}
            >
              {bookmark.name} {bookmark.active ? '(active)' : ''}
            </MenuItem>
          ))}
        </Menu>
      </>
    )

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography variant="subtitle2">Selected Commit</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {renderCheckoutBookmarkButton}
          <Button
            variant="contained"
            size="small"
            onClick={() => void handleCheckout(selectedCommit.hash)}
            disabled={isCurrentCommit}
          >
            {isCurrentCommit ? 'Current' : 'Checkout'}
          </Button>
        </Box>
      </Box>

      <Typography variant="body2">
        <strong>Hash:</strong> {selectedCommit.hash.toHex()}
      </Typography>
      <Typography variant="body2">
        <strong>Blob Hash:</strong> {selectedCommit.blob.toHex()}
      </Typography>
      <Typography variant="body2">
        <strong>Author:</strong> {selectedCommit.metadata.author ?? 'local'}
      </Typography>
      <Typography variant="body2">
        <strong>Created:</strong> {selectedCommit.createdOn.toLocaleString()}
      </Typography>
      <Typography variant="body2">
        <strong>Editor Version:</strong>{' '}
        {selectedCommit.metadata.editorVersion.toString()}
      </Typography>
      <Typography variant="body2">
        <strong>Libraries:</strong>{' '}
        {selectedCommit.metadata.libraries.map((l) => l.name).join(', ') ||
          'None'}
      </Typography>
      {selectedCommit.parent && (
        <Typography variant="body2">
          <strong>Parent:</strong> {selectedCommit.parent.toHex()}
        </Typography>
      )}
      {(() => {
        const bookmarksForCommit = creagenEditor.bookmarkLookup(
          selectedCommit.hash,
        )
        if (bookmarksForCommit && bookmarksForCommit.length > 0) {
          return (
            <Typography variant="body2">
              <strong>Bookmarks:</strong>{' '}
              {bookmarksForCommit.map((b) => b.name).join(', ')}
            </Typography>
          )
        }
        return null
      })()}
    </Box>
  )
}
