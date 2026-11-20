import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY
if (!url || !key) throw new Error('Faltan SUPABASE_URL y SUPABASE_SECRET_KEY')

const endpoint = new URL('/rest/v1/activity_events', url)
const headers = { apikey: key, 'Content-Type': 'application/json' }
const controller = new AbortController()
process.on('SIGINT', () => controller.abort())
process.on('SIGTERM', () => controller.abort())

async function checkSource() {
  const event = {
    id: randomUUID(),
    observed_at: new Date().toISOString(),
    source: 'dexscreener',
    status: 'error',
    summary: 'No se pudo consultar DEX Screener',
  }
  try {
    const response = await fetch('https://api.dexscreener.com/token-pairs/v1/solana/So11111111111111111111111111111111111111112', {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    const pairs: unknown = await response.json()
    if (!Array.isArray(pairs)) throw new Error('Respuesta inesperada')
    event.status = 'success'
    event.summary = 'Consulta de SOL completada. Pares recibidos: ' + pairs.length
  } catch {
    if (controller.signal.aborted) return
  }
  const result = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(15000),
  })
  if (!result.ok) throw new Error('Supabase rechazó el evento. HTTP ' + result.status + '. Comprueba la migración.')
  console.log(event.observed_at, event.status, event.summary)
}

do {
  try {
    await checkSource()
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Error del worker')
    if (process.argv.includes('--once')) process.exitCode = 1
  }
  if (process.argv.includes('--once') || controller.signal.aborted) break
  await delay(60000, undefined, { signal: controller.signal }).catch(() => {})
} while (!controller.signal.aborted)
