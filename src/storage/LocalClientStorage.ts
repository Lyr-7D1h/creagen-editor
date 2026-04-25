import type {
  BlobHash,
  Bookmark,
  Commit,
  CommitHash,
  IndexdbImport,
  Storage,
} from 'versie'
import { IndexDBStorage } from 'versie'
import type { CommitMetadata } from '../creagen-editor/CommitMetadata'
import type { CustomKeybinding } from '../creagen-editor/keybindings'
import { logger } from '../logs/logger'
import { localStorage } from './LocalStorage'

/** Entry point for fetching all data */
export class LocalClientStorage implements Storage<CommitMetadata> {
  static async create() {
    const indexdbStorageResult = await IndexDBStorage.create<CommitMetadata>()
    if (!indexdbStorageResult.ok) throw indexdbStorageResult.error
    if (!indexdbStorageResult.value.persisted)
      logger.warn('Local storage might not be persisted')
    const indexdb = indexdbStorageResult.value.indexdb
    return new LocalClientStorage(indexdb)
  }

  readonly remote = false
  /** Needed for interface compat with `RemoteClientStorage` */
  readonly user = undefined
  constructor(readonly indexdb: IndexDBStorage<CommitMetadata>) {}

  setSettings(value: unknown) {
    return Promise.resolve(localStorage.set('settings', value))
  }
  getSettings() {
    return Promise.resolve(localStorage.get('settings'))
  }
  setCustomKeybindings(keybindings: CustomKeybinding[]) {
    return Promise.resolve(localStorage.set('custom-keybindings', keybindings))
  }
  getCustomKeybindings() {
    return Promise.resolve(localStorage.get('custom-keybindings'))
  }

  getCommit(id: CommitHash) {
    return this.indexdb.getCommit(id)
  }
  getCommitData(hash: BlobHash) {
    return this.indexdb.getCommitData(hash)
  }
  getBookmark(bookmarkName: string) {
    return this.indexdb.getBookmark(bookmarkName)
  }
  setBookmark(bookmark: Bookmark) {
    return this.indexdb.setBookmark(bookmark)
  }
  setCommit(commit: Commit<CommitMetadata>, data: string) {
    return this.indexdb.setCommit(commit, data)
  }
  removeBookmark(id: string) {
    return this.indexdb.removeBookmark(id)
  }
  getAllCommits() {
    return this.indexdb.getAllCommits()
  }
  getAllBookmarks() {
    return this.indexdb.getAllBookmarks()
  }

  import(data: IndexdbImport) {
    return this.indexdb.import(data)
  }
  export() {
    return this.indexdb.export()
  }

  estimateUsage() {
    return navigator.storage.estimate()
  }
}
