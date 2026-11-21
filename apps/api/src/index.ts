import { activityListSchema } from '@dakoorp/contracts'
import express from 'express'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '127.0.0.1'

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', service: 'dakoorp-api' })
})

app.get('/api/activity', async (_request, response) => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    response.status(503).json({ error: 'Falta configurar Supabase' })
    return
  }
  try {
    const endpoint = new URL('/rest/v1/activity_events', url)
    endpoint.searchParams.set('select', 'id,observed_at,status,summary')
    endpoint.searchParams.set('order', 'created_at.desc,id.desc')
    endpoint.searchParams.set('limit', '50')
    const result = await fetch(endpoint, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(10000),
    })
    if (!result.ok) throw new Error('Supabase')
    response.set('Cache-Control', 'no-store').json(activityListSchema.parse(await result.json()))
  } catch {
    response.status(502).json({ error: 'No se pudo consultar la actividad' })
  }
})

app.listen(port, host, () => {
  console.log(`Dakoorp API listening at http://${host}:${port}`)
})
