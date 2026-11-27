import { loadEnvironment } from './environment.mjs'

try {
  Object.assign(process.env, loadEnvironment())
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Configuración inválida')
  process.exit(1)
}
