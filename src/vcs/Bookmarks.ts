import { z } from 'zod'
import { Commit, CommitHash, commitHashSchema, MetaData } from './Commit'
import { StorageError, VCSStorage } from './VCSStorage'
import { Result } from 'typescript-result'
import { VCSError } from './VCSError'

export class BookmarkAlreadyExistsError extends VCSError {
  readonly type = 'bookmark-already-exists'

  constructor(name: string) {
    super(`Bookmark '${name}' already exists`)
  }
}

export class BookmarkNotFoundError extends VCSError {
  readonly type = 'bookmark-not-found'

  constructor(name: string) {
    super(`Bookmark '${name}' not found`)
  }
}

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

export class Bookmark {
  constructor(
    /** Unique bookmark name */
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
export class Bookmarks<M extends MetaData> {
  private readonly bookmarks: Map<string, Bookmark>
  // TODO: either use uint8array for indexing or cache base64 for commits
  private readonly lookup: Map<string, Bookmark[]>

  static async create<M extends MetaData>(storage: VCSStorage<M>) {
    return Result.gen(function* () {
      const bms = yield* storage.getAllBookmarks()
      return new Bookmarks(bms, storage)
    })
  }

  constructor(
    bookmarks: Bookmark[],
    private readonly storage: VCSStorage<M>,
  ) {
    this.bookmarks = new Map()
    this.lookup = new Map()
    for (const bm of bookmarks) {
      this.bookmarks.set(bm.name, bm)
      this.lookupAdd(bm)
    }
  }

  /** Rename bookmark and return reference to new bookmark */
  async rename(
    oldName: string,
    newName: string,
  ): Promise<
    Result<
      Bookmark,
      StorageError | BookmarkAlreadyExistsError | BookmarkNotFoundError
    >
  > {
    // old doesn't exist
    const old = this.bookmarks.get(oldName)
    if (typeof old === 'undefined')
      return Result.error(new BookmarkNotFoundError(oldName))
    // already exists
    if (this.getBookmark(newName) !== null)
      return Result.error(new BookmarkAlreadyExistsError(newName))

    this.bookmarks.delete(oldName)
    this.lookupDelete(oldName, old.commit)
    const res1 = await this.storage.removeBookmark(oldName)
    if (!res1.ok) return res1

    const newBookmark = new Bookmark(newName, old.commit, old.createdOn)
    this.bookmarks.set(newBookmark.name, newBookmark)
    this.lookupAdd(newBookmark)
    const res2 = await this.storage.setBookmark(newBookmark)
    if (!res2.ok) return res2

    return Result.ok(newBookmark)
  }

  async setCommit(
    bookmarkName: string,
    commit: CommitHash,
  ): Promise<Result<Bookmark, BookmarkNotFoundError | StorageError>> {
    const bookmark = this.getBookmark(bookmarkName)
    if (bookmark === null) {
      return Result.error(new BookmarkNotFoundError(bookmarkName))
    }

    // update lookup
    this.lookupDelete(bookmark.name, bookmark.commit)
    const currentBMs = this.lookup.get(commit.toBase64(true))
    this.lookup.set(
      commit.toBase64(true),
      currentBMs ? [...currentBMs, bookmark] : [bookmark],
    )

    const newBookmark = new Bookmark(bookmark.name, commit, bookmark.createdOn)
    this.bookmarks.set(bookmarkName, newBookmark)

    const res = await this.storage.setBookmark(newBookmark)
    if (!res.ok) return res

    return Result.ok(newBookmark)
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

  private lookupAdd(bookmark: Bookmark) {
    const commit = bookmark.commit.toBase64(true)
    const bms = this.lookup.get(commit)
    this.lookup.set(commit, bms ? [...bms, bookmark] : [bookmark])
  }

  async add(
    bookmark: Bookmark,
  ): Promise<Result<Bookmark, BookmarkAlreadyExistsError | StorageError>> {
    if (this.getBookmark(bookmark.name) !== null)
      return Result.error(new BookmarkAlreadyExistsError(bookmark.name))

    this.bookmarks.set(bookmark.name, bookmark)
    this.lookupAdd(bookmark)

    const res = await this.storage.setBookmark(bookmark)
    if (!res.ok) return res
    return Result.ok(bookmark)
  }

  async remove(
    name: string,
  ): Promise<Result<Bookmark, BookmarkNotFoundError | StorageError>> {
    const bm = this.getBookmark(name)
    if (!bm) return Result.error(new BookmarkNotFoundError(name))
    this.bookmarks.delete(name)
    this.lookupDelete(bm.name, bm.commit)
    const res = await this.storage.removeBookmark(name)
    if (!res.ok) return res
    return Result.ok(bm)
  }
}

export function isBookmark(
  bm: Bookmark | Commit<MetaData> | CommitHash,
): bm is Bookmark {
  return 'name' in bm
}
