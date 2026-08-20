import type { Bookmark, IndexdbImport } from 'versie'
import { IndexDBStorage, Versie } from 'versie'
import { CommitMetadata } from '../creagen-editor/CommitMetadata'
import type { CustomKeybinding } from '../creagen-editor/keybindings'
import { logger } from '../logs/logger'
import type { JwtPayload } from '../user/jwt'
import type { ClientStorage } from './ClientStorage'
import { localStorage } from './LocalStorage'

/** Entry point for fetching all data */
export class LocalClientStorage implements ClientStorage {
  static async create() {
    const indexdbStorageResult = await IndexDBStorage.create<CommitMetadata>()
    if (!indexdbStorageResult.ok) throw indexdbStorageResult.error
    if (!indexdbStorageResult.value.persisted)
      logger.warn('Local storage might not be persisted')
    const indexdb = indexdbStorageResult.value.indexdb

    const vcsResult = await Versie.create(indexdb, (raw) => {
      return CommitMetadata.parse(raw)
    })
    if (!vcsResult.ok) throw vcsResult.error
    const versie = vcsResult.value

    return new LocalClientStorage(versie, indexdb)
  }

  readonly remote = false
  /** Needed for interface compat with `RemoteClientStorage` */
  readonly user = undefined
  constructor(
    readonly versie: Versie<CommitMetadata>,
    readonly indexdb: IndexDBStorage<CommitMetadata>,
  ) {}

  login(
    _username: string,
    _password: string,
    _turnstileToken: string,
  ): Promise<string | true> {
    throw new Error('Method not implemented.')
  }
  register(): Promise<string | true> {
    throw new Error('Method not implemented.')
  }
  session(): JwtPayload {
    throw new Error('Method not implemented.')
  }
  logout(): void {
    throw new Error('Method not implemented.')
  }

  setSettings(value: Record<string, unknown>) {
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
  getUserBookmark(
    bookmarkName: string,
    _user?: string,
  ): Promise<Bookmark | null> {
    return Promise.resolve(this.versie.getBookmark(bookmarkName))
  }

  estimateUsage() {
    return navigator.storage.estimate()
  }

  import(data: IndexdbImport) {
    return this.indexdb.import(data)
  }
  export() {
    return this.indexdb.export()
  }
}
