import { z } from 'zod'
import { ID, IDStringSchema } from './id'

export const refSchema = z.object({
  name: z.string(),
  id: IDStringSchema,
  createdOn: z.date(),
})

export type Ref = z.infer<typeof refSchema>

export class Refs {
  private refs: Map<String, Ref>
  private lookup: Map<String, Ref[]>

  constructor(refs: Ref[]) {
    this.refs = new Map()
    this.lookup = new Map()
    for (const ref of refs) {
      this.refs.set(ref.name, ref)

      const currentRefs = this.lookup.get(ref.id.hash)
      this.lookup.set(ref.id.hash, currentRefs ? [...currentRefs, ref] : [ref])
    }
  }

  getRefs(): Ref[] {
    return Object.values(this.refs)
  }

  getRef(name: String) {
    return this.refs.get(name)
  }

  refLookup(id: ID): Ref[] | null {
    const v = this.lookup.get(id.hash)
    if (typeof v === 'undefined') return null
    return v
  }
}
