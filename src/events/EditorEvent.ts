import { Commit } from '../vcs/Commit'
import { LocalStorageKey, StorageValue } from '../storage/StorageKey'
import { ParamKey } from '../settings/SettingsConfig'
import { AnalyzeContainerResult } from '../sandbox/SandboxMessageHandler'

type EditorEvents = {
  render: void

  'deps:remove': string
  'deps:add': string

  // Parameter configs got updated
  'params:update': void

  // VCS events
  'vcs:commit': { commit: Commit; code: string }
  /** Change active head */
  'vcs:checkout': { old: Commit | null; new: Commit | null }
  'vcs:bookmark-update': void

  // Settings events
  'settings:changed': {
    key: ParamKey
    value: unknown
    oldValue?: unknown
  }

  // Sandbox events
  'sandbox:analysis-complete': { result: AnalyzeContainerResult }
  'sandbox:error': { error: Error }
  'sandbox:render': void
  'sandbox:render-complete': void
  'sandbox:freeze': void
  'sandbox:unfreeze': void

  // Editor events
  'editor:code-changed': { code: string; hasChanges: boolean }
  'editor:libraries-changed': { libraries: unknown[] }
  'editor:tab-changed': { activeTab: string }
  'editor:save': { code: string }

  'local-storage': {
    key: LocalStorageKey
    value: StorageValue<LocalStorageKey>
  }

  welcome: boolean
}

export type EditorEvent = keyof EditorEvents
export type EditorEventData<T extends EditorEvent> = EditorEvents[T]

export const EDITOR_EVENTS: ReadonlyArray<EditorEvent> = [
  // TODO fill
  // VCS events
  'vcs:commit',
  'vcs:checkout',
  'vcs:bookmark-update',

  // Settings events
  'settings:changed',

  // Sandbox events
  'sandbox:analysis-complete',
  'sandbox:error',
  'sandbox:render-complete',

  // Editor events
  'editor:code-changed',
  'editor:libraries-changed',
  'editor:tab-changed',
  'editor:save',

  'local-storage',
]
