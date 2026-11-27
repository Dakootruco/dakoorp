import { loadEnvironment } from './environment.mjs'

try {
  const env = loadEnvironment()
  console.log('Configuración válida para ' + env.APP_ENV + '. Conectividad pendiente de comprobación.')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Configuración inválida')
  process.exit(1)
}
