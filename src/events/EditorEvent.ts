import type { CommitHash } from 'versie'
import type { LocalStorageKey, LocalStorageValue } from '../storage/StorageKey'
import type { ParamKey } from '../settings/SettingsConfig'
import type { AnalyzeContainerResult } from '../sandbox/SandboxMessageHandler'

type EditorEvents = {
  'login-prompt': { message?: string }
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
  /** Emitted whenever Sandbox got connected to its iframe */
  'sandbox:connect': void
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
