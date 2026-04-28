import type { SemVer } from 'semver'
import type { CommitMetadataInterface } from 'versie'
import z from 'zod'
import type { Library } from '../settings/SettingsConfig'
import { librarySchema } from '../settings/SettingsConfig'
import { semverSchema } from './schemaUtils'

const commitMetadataSchema = z.object({
  editorVersion: semverSchema,
  libraries: librarySchema.array(),
  author: z.string().optional(),
})

export const commitMetadataJsonSchema = z.object({
  editorVersion: z.string(),
  libraries: z.array(z.object({ name: z.string(), version: z.string() })),
  author: z.string().optional(),
})

export type CommitMetadataJson = z.infer<typeof commitMetadataJsonSchema>
export class CommitMetadata implements CommitMetadataInterface<CommitMetadataJson> {
  static parse(data: CommitMetadataJson) {
    const { editorVersion, libraries, author } =
      commitMetadataSchema.parse(data)
    return new CommitMetadata(editorVersion, libraries, author)
  }

  constructor(
    readonly editorVersion: SemVer,
    readonly libraries: Library[],
    readonly author?: string,
  ) {}

  toJson(): CommitMetadataJson {
    const { author, editorVersion, libraries } = this
    return {
      editorVersion: editorVersion.toString(),
      libraries: libraries.map(({ name, version }) => ({
        name,
        version: version.toString(),
      })),
      ...(author !== undefined ? { author } : {}),
    }
  }

  /** Compared while comitting with `head` to check if something changed */
  compare(meta: this): boolean {
    const b =
      // if one of the commits is local (this.author=undefined) ignore author check
      (this.author && meta.author ? this.author === meta.author : true) &&
      this.editorVersion.compare(meta.editorVersion) === 0 &&
      this.libraries.every(
        (lib) =>
          meta.libraries.findIndex(
            (l) => l.name === lib.name && l.version.compare(lib.version) === 0,
          ) >= 0,
      )
    return b
  }
}
