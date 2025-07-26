import { z } from 'zod'
import { Commit, CommitHash, commitHashSchema } from './commit'

export const refSchema = z.object({
  name: z.string(),
  commit: commitHashSchema,
  createdOn: z.number().transform((epochMs) => new Date(epochMs)),
})

export type Ref = z.infer<typeof refSchema>

export function refToJson(ref: Ref) {
  return {
    ...ref,
    commit: ref.commit.toHex(),
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

  refLookup(commit: CommitHash): Ref[] | null {
    const v = this.lookup.get(commit.toBase64())
    if (typeof v === 'undefined') return null
    return v
  }

  add(ref: Ref) {
    this.refs.set(ref.name, ref)
    const currentRefs = this.lookup.get(ref.commit.toBase64())
    this.lookup.set(
      ref.commit.toBase64(),
      currentRefs ? [...currentRefs, ref] : [ref],
    )
  }

  remove(name: string) {
    const ref = this.getRef(name)
    if (!ref) return null
    this.refs.delete(name)
    this.lookup.delete(ref?.commit.toBase64())
    return ref
  }
}

export function isRef(ref: Ref | Commit | CommitHash): ref is Ref {
  return 'name' in ref
}
