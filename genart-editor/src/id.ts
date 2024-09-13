import { GENART_EDITOR_VERSION } from './env'
import { Library } from './importer'

/**
 * ID: [64 byte hash][hex encoded Extension]
 *
 * Extension: [editorVersion]:[date]:[libs]
 */
export interface ID {
  /** Hash of the code. Used for comparing changes between code and storing versions locally */
  hash: string
  editorVersion: string
  /** Current time stamp in case of hash collisions */
  date: Date
  /** libraries used for generating code */
  libs: string[]
}

export async function createID(code: string, libs: Library[]): Promise<ID> {
  const data = new TextEncoder().encode(code)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  // convert hash buffer to hexidecimal string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return {
    hash,
    libs: libs.map((lib) => `${lib.name}@${lib.version}`),
    editorVersion: GENART_EDITOR_VERSION,
    date: new Date(),
  }
}

function tohex(string: string) {
  const out = []
  for (let n = 0, l = string.length; n < l; n++) {
    out.push(Number(string.charCodeAt(n)).toString(16))
  }
  return out.join('')
}

function fromhex(string: string) {
  let out = ''
  for (let i = 0; i < string.length; i += 2) {
    out += String.fromCharCode(parseInt(string.substring(i, i + 2), 16))
  }
  return out
}

export function IDToString(id: ID): string {
  return (
    id.hash +
    tohex(
      `${id.editorVersion}:${id.date.valueOf()}:[${id.libs.map((l) => `"${l}"`).join(',')}]`,
    )
  )
}

export function IDFromString(id: string): ID | null {
  if (!/^[0-9a-f]+$/g.test(id)) {
    return null
  }
  const hash = id.substring(0, 64)
  const ext = fromhex(id.substring(64)).split(':')
  const libs = JSON.parse(ext[2]!)
  if (
    !Array.isArray(libs) ||
    libs.length === 0 ||
    libs.some((lib) => typeof lib !== 'string')
  ) {
    throw Error(`Invalid libs: ${libs}`)
  }
  return {
    hash,
    // TODO: handle error
    editorVersion: ext[0]!,
    date: new Date(Number(ext[1]!)),
    libs,
  }
}
