import assert from 'node:assert/strict'
import test from 'node:test'
import { activityInsertSchema, activityListSchema } from '../dist/index.js'

const event = {
  id: '2f69288e-9c72-4330-906b-0a448a565c83',
  observed_at: '2026-11-20T03:53:32.061+00:00',
  status: 'success',
  summary: 'Consulta completada',
  source: 'dexscreener',
}

test('worker insert can be read as an API response without exposing extra columns', () => {
  const inserted = activityInsertSchema.parse(event)
  const [read] = activityListSchema.parse([{ ...inserted, created_at: event.observed_at }])
  assert.equal(read.id, event.id)
  assert.equal(read.observed_at, event.observed_at)
  assert.equal(read.source, undefined)
  assert.equal(read.created_at, undefined)
})

test('accepts existing timestamps from Supabase and worker, errors and empty history', () => {
  for (const timestamp of ['2026-11-20T03:53:32.061Z', '2026-11-20T03:53:32.061123+00:00']) {
    assert.equal(activityListSchema.parse([{ ...event, observed_at: timestamp, status: 'error' }]).length, 1)
  }
  assert.deepEqual(activityListSchema.parse([]), [])
})

test('rejects malformed external responses and unsupported status', () => {
  for (const input of [null, {}, [{ ...event, status: 'running' }], [{ ...event, id: 'invalid' }],
    [{ ...event, observed_at: '2026-02-30T00:00:00Z' }], [{ ...event, summary: null }]]) {
    assert.equal(activityListSchema.safeParse(input).success, false)
  }
})

test('rejects inserts without a source', () => {
  assert.equal(activityInsertSchema.safeParse({ ...event, source: undefined }).success, false)
  assert.equal(activityInsertSchema.safeParse({ ...event, source: '' }).success, false)
})
