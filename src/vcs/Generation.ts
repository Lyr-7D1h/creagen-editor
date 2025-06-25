import { z } from 'zod'
import { dateNumberSchema } from '../creagen-editor/schemaUtils'
import { IDStringSchema } from './id'

export const generationSchema = z.object({
  code: z.string(),
  createdOn: dateNumberSchema,
  previous: IDStringSchema.optional(),
})

export type Generation = z.infer<typeof generationSchema>
