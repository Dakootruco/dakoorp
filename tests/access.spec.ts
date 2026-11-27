import { test, expect } from '@playwright/test'

test('shows setup error when auth configuration is missing', async ({ page }) => {
  await page.route('**/api/auth-config', route => route.fulfill({ status: 503, json: { error: 'Missing owner' } }))
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('configuración')
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeDisabled()
})

test('signs in, renders stored activity and registers a candidate', async ({ page }, testInfo) => {
  const id = '2f69288e-9c72-4330-906b-0a448a565c83'
  const user = { id, email: 'owner@example.test', aud: 'authenticated', role: 'authenticated' }
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const token = encode({ alg: 'HS256', typ: 'JWT' }) + '.' +
    encode({ sub: id, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }) + '.fixture'
  let candidateCreated = false
  let researched = false
  let watching = false
  const report = {rules_version:'pilot-v1',address:'So11111111111111111111111111111111111111112',received_at:'2026-11-26T12:00:00Z',observed_at:null,outcome:'insufficient_data',summary:'Falta verificar concentración y salida.',source:'dexscreener',market:null,checks:[{key:'holders',label:'Concentración por propietario',result:'unknown',detail:'No verificada.'}],limitations:['Evaluación preliminar.'],evidence:{}}
  await page.route('https://fixture.supabase.co/**', route => {
    if (route.request().url().includes('/token')) return route.fulfill({ json: {
      access_token: token, refresh_token: 'fixture-refresh-token', token_type: 'bearer',
      expires_in: 3600, user,
    } })
    return route.fulfill({ json: user })
  })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth-config') return route.fulfill({ json: {
      url: 'https://fixture.supabase.co', publishableKey: 'sb_publishable_fixture',
    } })
    expect(route.request().headers().authorization).toBe('Bearer ' + token)
    if(path==='/api/research/summary')return route.fulfill({json:{candidates:candidateCreated?1:0,reports:researched?1:0,active:0,alerts:0}})
    if (path.endsWith('/chat')) return route.fulfill({json:{content:'No tengo investigaciones asignadas todavía.',local:true,model:'qwen3:1.7b'}})
    if (path.endsWith('/watch')) {watching=route.request().postDataJSON().enabled;return route.fulfill({json:{enabled:watching}})}
    if (path.endsWith('/research')) {
      if(route.request().method()==='POST'){researched=true;return route.fulfill({status:202,json:{id,status:'pending'}})}
      return route.fulfill({json:{reports:researched?[{id,created_at:'2026-11-26T12:00:00Z',report}]:[],jobs:researched?[{id,task_id:id,status:'succeeded',attempts:1,created_at:'2026-11-26T12:00:00Z'}]:[],watch:watching?{enabled:true,interval_minutes:15,next_run_at:'2026-11-26T12:15:00Z'}:null}})
    }
    if(path==='/api/candidates'&&route.request().method()==='GET')return route.fulfill({json:candidateCreated?[{id,token_id:id,status:'detected',origin:'manual',created_at:'2026-11-26T12:00:00Z',tokens:{address:'So11111111111111111111111111111111111111112',name:'SOL de prueba',symbol:'SOL'}}]:[]})
    if (path.endsWith('/work')) return route.fulfill({ json: { tasks: [], executions: [], deliverables: [] } })
    if (path === '/api/agents') return route.fulfill({ json: [
      { id, department_id: id, name: 'Descubrimiento', role: 'discovery', enabled: false },
      { id: 'bac00000-0000-4000-8000-000000000012', department_id: id, name: 'Riesgo', role: 'risk', enabled: false },
      { id: 'bac00000-0000-4000-8000-000000000013', department_id: id, name: 'Seguimiento', role: 'tracking', enabled: false },
    ] })
    if (path === '/api/departments') return route.fulfill({ json: [{ id, name: 'Trading de memecoins' }] })
    if (path === '/api/activity') return route.fulfill({ json: [{
      id, observed_at: '2026-11-21T00:00:00Z', status: 'success', summary: 'Fixture de actividad persistida',
    }] })
    if (path === '/api/candidates' && route.request().method() === 'POST') {
      expect(route.request().postDataJSON().address).toBe('So11111111111111111111111111111111111111112')
      candidateCreated = true
      return route.fulfill({ json: { id } })
    }
    return route.fulfill({ json: [] })
  })
  await page.goto('/')
  await page.getByLabel('Correo', { exact: true }).fill('owner@example.test')
  await page.getByLabel('Contraseña', { exact: true }).fill('fixture-password')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await expect(page.getByText('Fixture de actividad persistida')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true })
  await page.getByRole('link', { name: 'Oficina', exact: true }).click()
  await expect(page.locator('.office-canvas canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Descubrimiento', exact: true }).first().click()
  await expect(page.getByText('Sin tareas asignadas.', { exact: true })).toBeVisible()
  await page.getByLabel('Mensaje al agente').fill('¿Qué has investigado?')
  await page.getByRole('button',{name:'Enviar mensaje'}).click()
  await expect(page.getByText('No tengo investigaciones asignadas todavía.',{exact:true})).toBeVisible()
  await page.getByRole('link', { name: 'Candidatos', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('office.png'), fullPage: true })
  await page.getByLabel('Dirección del token en Solana').fill('So11111111111111111111111111111111111111112')
  await page.getByRole('button', { name: 'Agregar candidato' }).click()
  await expect(page.getByText('Candidato registrado.', { exact: false })).toBeVisible()
  expect(candidateCreated).toBe(true)
  await page.getByRole('button',{name:'Ver investigación'}).click()
  await page.getByRole('button',{name:'Investigar ahora'}).click()
  await expect(page.getByText('Falta verificar concentración y salida.',{exact:true})).toBeVisible()
  expect(researched).toBe(true)
  await page.getByRole('button',{name:'Seguir cada 15 minutos'}).click()
  await expect(page.getByRole('button',{name:'Pausar seguimiento'})).toBeVisible()
  expect(watching).toBe(true)
  await page.evaluate(()=>window.scrollTo(0,0))
  await page.screenshot({path:testInfo.outputPath('research.png'),fullPage:true})
  await page.getByRole('button',{name:'Pausar seguimiento'}).click()
  await expect(page.getByRole('button',{name:'Seguir cada 15 minutos'})).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Candidatos', level: 1 })).toBeVisible()
  await page.goBack()
  await expect(page.locator('.office-canvas canvas')).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Abrir navegación' }).click()
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).not.toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png'), fullPage: true })
})
