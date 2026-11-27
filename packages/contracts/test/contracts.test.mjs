import test from 'node:test'
import assert from 'node:assert/strict'
import { solanaAddressSchema } from '../dist/index.js'
test('Solana addresses decode to exactly 32 bytes',()=>{
 assert.ok(solanaAddressSchema.safeParse('So11111111111111111111111111111111111111112').success)
 assert.ok(solanaAddressSchema.safeParse('11111111111111111111111111111111').success)
 assert.ok(!solanaAddressSchema.safeParse('2'.repeat(32)).success)
 assert.ok(!solanaAddressSchema.safeParse('z'.repeat(44)).success)
 assert.ok(!solanaAddressSchema.safeParse('0'.repeat(32)).success)
})
