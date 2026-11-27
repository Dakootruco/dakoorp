import { dexProfilesSchema, researchReportSchema, researchJobSchema, solanaAddressSchema } from '@dakoorp/contracts'
import { investigate } from './research.js'

type Rpc = (name: string, body?: unknown) => Promise<unknown>
export async function researchCycle(rpc: Rpc, signal: AbortSignal) {
  await rpc('schedule_research')
  if (await rpc('claim_discovery')) {
    try {
      const response = await fetch('https://api.dexscreener.com/token-profiles/latest/v1',{signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])})
      if (!response.ok) throw new Error('Discovery unavailable')
      const profiles = dexProfilesSchema.parse(await response.json())
      const addresses = [...new Set(profiles.filter(p => p.chainId==='solana' && solanaAddressSchema.safeParse(p.tokenAddress).success).map(p => p.tokenAddress))].slice(0,5)
      for (const address of addresses) {
        const candidate = await rpc('register_candidate',{p_address:address,p_origin:'dexscreener_profile'}) as {id:string}
        // Discovery schedules at most one investigation per candidate per UTC day.
        const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(candidate.id + new Date().toISOString().slice(0,10))))
        bytes[6]=(bytes[6]&15)|64; bytes[8]=(bytes[8]&63)|128
        const hex = Array.from(bytes.slice(0,16),value=>value.toString(16).padStart(2,'0')).join('')
        const key = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
        await rpc('enqueue_research',{p_candidate:candidate.id,p_key:key,p_role:'discovery'})
      }
    } catch { console.error('Descubrimiento no disponible. Se reintentará en cinco minutos.') }
  }
  const raw = await rpc('claim_research')
  if (!raw) return
  const job = researchJobSchema.parse(raw)
  try {
    const deadline=AbortSignal.any([signal,AbortSignal.timeout(45000)])
    const historyUrl=new URL('/rest/v1/research_reports',process.env.SUPABASE_URL!)
    historyUrl.search=new URLSearchParams({candidate_id:'eq.'+job.candidate_id,select:'report',order:'created_at.desc,id.desc',limit:'1'}).toString()
    const history=await fetch(historyUrl,{headers:{apikey:process.env.SUPABASE_SECRET_KEY!},signal:deadline})
    if(!history.ok)throw new Error('History unavailable')
    const previousRows=await history.json() as {report:unknown}[]
    const previous=previousRows.length?researchReportSchema.parse(previousRows[0].report):undefined
    const report = await investigate(job.address,deadline,fetch,previous)
    const accepted = await rpc('finish_research',{p_id:job.id,p_lease:job.lease_token,p_report:report})
    console.log(accepted ? 'Investigación guardada' : 'Investigación descartada por cancelación o vencimiento',job.id)
  } catch {
    if (!signal.aborted) await rpc('fail_research',{p_id:job.id,p_lease:job.lease_token})
  }
}
