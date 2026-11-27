import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const environments = ['development', 'test', 'production']

export function loadEnvironment({ root = projectRoot, processEnv = process.env } = {}) {
  const name = processEnv.APP_ENV ?? 'development'
  if (!environments.includes(name)) throw new Error('APP_ENV debe ser development, test o production.')
  if (processEnv.NODE_ENV === 'production' && !processEnv.APP_ENV) {
    throw new Error('El arranque de producción requiere APP_ENV explícito.')
  }

  const registry = JSON.parse(readFileSync(resolve(root, 'config/environments.json'), 'utf8'))
  const expectedUrl = registry[name]?.supabaseUrl
  if (!expectedUrl) throw new Error('Falta registrar el proyecto Supabase de ' + name + ' en config/environments.json.')
  const configuredUrls = environments.map(item => registry[item]?.supabaseUrl).filter(Boolean)
  const origins = configuredUrls.map(value => new URL(value).origin)
  if (new Set(origins).size !== origins.length) throw new Error('Cada entorno debe tener su propio proyecto Supabase.')

  let file = resolve(root, 'apps/api/.env.' + name)
  if (name === 'development' && !existsSync(file)) file = resolve(root, 'apps/api/.env')
  const values = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {}
  if (values.APP_ENV && values.APP_ENV !== name) throw new Error('APP_ENV del archivo no coincide con el entorno seleccionado.')
  const env = { ...values, ...processEnv, APP_ENV: name }
  let url
  try {
    url = new URL(env.SUPABASE_URL)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash || url.hostname.includes('reemplazar')) throw new Error()
  } catch {
    throw new Error('SUPABASE_URL debe ser el origen HTTP(S) del proyecto.')
  }
  if (url.origin !== new URL(expectedUrl).origin) throw new Error('SUPABASE_URL no corresponde al entorno seleccionado.')
  if (!env.SUPABASE_SECRET_KEY || /\s/.test(env.SUPABASE_SECRET_KEY) || env.SUPABASE_SECRET_KEY.includes('REEMPLAZAR')) {
    throw new Error('SUPABASE_SECRET_KEY debe contener la clave privada del proyecto.')
  }
  const port = Number(env.PORT ?? registry[name].apiPort)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT debe estar entre 1 y 65535.')
  if (env.HOST !== undefined && !env.HOST.trim()) throw new Error('HOST debe tener un valor.')
  return { ...env, PORT: String(port), HOST: env.HOST ?? '127.0.0.1' }
}
