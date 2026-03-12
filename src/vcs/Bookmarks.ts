import { z } from 'zod'
import { Commit, CommitHash, commitHashSchema, MetaData } from './Commit'

export const bookmarkNameSchema = z.string().regex(/^[^~:\r\n]{1,32}$/)
export const bookmarkSchema = z
  .object({
    name: bookmarkNameSchema,
    commit: commitHashSchema,
    createdOn: z.number().transform((epochMs) => new Date(epochMs)),
  })
  .transform(({ name, commit, createdOn }) => {
    return new Bookmark(name, commit, createdOn)
  })
export const bookmarksSchema = bookmarkSchema.array().transform((bms) => {
  return new Bookmarks(bms)
})

export class Bookmark {
  constructor(
    readonly name: string,
    readonly commit: CommitHash,
    readonly createdOn: Date,
  ) {}

  toJson() {
    return {
      name: this.name,
      commit: this.commit.toHex(),
      createdOn: this.createdOn.getTime(),
    }
  }
}

/** Simple data structure for modifying and looking up vcs bookmarks in memory */
export class Bookmarks {
  private readonly bookmarks: Map<string, Bookmark>
  // TODO: either use uint8array for indexing or cache base64 for commits
  private readonly lookup: Map<string, Bookmark[]>

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
      return null
    }
    // already exists
    if (typeof this.bookmarks.get(newName) !== 'undefined') {
      return null
    }

    this.bookmarks.delete(oldName)
    this.lookupDelete(oldName, old.commit)
    const newBookmark = new Bookmark(newName, old.commit, old.createdOn)
    this.add(newBookmark)
    return newBookmark
  }

  update(name: string, commit: CommitHash) {
    const bookmark = this.getBookmark(name)
    if (bookmark === null) {
      return null
    }

    // update lookup
    this.lookupDelete(bookmark.name, bookmark.commit)
    const currentBMs = this.lookup.get(commit.toBase64(true))
    this.lookup.set(
      commit.toBase64(true),
      currentBMs ? [...currentBMs, bookmark] : [bookmark],
    )

    const newBookmark = new Bookmark(bookmark.name, commit, bookmark.createdOn)
    this.bookmarks.set(name, newBookmark)

    return newBookmark
  }

  getBookmarks(): Bookmark[] {
    return [...this.bookmarks.values()]
  }

  getBookmark(name: string) {
    return this.bookmarks.get(name) ?? null
  }

  bookmarkLookup(commit: CommitHash): Bookmark[] | null {
    const v = this.lookup.get(commit.toBase64(true))
    if (typeof v === 'undefined') return null
    return v
  }

  private lookupDelete(name: string, commit: CommitHash) {
    const key = commit.toBase64(true)
    const b = this.lookup.get(key)
    if (typeof b === 'undefined') return
    const bms = b.filter((x) => x.name !== name)
    if (bms.length === 0) {
      this.lookup.delete(key)
      return
    }
    this.lookup.set(key, bms)
  }

  add(bookmark: Bookmark) {
    if (this.getBookmark(bookmark.name) !== null) return null
    this.bookmarks.set(bookmark.name, bookmark)
    const currentBMs = this.lookup.get(bookmark.commit.toBase64(true))
    this.lookup.set(
      bookmark.commit.toBase64(true),
      currentBMs ? [...currentBMs, bookmark] : [bookmark],
    )
    return bookmark
  }

  remove(name: string) {
    const bm = this.getBookmark(name)
    if (!bm) return null
    this.bookmarks.delete(name)
    this.lookupDelete(bm.name, bm.commit)
    return bm
  }
}

export function isBookmark(
  bm: Bookmark | Commit<MetaData> | CommitHash,
): bm is Bookmark {
  return 'name' in bm
}
