import { CommitHash } from 'versie'
import { LocalStorageKey, LocalStorageValue } from '../storage/StorageKey'
import { ParamKey } from '../settings/SettingsConfig'
import { AnalyzeContainerResult } from '../sandbox/SandboxMessageHandler'

type EditorEvents = {
  'login-prompt': void
  render: void

  'controller:connected': void

  'deps:remove': string
  'deps:add': string

  /** Params config update */
  'params:config': void
  /** Params value update */
  'params:value': void

  // VCS events
  'vcs:commit': { commit: CommitHash; code: string }
  /** Change active head */
  'vcs:checkout': {
    old?: CommitHash
    new?: CommitHash
  }
  'vcs:bookmark-update': void

  // Settings events
  /** A single setting changed  */
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
  'editor:code-dirty': void
  'editor:libraries-changed': { libraries: unknown[] }
  'editor:tab-changed': { activeTab: string }
  'editor:save': { code: string }

  'local-storage': {
    key: LocalStorageKey
    value: LocalStorageValue<LocalStorageKey>
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
  'editor:code-dirty',
  'editor:libraries-changed',
  'editor:tab-changed',
  'editor:save',

  'local-storage',
]
