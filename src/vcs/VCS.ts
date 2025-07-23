import { ID } from './id'
import { createContextLogger } from '../logs/logger'
import { Library } from '../settings/SettingsConfig'
import { Generation } from './Generation'
import { Ref, Refs } from './Refs'
import { editorEvents } from '../events/events'
import { generateHumanReadableName } from './generateHumanReadableName'
import { ClientStorage } from '../storage/ClientStorage'

export function getIdFromPath(): ID | null {
  const path = window.location.pathname.replace('/', '')

  if (path.length === 0) return null

  const id = ID.fromString(path)

  if (typeof id === 'string') {
    logger.error('Invalid id given: ', id)
    return null
  }

  return id
}

export type HistoryItem = {
  id: ID
  generation: Generation
  refs: Ref[]
}

/** Active Reference, a reference that might not be comitted yet */
export type ActiveRef = Omit<Ref, 'id'> & {
  /** If set it means that the ref is stored */
  id?: ID
}

const logger = createContextLogger('vcs')

/** Version Control Software for creagen-editor */
export class VCS {
  storage: ClientStorage

  private _activeRef: ActiveRef
  private _head: ID | null = getIdFromPath()
  /** References to ids, null if not loaded */
  private readonly _refs: Refs

  static async create(storage: ClientStorage) {
    const refs = (await storage.get('refs')) ?? new Refs([])
    const activeRef = (await storage.get('active-ref')) ?? {
      name: generateHumanReadableName(),
      createdOn: new Date(),
    }
    return new VCS(storage, refs, activeRef)
  }

  private constructor(
    storage: ClientStorage,
    refs: Refs,
    activeRef: ActiveRef,
  ) {
    this.storage = storage
    this._refs = refs
    this._activeRef = activeRef
  }

  get head() {
    return this._head
  }

  get activeRef() {
    return this._activeRef
  }

  async renameRef(refName: string, newRefName: string) {
    const ref = this.refs.getRef(refName)

    // if not yet commited change active ref name
    if (ref === null && refName === this._activeRef.name) {
      this.activeRef.name = newRefName
      return
    }

    if (!ref) return false
    ref.name = newRefName
    await this.storage.set('refs', this.refs)
    editorEvents.emit('vcs:renameRef', undefined)
    return true
  }

  get refs() {
    if (this._refs === null) throw Error('VCS not yet loaded')
    return this._refs
  }

  async refLookup(id: ID) {
    return this._refs.refLookup(id)
  }

  /**
   * Get history
   * @param n - How far to go back
   */
  async history(n: number): Promise<HistoryItem[]> {
    let id = this._head
    if (id === null) return []
    const history: HistoryItem[] = []
    for (let i = 0; i < n; i++) {
      if (!id) break
      const generation: Generation | null = await this.storage.get(id)
      if (generation === null) break
      const refs = this.refs.refLookup(id) ?? []
      history.push({ id, generation, refs })

      id = generation?.previous ?? null
    }
    return history
  }

  async commit(code: string, libraries: Library[]): Promise<void> {
    const id = await ID.create(code, libraries)

    logger.debug('commit')
    const gen: Generation = {
      code,
      createdOn: new Date(),
      previous: this.head ?? undefined,
    }

    await this.storage.set(id, gen)

    // if current ref is uncomitted
    if (typeof this._activeRef.id === 'undefined') {
      const ref = { ...this._activeRef, id }
      this.refs.add(ref)
      this._activeRef = ref
      await this.storage.set('refs', this.refs)
    }

    const url = new URL(window.location as any)
    url.pathname = id.toString()
    window.history.pushState('Creagen', '', url)

    const old = this._head
    this._head = id

    // Emit global events
    editorEvents.emit('vcs:commit', { id, generation: gen, code })
    editorEvents.emit('vcs:checkout', { old, new: id })
  }

  /** Checkout a Ref or ID */
  checkout(id: ID): Promise<Generation | null>
  checkout(ref: Ref): Promise<Generation | null>
  checkout(id: ID | Ref): Promise<Generation | null>
  async checkout(id: ID | Ref): Promise<Generation | null> {
    if ('name' in id) {
      this._activeRef = id
      id = id.id
    }
    // update url
    if (id.toString() !== getIdFromPath()?.toString()) {
      logger.debug(`Add ${id.toSub()} to window history`)
      const url = new URL(window.location as any)
      url.pathname = id.toString()
      window.history.pushState('Creagen', '', url)
    }

    const old = this._head
    this._head = id

    const generation = await this.storage.get(id)

    // Emit global events
    editorEvents.emit('vcs:checkout', { old, new: id })

    return generation
  }
}
