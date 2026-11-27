import { dexPairsSchema, mintResponseSchema, researchReportSchema, type ResearchReport } from '@dakoorp/contracts'

export function evaluate(address: string, rawPairs: unknown, rawMint: unknown, now = Date.now(), previous?: ResearchReport): ResearchReport {
  const pairs = dexPairsSchema.parse(rawPairs).filter(pair => pair.chainId === 'solana' && pair.baseToken.address === address)
  pairs.sort((a,b) => (b.liquidity?.usd ?? -1) - (a.liquidity?.usd ?? -1) || a.pairAddress.localeCompare(b.pairAddress))
  const pair = pairs[0]
  const market = pair ? { pair: pair.pairAddress, protocol: pair.dexId, price_usd: pair.priceUsd ?? null,
    liquidity_usd: pair.liquidity?.usd ?? null, volume_5m_usd: pair.volume?.m5 ?? null,
    swaps_5m: pair.txns?.m5 ? pair.txns.m5.buys + pair.txns.m5.sells : null,
    pool_created_at: pair.pairCreatedAt ?? null, name: pair.baseToken.name ?? null, symbol: pair.baseToken.symbol ?? null,
  } : null
  const checks: ResearchReport['checks'] = []
  for (const [key,label,value,threshold] of [
    ['liquidity','Liquidez del pool',market?.liquidity_usd,20000],
    ['volume','Volumen en cinco minutos',market?.volume_5m_usd,5000],
    ['swaps','Operaciones en cinco minutos',market?.swaps_5m,30],
  ] as const) checks.push({ key,label,result: value == null ? 'unknown' : value >= threshold ? 'pass' : 'fail',
    detail: value == null ? 'La fuente no proporciona este dato.' : `${value} · umbral experimental ${threshold}` })
  const created = market?.pool_created_at
  const ageMinutes = created == null || created > now ? null : (now-created)/60000
  checks.push({key:'poolWindow',label:'Antigüedad del pool seleccionado',
    result:ageMinutes===null?'unknown':ageMinutes<=1440?'pass':'fail',
    detail:ageMinutes===null?'Fecha del pool ausente o futura.':`${Math.floor(ageMinutes)} minutos · ventana experimental de 24 horas. No acredita la antigüedad del token.`})
  const mint = mintResponseSchema.safeParse(rawMint)
  const account = mint.success ? mint.data.result.value : null
  const supported = account?.owner === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' && account.data.parsed.info.isInitialized
  for (const [key,label] of [['mintAuthority','Autoridad de emisión'],['freezeAuthority','Autoridad de congelación']] as const) {
    const value = supported ? account.data.parsed.info[key] : undefined
    checks.push({ key,label,result: value === undefined ? 'unknown' : value === null ? 'pass' : 'fail',
      detail: value === undefined ? 'Mint no verificado o programa no soportado.' : value === null ? 'Revocada en el slot consultado.' : 'Autoridad activa: ' + value })
  }
  for (const [key,label,detail] of [
    ['age','Antigüedad del token','La fecha del pool no acredita la primera negociación del token.'],
    ['freshness','Frescura de mercado','DEX Screener no proporciona timestamp de origen para estas métricas.'],
    ['holders','Concentración por propietario','No se ha obtenido la distribución completa por propietario.'],
    ['liquidityControl','Control de liquidez','No se han verificado propietarios y permisos de retirada.'],
    ['exit','Viabilidad de salida','No se ha obtenido una cotización ejecutable de compra y venta.'],
    ['wallets','Wallets únicas y cobertura de ventana','Los agregados de operaciones no equivalen a wallets distintas.'],
  ]) checks.push({key,label,result:'unknown',detail})
  const adverseAuthority = checks.some(check => ['mintAuthority','freezeAuthority'].includes(check.key) && check.result === 'fail')
  const comparable = previous?.market && market && previous.market.pair === market.pair && previous.market.liquidity_usd !== null && previous.market.liquidity_usd > 0 && market.liquidity_usd !== null && Date.parse(previous.received_at) < now
  const drop = comparable ? 1-market!.liquidity_usd!/previous!.market!.liquidity_usd! : null
  const materialDrop = drop !== null && drop >= 0.3
  checks.push({key:'liquidityChange',label:'Cambio de liquidez entre informes',result:drop===null?'unknown':materialDrop?'fail':'pass',detail:drop===null?'No hay una observación anterior comparable del mismo pool.':`${(drop*100).toFixed(1)}% de caída desde el informe recibido el ${previous!.received_at}. Puede reflejar variaciones de precio o reservas.`})
  const outcome = adverseAuthority ? 'discarded' : materialDrop ? 'review_required' : 'insufficient_data'
  return researchReportSchema.parse({ rules_version:'pilot-v1',address,received_at:new Date(now).toISOString(), observed_at:null,
    source:'dexscreener', market, outcome,
    summary: adverseAuthority ? 'Autoridad activa confirmada. Descartado por la política experimental del piloto.' : materialDrop ? 'La liquidez valorada en USD cayó al menos un 30% respecto al informe anterior del mismo pool. Requiere revisión.' : (checks.filter(check=>['liquidity','volume','swaps','poolWindow'].includes(check.key)).every(check=>check.result==='pass') ? 'Pool reciente con actividad por encima de los umbrales experimentales. Falta verificar el riesgo y la antigüedad del token.' : 'Evaluación preliminar completada. Faltan comprobaciones obligatorias para concluir el riesgo.'),
    checks,limitations:['Umbrales experimentales pendientes de calibración.','Cobertura limitada a pools devueltos por DEX Screener.','No constituye una garantía de seguridad ni habilita operaciones.'],
    evidence:{ pairs, mint: mint.success ? mint.data : null, rpc_status: mint.success ? 'received' : 'unavailable_or_unsupported' },
  })
}

export async function investigate(address: string, signal: AbortSignal, fetcher: typeof fetch = fetch, previous?: ResearchReport) {
  const response = await fetcher('https://api.dexscreener.com/token-pairs/v1/solana/' + encodeURIComponent(address), { signal })
  if (!response.ok) throw new Error('Market source unavailable')
  const pairs: unknown = await response.json()
  let mint: unknown = null
  try {
    const result = await fetcher('https://api.mainnet-beta.solana.com', {
      method:'POST',headers:{'Content-Type':'application/json'},signal,
      body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getAccountInfo',params:[address,{encoding:'jsonParsed',commitment:'finalized'}]}),
    })
    if (result.ok) mint = await result.json()
  } catch { /* RPC unavailable is explicit missing evidence, not a favorable result. */ }
  return evaluate(address,pairs,mint,Date.now(),previous)
}
