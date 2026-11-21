import { z } from 'zod'

export const activitySchema = z.object({
  id: z.uuid(),
  observed_at: z.iso.datetime({ offset: true }),
  status: z.enum(['success', 'error']),
  summary: z.string(),
})

export const activityInsertSchema = activitySchema.extend({
  source: z.string().min(1),
})

export const activityListSchema = z.array(activitySchema)

export type Activity = z.infer<typeof activitySchema>
export type ActivityInsert = z.infer<typeof activityInsertSchema>
