import { z } from 'zod'
import { ID, IDStringSchema } from '../creagen-editor/id'

export const refSchema = z.object({
  name: z.string(),
  id: IDStringSchema,
  createdOn: z.date(),
})

export type Ref = z.infer<typeof refSchema>

export class Refs {
  private refs: Map<String, Ref>

  constructor(refs: Ref[]) {
    this.refs = new Map()
    for (const ref of refs) {
      this.refs.set(ref.id.hash, ref)
    }
  }

  getRefs() {
    return Object.values(this.refs)
  }

  refLookup(id: ID): Ref | null {
    const v = this.refs.get(id.hash)
    if (typeof v === 'undefined') return null
    return v
  }
}
