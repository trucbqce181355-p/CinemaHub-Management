import test from 'node:test';
import assert from 'node:assert/strict';
import { requestPromoChange } from './promotionPricing.js';
const reply = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const options = { base: '/api', token: 'test', bookingId: 'b', operation: 'apply', code: 'TEST', subtotal: 100000 };
test('successful promo mutation does not make an extra read', async () => {
  const calls = []; const result = await requestPromoChange({ ...options, fetchImpl: async (url, init) => {
    calls.push([url, init.method]); return reply(200, {code:'TEST',discountAmount:10000,newTotal:90000});
  }}); assert.equal(result.data.newTotal,90000); assert.equal(calls.length,1);
});
for (const failure of ['network', '500', 'malformed']) test(`promo ${failure} is recovered by one read without repeating the write`, async () => {
  const calls=[]; const result=await requestPromoChange({...options,fetchImpl:async(url,init)=>{
    calls.push(init.method); if(calls.length===1){if(failure==='network')throw Error('network');return reply(failure==='500'?500:200,{});}
    return reply(200,{booking:{id:'b',status:'PENDING',subtotal:100000,promoCode:'TEST',discountAmount:10000,totalAmount:90000}});
  }}); assert.deepEqual(calls,['POST','GET']);assert.equal(result.reconciled,true);assert.equal(result.data.newTotal,90000);
});
test('business rejection preserves the error and never starts a second write or recovery',async()=>{
  let calls=0;await assert.rejects(requestPromoChange({...options,fetchImpl:async()=>{calls++;return reply(400,{error:'Expired'});}}),/Expired/);assert.equal(calls,1);
});
test('unavailable or foreign booking recovery leaves checkout uncertain',async()=>{
  const r=await requestPromoChange({...options,operation:'recover',fetchImpl:async()=>reply(200,{booking:{id:'foreign',status:'PENDING',subtotal:100000,discountAmount:0,totalAmount:100000}})});
  assert.equal(r.uncertain,true);
});
test('clear promo returns the stored original subtotal',async()=>{
  const r=await requestPromoChange({...options,operation:'clear',fetchImpl:async()=>reply(200,{subtotal:100000,discountAmount:0,totalAmount:100000})});
  assert.equal(r.data.code,null);assert.equal(r.data.newTotal,100000);
});
