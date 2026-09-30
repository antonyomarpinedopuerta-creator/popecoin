import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateRehearsalRent, publicRpc, REHEARSAL_GENESIS, REHEARSAL_RPC} from '../scripts/rehearsal-rent';
test('rent estimate pins genesis, sums peak without refund and leaves fees unapproved', async()=>{
 const methods:string[]=[];
 const result=await estimateRehearsalRent(1000,2000,async(method)=>{
  methods.push(method); return method==='getGenesisHash'?REHEARSAL_GENESIS:123456;
 });
 assert.equal(result.rpc,REHEARSAL_RPC);
 assert.equal(result.accountBytes.programData,2045);
 assert.equal(result.accountBytes.buffer,1037);
 assert.equal(result.peakRentLamports,'987648');
 assert.equal(result.peakRentSol,'0.000987648');
 assert.equal(result.totalCapLamports,null);
 assert.equal(methods[0],'getGenesisHash');
 assert.equal(methods[methods.length-1],'getGenesisHash');
});
test('invalid sizes fail before RPC and wrong genesis before rent queries', async()=>{
 let calls=0;
 for(const [size,max] of [[0,100],[100,99],[1,Infinity],[1,11000000]])
  await assert.rejects(estimateRehearsalRent(size,max,async()=>{calls++;return null;}));
 assert.equal(calls,0);
 await assert.rejects(estimateRehearsalRent(100,100,async()=>{calls++;return 'mainnet';}),/genesis/);
 assert.equal(calls,1);
});
test('malformed rent or changing genesis fails closed',async()=>{
 for(const value of [null,'123',-1,0,Number.MAX_SAFE_INTEGER+1])
  await assert.rejects(estimateRehearsalRent(100,100,async(method)=>method==='getGenesisHash'?REHEARSAL_GENESIS:value));
 let genesisCalls=0;
 await assert.rejects(estimateRehearsalRent(100,100,async(method)=>method==='getGenesisHash'?
  (++genesisCalls===1?REHEARSAL_GENESIS:'changed'):100),/genesis/);
});
test('transport ignores global CLI/environment endpoints and prohibits mutations/redirects',async()=>{
 const original=globalThis.fetch;
 let calls=0;
 globalThis.fetch=async(url,options)=>{
  calls++;
  assert.equal(url,'https://api.devnet.solana.com');
  assert.equal(options?.redirect,'error');
  return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:REHEARSAL_GENESIS}));
 };
 try {
  await assert.rejects(publicRpc('sendTransaction',[]));
  await assert.rejects(publicRpc('simulateTransaction',[]));
  await assert.rejects(publicRpc('requestAirdrop',[]));
  assert.equal(calls,0);
  assert.equal(await publicRpc('getGenesisHash',[]),REHEARSAL_GENESIS);
 } finally {globalThis.fetch=original;}
});
