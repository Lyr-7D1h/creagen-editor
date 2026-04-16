import { localStorage } from './LocalStorage'
import type { CustomKeybinding } from '../creagen-editor/keybindings'
import { IndexDBStorage } from 'versie'
import type {
  Storage,
  CommitHash,
  BlobHash,
  Bookmark,
  Commit,
  IndexdbImport,
} from 'versie'
import type { CommitMetadata } from '../creagen-editor/CommitMetadata'
import { logger } from '../logs/logger'

/** Entry point for fetching all data */
export class LocalClientStorage implements Storage<CommitMetadata> {
  static async create() {
    const indexdbStorageResult = await IndexDBStorage.create<CommitMetadata>()
    if (!indexdbStorageResult.ok) throw indexdbStorageResult.error
    if (!indexdbStorageResult.value.persisted)
      logger.warn('Failed to persist storage')
    const indexdb = indexdbStorageResult.value.indexdb
    return new LocalClientStorage(indexdb)
  }

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
