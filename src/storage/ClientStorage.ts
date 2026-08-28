import type { Bookmark, IndexdbImport, Versie } from 'versie'
import type { CommitMetadata } from '../creagen-editor/CommitMetadata'
import type { CustomKeybinding } from '../creagen-editor/keybindings'

export interface User {
  username: string
}
export interface ClientStorage {
  readonly versie: Versie<CommitMetadata>
  readonly remote: boolean
  readonly user?: User

  setSettings: (value: Record<string, unknown>) => Promise<void>
  getSettings(): Promise<Record<string, unknown> | null>
  setCustomKeybindings(keybindings: CustomKeybinding[]): Promise<void>
  getCustomKeybindings(): Promise<CustomKeybinding[] | null>
  estimateUsage(): Promise<StorageEstimate>

  getUserBookmark(
    bookmarkName: string,
    username?: string,
  ): Promise<Bookmark | null>

  import(data: IndexdbImport): Promise<void>
  export(): Promise<IndexdbImport>

  /** Login, returning a string if it failed with the error message */
  login(
    username: string,
    password: string,
    turnstileToken: string,
  ): Promise<string | true>
  /** Login, returning a string if it failed with the error message */
  register(
    username: string,
    password: string,
    turnstileToken: string,
  ): Promise<string | true>
  /** Revoke the session (best effort) and clear local tokens */
  logout(): void | Promise<void>
}
