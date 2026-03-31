import { logger } from '../logs/logger'
import { UrlMutator } from '../UrlMutator'
import { generateHumanReadableName } from './generateHumanReadableName'
import { Bookmark, BookmarkAlreadyExistsError } from 'versie'
import { StorageError } from 'versie'
import { CommitMetadata } from './CommitMetadata'
import { CreagenEditor } from './CreagenEditor'
import { creagenEditorVersionMismatch } from './creagenEditorVersionMatches'

/** Update creagen state from url data */
export async function updateFromUrl(editor: CreagenEditor) {
  const mutator = new UrlMutator()
  loadFromQueryParams(editor, mutator)

  if (await updateFromSharableLinkData(editor, mutator)) {
    return
  }

  await updateFromCommit(editor, mutator)
}

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
      .when(StorageError, () => false)
      .run()
    if (!retryWithNewName) {
      return null
    }
    bookmarkName = generateHumanReadableName()
    logger.warn(
      `Failed to update bookmark from data: ${bookmark.error.message}`,
    )
  }

  const checkoutResult = await editor.checkout(bookmark.value)
  if (!checkoutResult.ok) {
    logger.error(checkoutResult.error)
    return null
  }
  return true
}

async function updateFromCommit(editor: CreagenEditor, mutator: UrlMutator) {
  const commit = await mutator.getCommit()
  if (commit === null) {
    editor.new()
    return
  }
  if (commit instanceof Error) {
    logger.error(commit)
    return commit
  }

  // if commit is part of bookmark just use that bookmark name
  const bookmarks = editor.bookmarkLookup(commit)
  if (bookmarks !== null && bookmarks.length > 0) {
    const mostRecent = bookmarks.sort(
      (a, b) => b.createdOn.getTime() - a.createdOn.getTime(),
    )[0]!
    editor
      .checkout(mostRecent)
      .then((result) => {
        if (!result.ok) logger.error(result.error)
      })
      .catch(logger.error)
    return
  }

  const checkoutResult = await editor.checkout(commit)
  if (!checkoutResult.ok) {
    logger.error(checkoutResult.error)
  }
  return
}

/** Update settings from query params */
function loadFromQueryParams(editor: CreagenEditor, mutator: UrlMutator) {
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
