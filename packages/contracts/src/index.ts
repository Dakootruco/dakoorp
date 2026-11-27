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

export const solanaAddressSchema = z.string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  .refine(address => {
    const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let value=0n
    for(const character of address){
      const digit=alphabet.indexOf(character)
      if(digit<0)return false
      value=value*58n+BigInt(digit)
    }
    let bytes=0
    while(value>0n){bytes++;value>>=8n}
    return bytes+(address.match(/^1*/)?.[0].length ?? 0)===32
  }, 'La dirección debe representar una clave pública de 32 bytes.')

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
})

export const candidateCreateSchema = z.object({
  address: solanaAddressSchema,
}).strict()

export const taskCreateSchema = z.object({
  candidate_id: z.uuid().optional(),
  request_key: z.uuid().optional(),
  department_id: z.uuid(),
  assigned_agent_id: z.uuid().nullable().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20000).default(''),
}).strict()

export const taskUpdateSchema = z.object({
  assigned_agent_id: z.uuid().nullable().optional(),
  status: z.enum(['pending', 'running', 'waiting', 'completed', 'failed', 'cancelled']).optional(),
}).strict().refine(value => Object.keys(value).length > 0)

export const uuidSchema = z.uuid()

export const departmentSchema = z.object({ id: z.uuid(), name: z.string() })
export const agentSchema = z.object({
  id: z.uuid(), department_id: z.uuid(), name: z.string(), role: z.string(), enabled: z.boolean(),
})
export const taskSchema = z.object({
  id: z.uuid(), department_id: z.uuid(), assigned_agent_id: z.uuid().nullable(),
  title: z.string(), description: z.string(), status: z.string(), created_at: z.iso.datetime({ offset: true }),
})
export const candidateSchema = z.object({
  id: z.uuid(), token_id: z.uuid(), status: z.string(), origin: z.string(),
  created_at: z.iso.datetime({ offset: true }),
  tokens: z.object({ address: z.string(), symbol: z.string().nullable(), name: z.string().nullable() }),
})
export const departmentListSchema = z.array(departmentSchema)
export const agentListSchema = z.array(agentSchema)
export const taskListSchema = z.array(taskSchema)
export const candidateListSchema = z.array(candidateSchema)
export type Department = z.infer<typeof departmentSchema>
export type Agent = z.infer<typeof agentSchema>
export type Task = z.infer<typeof taskSchema>
export type Candidate = z.infer<typeof candidateSchema>

export const claimedJobSchema = z.object({
  id: z.uuid(), kind: z.literal('source_check'), status: z.literal('running'),
  lease_token: z.uuid(), attempts: z.number().int().min(1).max(3),
})
export const claimedJobsSchema = z.array(claimedJobSchema)

export const executionSummarySchema = z.object({
  id: z.uuid(), task_id: z.uuid(), agent_id: z.uuid(),
  status: z.enum(['running', 'waiting', 'succeeded', 'failed', 'cancelled']),
  started_at: z.iso.datetime({ offset: true }), finished_at: z.iso.datetime({ offset: true }).nullable(),
  error_message: z.string().nullable(),
})
export const deliverableSchema = z.object({
  id: z.uuid(), task_id: z.uuid(), execution_id: z.uuid(), name: z.string(),
  revision: z.number().int().positive(), content: z.unknown(), created_at: z.iso.datetime({ offset: true }),
})
export const agentWorkSchema = z.object({
  tasks: taskListSchema, executions: z.array(executionSummarySchema), deliverables: z.array(deliverableSchema),
})
export type AgentWork = z.infer<typeof agentWorkSchema>

const metricSchema = z.number().finite().nonnegative().nullable()
export const researchCheckSchema = z.object({ key: z.string(), label: z.string(), result: z.enum(['pass','fail','unknown']), detail: z.string() })
export const researchReportSchema = z.object({
  rules_version: z.literal('pilot-v1'), address: solanaAddressSchema,
  received_at: z.iso.datetime({ offset: true }), observed_at: z.null(),
  outcome: z.enum(['insufficient_data','observing','review_required','discarded']),
  summary: z.string(), source: z.literal('dexscreener'),
  market: z.object({ pair: z.string(), protocol: z.string(), price_usd: metricSchema,
    liquidity_usd: metricSchema, volume_5m_usd: metricSchema, swaps_5m: metricSchema,
    pool_created_at: z.number().nullable(), name: z.string().nullable(), symbol: z.string().nullable(),
  }).nullable(),
  checks: z.array(researchCheckSchema), limitations: z.array(z.string()), evidence: z.unknown(),
})
export type ResearchReport = z.infer<typeof researchReportSchema>
export const researchRequestSchema = z.object({ request_key: z.uuid() }).strict()
export const watchRequestSchema = z.object({ enabled: z.boolean(), interval_minutes: z.number().int().min(5).max(1440).default(15) }).strict()
export const discoveryRequestSchema = z.object({ enabled: z.boolean() }).strict()
export const researchJobSchema = z.object({ id: z.uuid(), candidate_id: z.uuid(), task_id: z.uuid(), execution_id: z.uuid(), lease_token: z.uuid(), address: solanaAddressSchema })
export const researchDetailSchema = z.object({
 reports: z.array(z.object({ id: z.uuid(), created_at: z.string(), report: researchReportSchema })),
 jobs: z.array(z.object({ id: z.uuid(), task_id: z.uuid(), status: z.string(), attempts: z.number(), created_at: z.string() })),
 watch: z.object({ enabled: z.boolean(), interval_minutes: z.number(), next_run_at: z.string() }).nullable(),
})
export type ResearchDetail = z.infer<typeof researchDetailSchema>
const externalNumber = z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/).transform(Number)]).pipe(z.number().finite().nonnegative())
export const dexPairsSchema = z.array(z.object({
 chainId: z.string(), pairAddress: z.string(), dexId: z.string(),
 baseToken: z.object({ address: z.string(), name: z.string().optional(), symbol: z.string().optional() }),
 priceUsd: externalNumber.nullish(), liquidity: z.object({ usd: externalNumber.nullish() }).nullish(),
 volume: z.object({ m5: externalNumber.nullish() }).nullish(),
 txns: z.object({ m5: z.object({ buys: z.number().int().nonnegative(), sells: z.number().int().nonnegative() }).nullish() }).nullish(),
 pairCreatedAt: z.number().int().nonnegative().nullish(),
}))
export const dexProfilesSchema = z.array(z.object({ chainId: z.string(), tokenAddress: z.string() }))
export const mintResponseSchema = z.object({ result: z.object({ context: z.object({ slot: z.number() }), value: z.object({
 owner: z.string(), data: z.object({ parsed: z.object({ type: z.literal('mint'), info: z.object({
 mintAuthority: z.string().nullable(), freezeAuthority: z.string().nullable(), isInitialized: z.boolean(),
 }) }) }),
 }).nullable() }) })
export const chatRequestSchema = z.object({
 messages:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().trim().min(1).max(2000)}).strict()).min(1).max(8),
}).strict().refine(value=>value.messages.at(-1)?.role==='user' && value.messages.reduce((total,item)=>total+item.content.length,0)<=4000)
export const researchSummarySchema = z.object({candidates:z.number().int().nonnegative(),reports:z.number().int().nonnegative(),active:z.number().int().nonnegative(),alerts:z.number().int().nonnegative()})
export type ResearchSummary = z.infer<typeof researchSummarySchema>
