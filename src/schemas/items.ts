import { ItemStatus } from '#/generated/prisma/enums'
import z from 'zod'

export const itemsSearchSchema = z.object({
  q: z.string().default(''),
  status: z.union([z.literal('all'), z.nativeEnum(ItemStatus)]).default('all'),
})
