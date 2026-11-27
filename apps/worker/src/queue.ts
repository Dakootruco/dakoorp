import { researchCycle } from './research-loop.js'
import { claimedJobsSchema } from '@dakoorp/contracts'
import { setTimeout as delay } from 'node:timers/promises'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY
if (!url || !key) throw new Error('Faltan credenciales Supabase')

const controller = new AbortController()
process.on('SIGINT', () => controller.abort())
process.on('SIGTERM', () => controller.abort())

async function rpc(name: string, body: unknown = {}) {
  const response = await fetch(new URL('/rest/v1/rpc/' + name, url), {
    method: 'POST',
    headers: { apikey: key!, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
  })
  if (!response.ok) throw new Error('Cola Supabase HTTP ' + response.status + '. Comprueba las migraciones.')
  return await response.json()
}

let scheduledMinute = ''
while (!controller.signal.aborted) {
  try {
    try { await researchCycle(rpc, controller.signal) }
    catch { if(!controller.signal.aborted) console.error('No se pudo procesar la cola de investigación. Revisa la conexión y las migraciones.') }
    const minute = String(Math.floor(Date.now() / 60000))
    if (minute !== scheduledMinute) {
      await rpc('enqueue_source_check', { p_key: 'dexscreener-minute-' + minute })
      scheduledMinute = minute
    }
    const [job] = claimedJobsSchema.parse(await rpc('claim_source_check'))
    if (job) {
      const observedAt = new Date().toISOString()
      let summary: string
      try {
        const response = await fetch(
          'https://api.dexscreener.com/token-pairs/v1/solana/So11111111111111111111111111111111111111112',
          { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) },
        )
        if (!response.ok) throw new Error('Source unavailable')
        const pairs: unknown = await response.json()
        if (!Array.isArray(pairs)) throw new Error('Invalid source response')
        summary = 'Consulta de SOL completada. Pares recibidos: ' + pairs.length
      } catch {
        if (controller.signal.aborted) break
        await rpc('fail_source_check', { p_id: job.id, p_lease: job.lease_token })
        console.error('Comprobación fallida; reintento gestionado por la cola.', job.id)
        continue
      }
      const accepted = await rpc('finish_source_check', {
        p_id: job.id, p_lease: job.lease_token, p_observed_at: observedAt, p_summary: summary,
      })
      console.log(accepted ? 'Comprobación guardada' : 'Resultado descartado por lease vencido o cancelación', job.id)
    }
  } catch (error) {
    if (!controller.signal.aborted) console.error(error instanceof Error ? error.message : 'Fallo de cola')
  }
  await delay(5000, undefined, { signal: controller.signal }).catch(() => {})
}
