import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

const file = new URL('../apps/api/.env', import.meta.url)
const env = { ...(existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {}), ...process.env }
const errors = []
try {
  const url = new URL(env.SUPABASE_URL)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hostname.includes('reemplazar')) throw new Error()
} catch {
  errors.push('SUPABASE_URL debe ser una URL HTTP(S) válida.')
}
if (!env.SUPABASE_SECRET_KEY || /\s/.test(env.SUPABASE_SECRET_KEY) || env.SUPABASE_SECRET_KEY.includes('REEMPLAZAR')) {
  errors.push('SUPABASE_SECRET_KEY debe contener la clave privada del proyecto.')
}
const port = Number(env.PORT ?? 3001)
if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('PORT debe estar entre 1 y 65535.')
if (env.HOST !== undefined && !env.HOST.trim()) errors.push('HOST debe tener un valor.')
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('Configuración del backend válida. La conectividad se verifica con worker:once y /api/activity.')
