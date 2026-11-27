import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadEnvironment } from '../environment.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'dakoorp-env-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'config'))
  mkdirSync(join(root, 'apps/api'), { recursive: true })
  const registry = {}
  for (const [index, name] of ['development', 'test', 'production'].entries()) {
    registry[name] = { supabaseUrl: 'https://' + name + '.supabase.co', apiPort: 3001 + index }
    writeFileSync(join(root, 'apps/api/.env.' + name),
      'SUPABASE_URL=' + registry[name].supabaseUrl + '\nSUPABASE_SECRET_KEY=example-private-key')
  }
  writeFileSync(join(root, 'config/environments.json'), JSON.stringify(registry))
  return { root, registry }
}

test('each environment loads its own data endpoint and port', t => {
  const { root } = fixture(t)
  for (const [index, APP_ENV] of ['development', 'test', 'production'].entries()) {
    const env = loadEnvironment({ root, processEnv: { APP_ENV } })
    assert.equal(env.SUPABASE_URL, 'https://' + APP_ENV + '.supabase.co')
    assert.equal(env.PORT, String(3001 + index))
  }
})

test('rejects cross-environment override without disclosing keys', t => {
  const { root } = fixture(t)
  assert.throws(() => loadEnvironment({ root, processEnv: {
    APP_ENV: 'test', SUPABASE_URL: 'https://production.supabase.co',
  } }), /no corresponde/)
})

test('test and production never fall back to legacy development config', t => {
  const { root } = fixture(t)
  writeFileSync(join(root, 'apps/api/.env'), 'SUPABASE_URL=https://development.supabase.co\nSUPABASE_SECRET_KEY=legacy')
  for (const APP_ENV of ['test', 'production']) {
    rmSync(join(root, 'apps/api/.env.' + APP_ENV))
    assert.throws(() => loadEnvironment({ root, processEnv: { APP_ENV } }), /SUPABASE_URL/)
  }
  rmSync(join(root, 'apps/api/.env.development'))
  assert.equal(loadEnvironment({ root, processEnv: {} }).SUPABASE_SECRET_KEY, 'legacy')
})

test('rejects unknown environment, implicit production and duplicate projects', t => {
  const { root, registry } = fixture(t)
  assert.throws(() => loadEnvironment({ root, processEnv: { APP_ENV: 'typo' } }), /APP_ENV/)
  assert.throws(() => loadEnvironment({ root, processEnv: { NODE_ENV: 'production' } }), /explícito/)
  registry.test.supabaseUrl = registry.production.supabaseUrl
  writeFileSync(join(root, 'config/environments.json'), JSON.stringify(registry))
  assert.throws(() => loadEnvironment({ root, processEnv: {} }), /propio proyecto/)
})

test('rejects unprovisioned environment and accepts hosted variables without local file', t => {
  const { root, registry } = fixture(t)
  rmSync(join(root, 'apps/api/.env.production'))
  const processEnv = {
    APP_ENV: 'production', SUPABASE_URL: registry.production.supabaseUrl,
    SUPABASE_SECRET_KEY: 'hosted-key', PORT: '8080',
  }
  assert.equal(loadEnvironment({ root, processEnv }).PORT, '8080')
  registry.production.supabaseUrl = null
  writeFileSync(join(root, 'config/environments.json'), JSON.stringify(registry))
  assert.throws(() => loadEnvironment({ root, processEnv }), /Falta registrar/)
})
