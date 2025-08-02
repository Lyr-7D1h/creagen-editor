import { SemVer } from 'semver'
import { CREAGEN_EDITOR_VERSION } from '../env'
import { Library, librarySchema } from '../settings/SettingsConfig'
import { z } from 'zod'
import { dateNumberSchema, semverSchema } from '../creagen-editor/schemaUtils'
import { Sha256Hash, sha256HashSchema } from '../Sha256Hash'
import { Tagged } from '../util'
import { $ZodSuperRefineIssue } from 'zod/v4/core/api.cjs'

export const commitHashSchema = sha256HashSchema as z.ZodPipe<
  z.ZodString,
  z.ZodTransform<CommitHash, string>
>
export type CommitHash = Tagged<Sha256Hash, 'CommitHash'>

export const blobHashSchema = sha256HashSchema as z.ZodPipe<
  z.ZodString,
  z.ZodTransform<BlobHash, string>
>
export type BlobHash = Tagged<Sha256Hash, 'BlobHash'>

export const commitSchema = z
  .object({
    blob: blobHashSchema,
    editorVersion: semverSchema,
    libraries: librarySchema.array(),
    parent: commitHashSchema.optional(),
    author: z.string().optional(),
    createdOn: dateNumberSchema,
  })
  .transform(
    async (
      { blob, editorVersion, libraries, parent, author, createdOn },
      ctx,
    ) => {
      try {
        return await Commit.create(
          blob,
          editorVersion,
          libraries,
          createdOn,
          parent,
          author,
        )
      } catch (e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Failed to transform commit: ${e}`,
        })
        return z.NEVER
      }
    },
  )

export type Checkout = { commit: Commit; data: string }

export const libraryStringSchema = z.string().transform((data, ctx) => {
  const parts = data.split('@')
  const name = parts.splice(0, parts.length - 1).join('@')
  if (typeof parts[0] === 'undefined') {
    ctx.addIssue({
      code: 'invalid_format',
      message: 'No version',
      format: 'includes',
    })
    return z.NEVER
  }
  const version = semverSchema.safeParse(parts[0])
  if (version.error) {
    version.error.issues.forEach((i) => ctx.addIssue(i as $ZodSuperRefineIssue))
    return z.NEVER
  }
  return {
    name,
    version: version.data,
  }
})

/**
 * Commit of a change made: [64 byte hash][hex encoded Extension]
 */
export class Commit {
  constructor(
    readonly hash: CommitHash,
    /** Hash of the blob of code */
    readonly blob: BlobHash,
    readonly editorVersion: SemVer,
    /** libraries used for generating code */
    readonly libraries: Library[],
    readonly createdOn: Date,
    /** Hash of parent commit */
    readonly parent?: CommitHash,
    /** Author undefined means its a local commit */
    readonly author?: string,
  ) {}

  /**
   * Creates a new Commit
   */
  static async create(
    /** Hash of the blob of code */
    blob: BlobHash,
    editorVersion: SemVer,
    /** libraries used for generating code */
    libraries: Library[],
    createdOn = new Date(),
    /** Hash of parent commit */
    parent?: CommitHash,
    /** Author undefined means its a local commit */
    author?: string,
  ): Promise<Commit> {
    const hash = (await Sha256Hash.create(
      toInnerString(
        blob,
        CREAGEN_EDITOR_VERSION,
        libraries,
        createdOn,
        parent,
        author,
      ),
    )) as CommitHash

    return new Commit(
      hash,
      blob,
      editorVersion,
      libraries,
      createdOn,
      parent,
      author,
    )
  }

  /**
   * Convert a string representation to commit
   *
   * returns error string if it didn't pass
   */
  static async fromInnerString(input: string): Promise<Commit | string> {
    if (input.length === 0) return 'Empty string'

    if (!input) return 'Failed to decompress id string'
    const parts = input.split(':')
    if (parts.length < 5) return 'Commit must have more than 5 parts'

    let blob
    try {
      blob = Sha256Hash.fromHex(parts[0]!) as BlobHash
    } catch (e) {
      return `Failed to parse blob: ${e}`
    }

    let editorVersion
    try {
      editorVersion = new SemVer(parts[1]!)
    } catch (e) {
      return `Failed to parse version: ${parts[1]}`
    }

    const libs = libraryStringSchema
      .array()
      .safeParse(JSON.parse(`[${parts[2]!}]`))
    if (libs.success === false) {
      return `Failed to parse libraries: ${libs.error}`
    }

    let parent
    try {
      if (parts[3]!.length > 0)
        parent = Sha256Hash.fromHex(parts[3]!) as CommitHash
    } catch (e) {
      return `Failed to parse blob: ${e}`
    }

    let author
    if (parts[4]!.length > 0) author = parts[4]!

    const createdOnNumber = Number(parts[5]!)
    if (isNaN(createdOnNumber)) {
      return `Failed to parse creation date: "${parts[5]}" is not a valid number`
    }
    const createdOn = dateNumberSchema.safeParse(createdOnNumber)
    if (createdOn.success === false) {
      return `Failed to parse creation date: ${createdOn.error.message}`
    }

    return Commit.create(
      blob,
      editorVersion,
      libs.data,
      createdOn.data,
      parent,
      author,
    )
  }

  toInnerString() {
    return toInnerString(
      this.blob,
      this.editorVersion,
      this.libraries,
      this.createdOn,
      this.parent,
      this.author,
    )
  }

  toJson() {
    const { blob, editorVersion, libraries, parent, author } = this
    return {
      blob: blob.toHex(),
      editorVersion: editorVersion.toString(),
      libraries: libraries.map((lib) => ({
        name: lib.name,
        version: lib.version.toString(),
      })),
      createdOn: this.createdOn.getTime(),
      parent: parent?.toHex(),
      author,
    }
  }

  toSub() {
    return this.hash.toSub()
  }

  toHex() {
    return this.hash.toHex()
  }

  /** 
   * Compare the data parts of a commit with another to see if anything has changed 

   * returns `true` when they are equal
   */
  compareData(commit: Commit): boolean {
    // don't commit with same content
    return (
      this.blob.compare(commit.blob) &&
      this.libraries.every(
        (l) =>
          commit.libraries.findIndex(
            (hl) => l.name === hl.name && l.version.compare(hl.version) === 0,
          ) !== -1,
      )
    )
  }
}

function toInnerString(
  blob: Sha256Hash,
  editorVersion: SemVer,
  libraries: Library[],
  createdOn: Date,
  parent?: Sha256Hash,
  author?: string,
) {
  return `${blob.toHex()}:${editorVersion}:${libraries.map((l) => `"${l.name}@${l.version.toString()}"`).join(',')}:${parent ? parent.toHex() : ''}:${author ?? ''}:${createdOn.getTime()}`
}
