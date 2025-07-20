import { z } from 'zod'
import { ID, IDStringSchema } from './id'

export const refSchema = z.object({
  name: z.string(),
  id: IDStringSchema,
  createdOn: z.number().transform((epochMs) => new Date(epochMs)),
})

export type Ref = z.infer<typeof refSchema>

export function refToJson(ref: Ref) {
  return {
    ...ref,
    id: ref.id.toString(),
    createdOn: ref.createdOn.getTime(),
  }
}

/** Simple ref data structure for modifying and lookign up vcs refs */
export class Refs {
  private refs: Map<string, Ref>
  private lookup: Map<string, Ref[]>

  constructor(refs: Ref[]) {
    this.refs = new Map()
    this.lookup = new Map()
    for (const ref of refs) {
      this.add(ref)
    }
  }

  getRefs(): Ref[] {
    return [...this.refs.values()]
  }

  getRef(name: string) {
    return this.refs.get(name) ?? null
  }

  refLookup(id: ID): Ref[] | null {
    const v = this.lookup.get(id.hash)
    if (typeof v === 'undefined') return null
    return v
  }

  add(ref: Ref) {
    this.refs.set(ref.name, ref)
    const currentRefs = this.lookup.get(ref.id.hash)
    this.lookup.set(ref.id.hash, currentRefs ? [...currentRefs, ref] : [ref])
  }

  remove(name: string) {
    const ref = this.getRef(name)
    if (!ref) return null
    this.refs.delete(name)
    this.lookup.delete(ref?.id.hash)
    return ref
  }
}
