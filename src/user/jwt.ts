import z from 'zod'
import { logger } from '../logs/logger'

const payloadSchema = z.object({
  sub: z.string(),
  iat: z.number(),
  exp: z.number(),
})
export type JwtPayload = z.infer<typeof payloadSchema>

/** JWT segments are base64url-encoded without padding; atob only accepts base64 */
function base64UrlToBase64(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  return base64 + '='.repeat((4 - (base64.length % 4)) % 4)
}

export function parseJwtPayload(token: string) {
  try {
    const payload = token.split('.')[1]
    if (payload == null) {
      return null
    }

    const res = payloadSchema.safeParse(
      JSON.parse(atob(base64UrlToBase64(payload))),
    )
    if (res.error) {
      logger.error(res.error)
      return null
    }
    return res.data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_: unknown) {
    return null
  }
}
