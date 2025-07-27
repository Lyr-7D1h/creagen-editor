import { Commit } from '../vcs/Commit'
import { AnalyzeContainerResult } from '../sandbox/Sandbox'
import { LocalStorageKey, StorageValue } from '../storage/StorageKey'

type EditorEvents = {
  // VCS events
  'vcs:commit': { commit: Commit; code: string }
  /** Change active head */
  'vcs:checkout': { old: Commit | null; new: Commit }
  'vcs:renameRef': void

  // Settings events
  'settings:changed': { key: string; value: any; oldValue?: any }

  // Sandbox events
  'sandbox:loaded': void
  'sandbox:analysis-complete': { result: AnalyzeContainerResult }
  'sandbox:error': { error: Error }
  'sandbox:render-complete': void

  // Editor events
  'editor:code-changed': { code: string; hasChanges: boolean }
  'editor:libraries-changed': { libraries: any[] }
  'editor:tab-changed': { activeTab: string }
  'editor:save': { code: string }

  'local-storage': {
    key: LocalStorageKey
    value: StorageValue<LocalStorageKey>
  }
}

export type EditorEvent = keyof EditorEvents
export type EditorEventData<T extends EditorEvent> = EditorEvents[T]

export const EDITOR_EVENTS: ReadonlyArray<EditorEvent> = [
  // TODO fill
  // VCS events
  'vcs:commit',
  'vcs:checkout',

  // Settings events
  'settings:changed',

  // Sandbox events
  'sandbox:loaded',
  'sandbox:error',
  'sandbox:render-complete',

  // Editor events
  'editor:code-changed',
  'editor:libraries-changed',
  'editor:tab-changed',
  'editor:save',
]
