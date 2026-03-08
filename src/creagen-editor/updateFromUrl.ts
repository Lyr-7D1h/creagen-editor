import { logger } from '../logs/logger'
import { UrlMutator } from '../UrlMutator'
import { generateHumanReadableName } from '../vcs/generateHumanReadableName'
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

  const { code, editorVersion, libraries, createdOn, author } = sharableDataLink
  creagenEditorVersionMismatch(editorVersion)

  // create a commit
  const commit = await editor.vcs.commit(code, libraries, false, {
    createdOn,
    author,
    parent: null,
    editorVersion,
  })
  if (commit === null) {
    return null
  }

  let bookmarkName = sharableDataLink.bookmarkName
  let bookmark
  // try and add bookmark, with different names if failed
  while (
    (bookmark = await editor.vcs.addBookmark(bookmarkName, commit.hash)) ===
    null
  ) {
    bookmarkName = generateHumanReadableName()
    logger.warn(`Failed to update bookmark from data, trying ${bookmarkName}`)
  }

  await editor.checkout(bookmark)
  return true
}

async function updateFromCommit(editor: CreagenEditor, mutator: UrlMutator) {
  const commit = await mutator.getCommit()
  if (commit === null) {
    return
  }
  if (commit instanceof Error) {
    logger.error(commit)
    return commit
  }

  // if commit is part of bookmark just use that bookmark name
  const bookmarks = editor.vcs.bookmarkLookup(commit)
  if (bookmarks !== null && bookmarks.length > 0) {
    const mostRecent = bookmarks.sort(
      (a, b) => b.createdOn.getTime() - a.createdOn.getTime(),
    )[0]!
    editor.checkout(mostRecent).catch(logger.error)
    return
  }

  await editor.checkout(commit)
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
