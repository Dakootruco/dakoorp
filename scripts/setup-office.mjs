import { loadEnvironment } from './environment.mjs'

const env = loadEnvironment()
const departmentId = 'bac00000-0000-4000-8000-000000000001'
const agents = [
  { id: 'bac00000-0000-4000-8000-000000000011', name: 'Descubrimiento', role: 'discovery',
    instructions: 'Investiga candidatos y narrativas. Registra dirección, fuente, hora y evidencia. Expresa los datos desconocidos.' },
  { id: 'bac00000-0000-4000-8000-000000000012', name: 'Riesgo', role: 'risk',
    instructions: 'Evalúa las comprobaciones de riesgo con evidencia verificable. Conserva incertidumbres y la versión de las reglas aplicadas.' },
  { id: 'bac00000-0000-4000-8000-000000000013', name: 'Seguimiento', role: 'tracking',
    instructions: 'Sigue candidatos y cambios relevantes. Registra observaciones y resultados de simulación con sus supuestos.' },
]
async function insert(table, rows) {
  const response = await fetch(new URL('/rest/v1/' + table + '?on_conflict=id', env.SUPABASE_URL), {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SECRET_KEY, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify(rows),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error('No se pudo configurar ' + table + '. HTTP ' + response.status)
}
await insert('departments', [{ id: departmentId, name: 'Trading de memecoins', description: 'Investigación y seguimiento en Solana.' }])
await insert('agents', agents.map(agent => ({
  ...agent, department_id: departmentId, enabled: false, configuration: { instruction_version: 'draft-1' },
})))
console.log('Departamento y tres perfiles configurados. Ejecución de agentes pendiente de habilitación.')
