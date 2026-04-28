import {
  Bookmark,
  BookmarkAlreadyExistsError,
  BookmarkNotFoundError,
  DeltizingError,
  StorageError,
} from 'versie'
import { logger } from '../logs/logger'
import { UrlMutator } from '../UrlMutator'
import { CommitMetadata } from './CommitMetadata'
import type { CreagenEditor } from './CreagenEditor'
import { creagenEditorVersionMismatch } from './creagenEditorVersionMatches'
import { generateHumanReadableName } from './generateHumanReadableName'

/** Update creagen state from url data */
export async function updateFromUrl(editor: CreagenEditor) {
  const mutator = new UrlMutator()
  updateSettingsFromQueryParams(editor, mutator)

  if (await updateFromSharableLinkData(editor, mutator)) {
    return
  }

  await updateFromCommit(editor, mutator)
}

// TODO: make it work with remote enabled build, currently can't make commits when remote is enabled
async function updateFromSharableLinkData(
  editor: CreagenEditor,
  mutator: UrlMutator,
) {
  const sharableDataLink = mutator.getSharableLinkData()
  if (sharableDataLink === null) return null
  if (sharableDataLink instanceof Error) {
    logger.error(sharableDataLink)
    return null
  }

  const { code, editorVersion, libraries, author } = sharableDataLink
  creagenEditorVersionMismatch(editorVersion)

  // create a commit
  const metadata = new CommitMetadata(editorVersion, libraries, author)
  const commitResult = await editor.createCommit(code, metadata)
  if (!commitResult.ok) {
    logger.error(commitResult.error)
    return null
  }
  const commit = commitResult.value
  if (commit === null) return null

  let bookmarkName = sharableDataLink.bookmarkName
  let bookmark: Awaited<ReturnType<typeof editor.addBookmark>>
  // try and add bookmark, with different names if failed
  // We only retry on collisions; all other errors should stop processing.
  while (
    !(bookmark = await editor.addBookmark(
      new Bookmark(bookmarkName, commit.hash, new Date()),
    )).ok
  ) {
    const retryWithNewName = bookmark
      .match()
      .when(BookmarkAlreadyExistsError, () => true)
      .when(StorageError, DeltizingError, BookmarkNotFoundError, () => false)
      .run()
    if (!retryWithNewName) {
      return null
    }
    bookmarkName = generateHumanReadableName()
    logger.warn(
      `Failed to update bookmark from data: ${bookmark.error.message}`,
    )
  }

  try {
    await editor.checkoutBookmark(bookmark.value.name)
  } catch (e) {
    logger.error(e)
    return null
  }

  return true
}

async function updateFromCommit(editor: CreagenEditor, mutator: UrlMutator) {
  const version = mutator.getVersion()
  if (version === null) {
    const res = await editor.new()
    if (!res.ok) logger.error(res.error)
    return
  }

  if (version.type === 'bookmark') {
    await editor
      .checkoutBookmark(version.bookmark, version.username)
      .catch((e) =>
        logger.error(`Failed to checkout bookmark ${version.bookmark}: `, e),
      )
    return
  }

  const commit = version.commit
  // if commit is part of bookmark just use that bookmark name
  const bookmarks = editor.bookmarkLookup(commit)
  if (bookmarks !== null && bookmarks.length > 0) {
    const mostRecent = bookmarks.sort(
      (a, b) => b.createdOn.getTime() - a.createdOn.getTime(),
    )[0]!
    await editor.checkoutBookmark(mostRecent.name)
    return
  }

  await editor.checkoutCommitHeadless(commit)
  return
}

/** Update settings from query params */
function updateSettingsFromQueryParams(
  editor: CreagenEditor,
  mutator: UrlMutator,
) {
  mutator.forEachQueryParam((value, key) => {
    if (!editor.settings.isParam(key)) {
      return
    }

    const parser = editor.settings.config[key].fromQueryParam
    if (typeof parser === 'undefined') {
      return
    }

    const paramValue = parser(value)
    editor.settings.set(key, paramValue)
  })
}
