import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PublicKey} from '@solana/web3.js';
import {TOKEN_PROGRAM_ID,NATIVE_MINT} from '@solana/spl-token';
import {FixtureAccount} from '../scripts/robusto-fixture-conditions';
import {validateTokenSourceFixture} from '../scripts/robusto-token-fixture';
function fixture(native=false){
 const mint=native?NATIVE_MINT.toBase58():new PublicKey(Buffer.alloc(32,7)).toBase58(),authority=PublicKey.default.toBase58();
 const data=Buffer.alloc(165);new PublicKey(mint).toBuffer().copy(data);new PublicKey(authority).toBuffer().copy(data,32);
 data.writeBigUInt64LE(20n,64);data[108]=1;if(native){data.writeUInt32LE(1,109);data.writeBigUInt64LE(100n,113);}
 const account:FixtureAccount={exists:true,owner:TOKEN_PROGRAM_ID.toBase58(),lamports:'120',executable:false,dataSha256:null};
 const bind=()=>{account.dataBase64=data.toString('base64');account.dataSha256=createHash('sha256').update(data).digest('hex');};bind();
 return {mint,authority,data,account,bind,check:()=>validateTokenSourceFixture(account,mint,authority,'20')};
}
test('classic token sources accept exact inventory and native backing boundaries without authorization',()=>{
 for(const native of [false,true])assert.equal(fixture(native).check().authorization,false);
 const f=fixture();f.data.writeBigUInt64LE(2n**64n-1n,64);f.bind();validateTokenSourceFixture(f.account,f.mint,f.authority,'18446744073709551615');
});
test('token source rejects altered mint, authority, frozen/uninitialized state, delegation and close authority',()=>{
 for(const offset of [0,32,72,76,108,121,129,133]){
  const f=fixture();f.data[offset]^=1;f.bind();assert.throws(f.check);
 }
});
test('token source rejects missing bytes, insufficient tokens, native backing mismatch and invalid amounts',()=>{
 for(const mode of ['missing','balance','backing','native','reserve','owner','executable','size','hash','amount']){
  const f=fixture(mode==='backing');
  if(mode==='missing')delete f.account.dataBase64;
  if(mode==='balance'){f.data.writeBigUInt64LE(19n,64);f.bind();}
  if(mode==='backing')f.account.lamports='119';
  if(mode==='native'){f.data.writeUInt32LE(1,109);f.bind();}
  if(mode==='reserve'){f.data.writeBigUInt64LE(1n,113);f.bind();}
  if(mode==='owner')f.account.owner=PublicKey.default.toBase58();
  if(mode==='executable')f.account.executable=true;
  if(mode==='size'){f.account.dataBase64='';f.account.dataSha256=createHash('sha256').update(Buffer.alloc(0)).digest('hex');}
  if(mode==='hash')f.account.dataSha256='a'.repeat(64);
  assert.throws(()=>mode==='amount'?validateTokenSourceFixture(f.account,f.mint,f.authority,'18446744073709551616'):f.check());
 }
});
