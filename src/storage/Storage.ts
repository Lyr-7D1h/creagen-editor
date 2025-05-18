import { ID } from '../creagen-editor/id'
import { Generation } from '../vcs/Generation'
import { Refs } from '../vcs/Refs'

export type StorageKey = 'settings' | 'refs' | ID

export abstract class Storage {
  abstract set(id: StorageKey, item: any): Promise<void>

  abstract get(id: 'settings'): Promise<any | null>
  abstract get(id: 'refs'): Promise<Refs | null>
  abstract get(id: ID): Promise<Generation | null>
  abstract get(id: StorageKey): Promise<any | null>
}
