import { Commit, CommitHash, BlobHash } from './Commit'
import { Bookmarks } from './Bookmarks'

export interface Storage {
  get(key: 'bookmarks'): Promise<Bookmarks | null>
  get(key: 'commit', id: CommitHash): Promise<Commit | null>
  get(key: 'blob', id: BlobHash): Promise<string | null>
  set(key: 'bookmarks', value: Bookmarks): Promise<void>
  set(key: 'commit', value: Commit, id: CommitHash): Promise<void>
  set(key: 'blob', value: string, id: BlobHash, base?: BlobHash): Promise<void>
  getAllCommits(): Promise<Commit[]>
}
