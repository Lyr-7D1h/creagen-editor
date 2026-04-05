import z from 'zod'
import { logger } from '../logs/logger'

const payloadSchema = z.object({
  sub: z.string(),
  iat: z.number(),
  exp: z.number(),
})
export function parseJwtPayload(token: string) {
  try {
    const payload = token.split('.')[1]
    if (payload == null) {
      return null
    }

    const res = payloadSchema.safeParse(JSON.parse(atob(payload)))
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
