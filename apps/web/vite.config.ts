import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => {
  const name = process.env.APP_ENV ?? mode
  if (!['development', 'test', 'production'].includes(name)) {
    throw new Error('El modo web debe ser development, test o production.')
  }
  const apiPorts: Record<string, number> = { development: 3001, test: 3002, production: 3003 }
  const webPorts: Record<string, number> = { development: 5173, test: 5174, production: 5175 }
  const file = resolve(process.cwd(), name === 'development' ? '.env.local' : '.env.' + name + '.local')
  const env = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {}
  const target = process.env.API_PROXY_TARGET ?? env.API_PROXY_TARGET ?? 'http://127.0.0.1:' + apiPorts[name]
  const proxy = { '/api': target }
  return {
    plugins: [react()],
    server: { host: '127.0.0.1', port: webPorts[name], strictPort: true, proxy },
    preview: { host: '127.0.0.1', port: webPorts[name] - 1000, strictPort: true, proxy },
  }
})
