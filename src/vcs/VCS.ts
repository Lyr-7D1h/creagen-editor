import { ID } from '../creagen-editor/id'
import { logger } from '../logs/logger'
import { Library } from '../settings/SettingsConfig'
import { Storage } from '../storage/Storage'
import { Generation } from './Generation'
import { Refs } from './Refs'

function getActiveIdFromPath(): ID | null {
  const path = window.location.pathname.replace('/', '')

  if (path.length === 0) return null

  const id = ID.fromString(path)

  if (id === null) {
    logger.error('invalid id given')
    return null
  }

  return id
}

/** Version Control Software for creagen-editor */
export class VCS {
  storage: Storage

  private _head: ID | null = getActiveIdFromPath()
  /** References to ids, null if not loaded */
  private _refs: Refs | null = null

  constructor(storage: Storage) {
    this.storage = storage
  }

  get head() {
    return this._head
  }

  get refs() {
    if (this.refs === null) throw Error('VCS not yet loaded')
    return this._refs
  }

  async load() {
    this._refs = (await this.storage.get('refs')) ?? new Refs([])
  }

  /**
   * Get history
   * @param n - How far to go back
   */
  async history(n: number): Promise<[ID, Generation][]> {
    const history: [ID, Generation][] = []
    let id = this._head
    for (let i = 0; i < n; i++) {
      if (!id) break
      const item = await this.storage.get(id)
      if (item === null) break
      history.push([id, item])
      id = item?.previous ?? null
    }
    return history
  }

  async commit(code: string, libraries: Library[]): Promise<void> {
    const id = await ID.create(code, libraries)
    if (id.toString() === this.head?.toString()) return

    this._head = id
    const gen: Generation = {
      code,
      createdOn: new Date(),
      previous: this.head ?? undefined,
    }

    // only save the generation if the code changed
    if (id.hash !== this._head?.hash) {
      await this.storage.set(id, gen)
    }
    const url = new URL(window.location as any)
    url.pathname = id.toString()
    window.history.pushState('Creagen', '', url)
  }

  async checkout(id: ID): Promise<Generation | null> {
    this._head = id
    return await this.storage.get(id)
  }
}
