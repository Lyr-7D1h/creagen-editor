import { z } from 'zod'

export const commitSchema = z.object({
  author: z.string(),
  code: z.string(),
  createdOn: dateNumberSchema,
  previous: IDStringSchema.optional(),
})
