import { GENART_EDITOR_VERSION, GENART_VERSION } from '../constants'

export interface ID {
  hash: string
  libVersion: string
  editorVersion: string
  date: Date
}

export async function createID(code: string): Promise<ID> {
  const data = new TextEncoder().encode(code)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  // convert hash buffer to hexidecimal string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return {
    hash,
    libVersion: GENART_VERSION,
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
    tohex(id.libVersion + ':' + id.editorVersion + ':' + id.date.valueOf())
  )
}

// TODO: handle error
export function IDFromString(id: string): ID | null {
  if (!/^[0-9a-f]+$/g.test(id)) {
    return null
  }
  const hash = id.substring(0, 64)
  const ext = fromhex(id.substring(64)).split(':')

  return {
    hash,
    libVersion: ext[0]!,
    editorVersion: ext[1]!,
    date: new Date(Number(ext[2]!)),
  }
}
