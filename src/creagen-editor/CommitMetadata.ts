import { SemVer } from 'semver'
import { Library, librarySchema } from '../settings/SettingsConfig'
import z from 'zod'
import { semverSchema } from './schemaUtils'
import { JsonValue } from 'versie'

const commitMetadataSchema = z.object({
  editorVersion: semverSchema,
  libraries: librarySchema.array(),
  author: z.string().optional(),
})

export class CommitMetadata {
  static parse(data: unknown) {
    const { editorVersion, libraries, author } =
      commitMetadataSchema.parse(data)
    return new CommitMetadata(editorVersion, libraries, author)
  }

  toJson(): JsonValue {
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

  constructor(
    readonly editorVersion: SemVer,
    readonly libraries: Library[],
    readonly author?: string,
  ) {}

  compare(meta: this): boolean {
    return (
      this.author === meta.author &&
      this.editorVersion.compare(meta.editorVersion) === 0 &&
      this.libraries.every(
        (lib) =>
          meta.libraries.findIndex(
            (l) => l.name === lib.name && l.version.compare(lib.version) === 0,
          ) >= 0,
      )
    )
  }
}
