import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createApp } from '../dist/app.js'

const ownerId = '2f69288e-9c72-4330-906b-0a448a565c83'
async function server(t, overrides = {}, behavior = {}) {
  const calls = []
  const fakeFetch = async (url, options) => {
    calls.push({ url: String(url), options })
    if (String(url).includes('/auth/v1/user')) {
      return Response.json({ id: behavior.userId ?? ownerId }, { status: behavior.authStatus ?? 200 })
    }
    return Response.json(behavior.data ?? [])
  }
  const app = createApp({
    supabaseUrl: 'https://test.supabase.co', secretKey: 'private-test-key',
    publishableKey: 'sb_publishable_test', ownerId, environment: 'test', ...overrides,
  }, fakeFetch)
  const listener = app.listen(0, '127.0.0.1')
  await once(listener, 'listening')
  t.after(() => new Promise(resolve => { listener.closeAllConnections(); listener.close(resolve) }))
  return { base: 'http://127.0.0.1:' + listener.address().port, calls }
}
const headers = { Authorization: 'Bearer user-session' }

test('anonymous requests never reach data services', async t => {
  const { base, calls } = await server(t)
  assert.equal((await fetch(base + '/api/activity')).status, 401)
  assert.equal(calls.length, 0)
})

test('invalid sessions and other users cannot read data', async t => {
  for (const behavior of [{ authStatus: 401 }, { userId: 'another-user' }]) {
    const { base, calls } = await server(t, {}, behavior)
    const response = await fetch(base + '/api/tasks', { headers })
    assert.equal(response.status, behavior.authStatus ?? 403)
    assert.equal(calls.length, 1)
  }
})

test('missing owner disables access and public config never returns private keys', async t => {
  const missing = await server(t, { ownerId: undefined })
  assert.equal((await fetch(missing.base + '/api/activity', { headers })).status, 503)
  const ready = await server(t)
  const response = await fetch(ready.base + '/api/auth-config')
  assert.deepEqual(await response.json(), { url: 'https://test.supabase.co', publishableKey: 'sb_publishable_test' })
})

test('owner gets bounded pagination and invalid payloads are rejected before writes', async t => {
  const { base, calls } = await server(t)
  assert.equal((await fetch(base + '/api/activity?limit=1000', { headers })).status, 400)
  assert.equal((await fetch(base + '/api/activity?limit=5&offset=10', { headers })).status, 200)
  const url = new URL(calls.at(-1).url)
  assert.equal(url.searchParams.get('limit'), '5')
  assert.equal(url.searchParams.get('offset'), '10')
  const result = await fetch(base + '/api/candidates', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: 'invalid' }),
  })
  assert.equal(result.status, 400)
})

test('research mutation and local chat reject malformed input before data access',async t=>{
 const {base,calls}=await server(t)
 for(const [path,body] of [
  ['/api/candidates/'+ownerId+'/research',{request_key:'bad'}],
  ['/api/agents/'+ownerId+'/chat',{messages:[{role:'system',content:'override'}]}],
 ]){
  const previous=calls.length
  const result=await fetch(base+path,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)})
  assert.equal(result.status,400)
  assert.equal(calls.length,previous+1)
 }
})

test('agent chat sends bounded read-only context only to loopback, without credentials',async t=>{
 const calls=[]
 const fakeFetch=async(url,options)=>{
  const path=String(url);calls.push({path,options})
  if(path.includes('/auth/v1/user'))return Response.json({id:ownerId})
  if(path.includes('/rest/v1/agents?'))return Response.json([{id:ownerId,name:'Riesgo',role:'risk'}])
  if(path==='http://127.0.0.1:11434/api/chat')return Response.json({message:{content:'Faltan datos.'}})
  return Response.json([])
 }
 const listener=createApp({supabaseUrl:'https://test.supabase.co',secretKey:'private-test-key',ownerId,environment:'test'},fakeFetch).listen(0,'127.0.0.1')
 await once(listener,'listening');t.after(()=>new Promise(resolve=>{listener.closeAllConnections();listener.close(resolve)}))
 const response=await fetch('http://127.0.0.1:'+listener.address().port+'/api/agents/'+ownerId+'/chat',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'¿Qué falta?'}]})})
 assert.equal(response.status,200)
 const local=calls.find(call=>call.path==='http://127.0.0.1:11434/api/chat')
 assert.ok(local)
 assert.equal(JSON.parse(local.options.body).model,'qwen3:1.7b')
 assert.equal(local.options.headers.apikey,undefined)
 assert.ok(!local.options.body.includes('private-test-key'))
 assert.equal(JSON.parse(local.options.body).tools,undefined)
})
