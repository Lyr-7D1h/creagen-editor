import { Bookmark } from './Bookmarks'
import { CommitHash, BlobHash, Commit, MetaData } from './Commit'

export type JsonPrimitive = string | number | boolean
export type JsonValue =
  | JsonPrimitive
  | (JsonValue | null)[]
  | { [key: string]: JsonValue | null }

/** Generic storage interface for fetching and storing vcs objects */
export interface Storage<M extends MetaData> {
  getBookmark(id: string): Promise<JsonValue | null>
  getCommit(id: CommitHash): Promise<JsonValue | null>
  getBlob(id: BlobHash): Promise<Uint8Array | null>
  getDelta(id: BlobHash): Promise<Uint8Array | null>

  /** Overwrite existing bookmark or set a new one */
  setBookmark(bookmark: Bookmark): Promise<void>
  setCommit(commit: Commit<M>): Promise<void>
  setBlob(id: BlobHash, value: Uint8Array): Promise<void>
  setDelta(id: BlobHash, value: Uint8Array): Promise<void>

  removeBookmark(id: string): Promise<void>

  getAllDeltas(): Promise<JsonValue[]>
  getAllBlobs(): Promise<JsonValue[]>
  getAllCommits(): Promise<JsonValue[]>
  getAllBookmarks(): Promise<JsonValue[]>

  import(data: VCSImport): Promise<void>
  export(): Promise<VCSImport>
}

/** A generic type for importing and exporting data */
export interface VCSImport {
  version: number
  bookmarks: Array<{ key: string; value: JsonValue }>
  commits: Array<{ key: string; value: JsonValue }>
  blobs: Array<{ key: string; value: JsonValue }>
  delta: Array<{ key: string; value: JsonValue }>
}
