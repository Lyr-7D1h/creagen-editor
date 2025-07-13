import { ID } from '../vcs/id'
import { AnalyzeContainerResult } from '../sandbox/Sandbox'
import { Generation } from '../vcs/Generation'

interface EditorEvents {
  // VCS events
  'vcs:commit': { id: ID; generation: Generation; code: string }
  'vcs:checkout': { old: ID | null; new: ID }

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
