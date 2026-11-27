import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluate,investigate } from '../dist/research.js'
const address='So11111111111111111111111111111111111111112'
const pair={chainId:'solana',pairAddress:'pool',dexId:'raydium',baseToken:{address},priceUsd:'1',liquidity:{usd:20000},volume:{m5:5000},txns:{m5:{buys:20,sells:10}}}
const mint=authority=>({result:{context:{slot:12},value:{owner:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',data:{parsed:{type:'mint',info:{mintAuthority:authority,freezeAuthority:null,isInitialized:true}}}}}})
test('good aggregates never imply safety; thresholds inclusive and missing data explicit',()=>{
 const report=evaluate(address,[pair],mint(null))
 assert.equal(report.outcome,'insufficient_data')
 assert.equal(report.checks.find(c=>c.key==='liquidity').result,'pass')
 assert.equal(report.checks.find(c=>c.key==='holders').result,'unknown')
 assert.equal(report.observed_at,null)
})
test('confirmed authority dominates missing data; unsupported mint remains unknown',()=>{
 assert.equal(evaluate(address,[],mint(address)).outcome,'discarded')
 const unsupported=mint(null);unsupported.result.value.owner='token2022'
 assert.equal(evaluate(address,[pair],unsupported).checks.find(c=>c.key==='mintAuthority').result,'unknown')
})
test('wrong network or token excluded, zero preserved and missing fields never become zero',()=>{
 assert.equal(evaluate(address,[{...pair,chainId:'base'}],null).market,null)
 const report=evaluate(address,[{...pair,priceUsd:'0',liquidity:null,txns:null}],null)
 assert.equal(report.market.price_usd,0)
 assert.equal(report.market.liquidity_usd,null)
 assert.equal(report.market.swaps_5m,null)
 assert.throws(()=>evaluate(address,[{...pair,priceUsd:'NaN'}],null))
})
test('RPC outage leaves usable market evidence, market outage retries',async()=>{
 const report=await investigate(address,new AbortController().signal,async url=>String(url).includes('dexscreener')?Response.json([pair]):new Response('',{status:429}))
 assert.equal(report.outcome,'insufficient_data')
 await assert.rejects(()=>investigate(address,new AbortController().signal,async()=>new Response('',{status:503})))
})

test('same-pool liquidity drop triggers review, different pools are not compared',()=>{
 const previous=evaluate(address,[pair],mint(null),1000)
 const falling={...pair,liquidity:{usd:13000}}
 const report=evaluate(address,[falling],mint(null),2000,previous)
 assert.equal(report.outcome,'review_required')
 assert.equal(report.checks.find(c=>c.key==='liquidityChange').result,'fail')
 assert.equal(evaluate(address,[{...falling,pairAddress:'other'}],mint(null),2000,previous).outcome,'insufficient_data')
 assert.equal(evaluate(address,[falling],mint(address),2000,previous).outcome,'discarded')
})
