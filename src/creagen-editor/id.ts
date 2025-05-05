import { SemVer } from 'semver'
import { CREAGEN_EDITOR_VERSION } from '../env'
import { Library } from '../settings/SettingsConfig'
import { z } from 'zod'
import { semverSchema } from './schemaUtils'

export const IDStringSchema = z.string().transform((data, ctx) => {
  const id = ID.fromString(data)
  if (id === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'No version',
    })
    return z.NEVER
  }
  return id
})

const libraryStringSchema = z.string().transform((data, ctx) => {
  const parts = data.split('@')
  const name = parts.splice(0, parts.length - 1).join('@')
  if (typeof parts[0] === 'undefined') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'No version',
    })
    return z.NEVER
  }
  const version = semverSchema.safeParse(parts[0])
  if (version.error) {
    ctx.addIssue(version.error.errors[0]!)
    return z.NEVER
  }
  return {
    name,
    version: version.data,
  }
})

/**
 * ID: [64 byte hash][hex encoded Extension]
 *
 * Extension: [editorVersion]:[libraries]
 */
export class ID {
  /** Hash of the code. Used for comparing changes between code and storing versions locally */
  hash: string
  editorVersion: SemVer
  /** libraries used for generating code */
  libraries: Library[]

  constructor(hash: string, editorVersion: SemVer, libraries: Library[]) {
    this.hash = hash
    this.editorVersion = editorVersion
    this.libraries = libraries
  }

  /**
   * Creates a new ID from code and libraries
   */
  static async create(code: string, libraries: Library[]): Promise<ID> {
    const data = new TextEncoder().encode(code)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    // convert hash buffer to hexidecimal string
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    return new ID(hash, CREAGEN_EDITOR_VERSION, libraries)
  }

  /**
   * Converts an ID string back to an ID object
   */
  static fromString(idString: string): ID | null {
    if (!/^[0-9a-f]+$/g.test(idString)) {
      return null
    }
    const hash = idString.substring(0, 64)
    const ext = fromHex(idString.substring(64)).split(':')
    const editorVersion = new SemVer(ext[0]!)
    const libs = libraryStringSchema
      .array()
      .safeParse(JSON.parse(`[${ext[1]!}]`))
    if (libs.success === false) {
      console.warn(libs.error)
      return null
    }
    return new ID(hash, editorVersion, libs.data)
  }

  /**
   * Returns a shortened version of the hash for display purposes
   */
  toSub(): string {
    return this.hash.substring(0, 7)
  }

  /**
   * Converts the ID object to a string representation
   */
  toString(): string {
    return (
      this.hash +
      toHex(
        `${this.editorVersion}:${this.libraries.map((l) => `"${l.name}@${l.version.toString()}"`).join(',')}`,
      )
    )
  }
}

/**
 * Utility method to convert a string to hex
 */
function toHex(string: string): string {
  const out = []
  for (let n = 0, l = string.length; n < l; n++) {
    out.push(string.charCodeAt(n).toString(16))
  }
  return out.join('')
}

/**
 * Utility method to convert hex to a string
 */
function fromHex(string: string): string {
  let out = ''
  for (let i = 0; i < string.length; i += 2) {
    out += String.fromCharCode(parseInt(string.substring(i, i + 2), 16))
  }
  return out
}
