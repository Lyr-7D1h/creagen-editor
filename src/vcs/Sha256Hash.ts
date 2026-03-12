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
  static fromBuffer(hash: ArrayBuffer) {
    return new Sha256Hash(hash)
  }

  static async create(data: string) {
    const encoded = new TextEncoder().encode(data)
    const hash = await crypto.subtle.digest('SHA-256', encoded)
    return new Sha256Hash(hash)
  }

  static fromBase64(data: string) {
    const binaryString = atob(data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return new Sha256Hash(bytes.buffer)
  }

  static fromHex(data: string) {
    if (data.length !== 64) {
      throw new Error('Hex string must be 64 characters long for SHA-256')
    }
    const bytes = new Uint8Array(32)
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(data.slice(i * 2, i * 2 + 2), 16)
    }
    return new Sha256Hash(bytes.buffer)
  }

  private constructor(public readonly hash: ArrayBuffer) {}

  /** convert hash buffer to hexidecimal string */
  toHex() {
    const hashArray = Array.from(new Uint8Array(this.hash))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  toBase64() {
    const hashArray = new Uint8Array(this.hash)
    return btoa(String.fromCharCode(...hashArray))
  }

  /** short version of hash */
  toSub(): string {
    return this.toHex().substring(0, 7)
  }

  compare(other: Sha256Hash): boolean {
    const thisArray = new Uint8Array(this.hash)
    const otherArray = new Uint8Array(other.hash)

    for (let i = 0; i < thisArray.length; i++) {
      if (thisArray[i] !== otherArray[i]) return false
    }
    return true
  }
}
