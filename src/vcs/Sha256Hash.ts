import { z } from 'zod'

export const sha256HashSchema = z.string().transform((data, ctx) => {
  try {
    return Sha256Hash.fromHex(data)
  } catch (e) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Failed to parse to hash ${(e as Error).toString()}`,
    })
    return z.NEVER
  }
})

export class Sha256Hash {
  static fromBuffer(hash: Uint8Array<ArrayBuffer>) {
    return new Sha256Hash(hash)
  }

  static async create(data: string) {
    const encoded = new TextEncoder().encode(data)
    const hash = await crypto.subtle.digest('SHA-256', encoded)
    return new Sha256Hash(new Uint8Array(hash))
  }

  static fromBase64(data: string, omitPadding = false) {
    const normalized = omitPadding
      ? data.padEnd(data.length + ((4 - (data.length % 4)) % 4), '=')
      : data
    const binaryString = atob(normalized)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return new Sha256Hash(bytes)
  }

  static fromHex(data: string) {
    if (data.length !== 64) {
      throw new Error('Hex string must be 64 characters long for SHA-256')
    }
    const bytes = new Uint8Array(32)
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(data.slice(i * 2, i * 2 + 2), 16)
    }
    return new Sha256Hash(bytes)
  }

  private constructor(readonly buffer: Uint8Array<ArrayBuffer>) {}

  /** convert hash buffer to hexidecimal string */
  toHex() {
    const hashArray = Array.from(new Uint8Array(this.buffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  toBase64(omitPadding = false) {
    const b64 = btoa(String.fromCharCode(...this.buffer))
    return omitPadding
      ? b64.slice(0, -1) // sha256 is always 32 bytes, meaning 32 * 8 = 256/6 = ~43 base64 characters, so there is always 1 '='
      : b64
  }

  /** First 7 characters of the hex hash */
  toSub(): string {
    return this.toHex().substring(0, 7)
  }

  compare(other: Sha256Hash): boolean {
    const thisArray = new Uint8Array(this.buffer)
    const otherArray = new Uint8Array(other.buffer)

    for (let i = 0; i < thisArray.length; i++) {
      if (thisArray[i] !== otherArray[i]) return false
    }
    return true
  }
}
