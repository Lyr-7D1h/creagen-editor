import { z } from 'zod'
import { Commit, CommitHash, commitHashSchema } from './Commit'
import { logger } from '../logs/logger'

export const bookmarkNameSchema = z.string().regex(/^[^~:\r\n]{1,32}$/)
export const bookmarkSchema = z.object({
  name: bookmarkNameSchema,
  commit: commitHashSchema,
  createdOn: z.number().transform((epochMs) => new Date(epochMs)),
})

export type Bookmark = z.infer<typeof bookmarkSchema>

export function bookmarkToJson(ref: Bookmark) {
  return {
    ...ref,
    commit: ref.commit.toHex(),
    createdOn: ref.createdOn.getTime(),
  }
}

/** Simple data structure for modifying and looking up vcs bookmarks */
export class Bookmarks {
  private bookmarks: Map<string, Bookmark>
  private lookup: Map<string, Bookmark[]>

  constructor(bookmarks: Bookmark[]) {
    this.bookmarks = new Map()
    this.lookup = new Map()
    for (const bm of bookmarks) {
      this.add(bm)
    }
  }

  rename(oldName: string, newName: string) {
    // old doesn't exist
    const old = this.bookmarks.get(oldName)
    if (typeof old === 'undefined') {
      logger.error(`'${oldName}' could not be found`)
      return null
    }
    // already exists
    if (typeof this.bookmarks.get(newName) !== 'undefined') {
      logger.error(`'${newName}' already exists`)
      return null
    }

    this.bookmarks.delete(oldName)
    this.lookup.delete(old.commit.toBase64())
    const newBookmark = { ...old, name: newName }
    this.add(newBookmark)
    return newBookmark
  }

  update(name: string, commit: CommitHash) {
    const bookmark = this.getBookmark(name)
    if (bookmark === null) return null
    this.lookup.delete(bookmark.commit.toBase64())
    const newBookmark = { ...bookmark, commit }
    this.add(newBookmark)
    return newBookmark
  }

  getBookmarks(): Bookmark[] {
    return [...this.bookmarks.values()]
  }

  getBookmark(name: string) {
    return this.bookmarks.get(name) ?? null
  }

  bookmarkLookup(commit: CommitHash): Bookmark[] | null {
    const v = this.lookup.get(commit.toBase64())
    if (typeof v === 'undefined') return null
    return v
  }

  add(bookmark: Bookmark) {
    this.bookmarks.set(bookmark.name, bookmark)
    const currentBMs = this.lookup.get(bookmark.commit.toBase64())
    this.lookup.set(
      bookmark.commit.toBase64(),
      currentBMs ? [...currentBMs, bookmark] : [bookmark],
    )
  }

  remove(name: string) {
    const ref = this.getBookmark(name)
    if (!ref) return null
    this.bookmarks.delete(name)
    this.lookup.delete(ref?.commit.toBase64())
    return ref
  }
}

export function isBookmark(bm: Bookmark | Commit | CommitHash): bm is Bookmark {
  return 'name' in bm
}
