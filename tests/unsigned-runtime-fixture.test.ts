import './offline-safety';
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {BorshInstructionCoder,Idl} from '@coral-xyz/anchor';
import {runtimeFixture} from '../scripts/prepare-unsigned-runtime-fixture';
import {prepareMeteoraLocal} from '../scripts/robusto-meteora-local';
import idl from '../scripts/meteora-local-idl.json';

test('runtime export matches canonical preparation and pinned runtime bytes',()=>{
 const f=runtimeFixture(),prepared=prepareMeteoraLocal(f.input);
 assert.deepEqual(f.instruction.accounts.map(({name,...a})=>a),prepared.instruction.accounts);
 assert.equal(f.instruction.dataBase64,prepared.instruction.dataBase64);
 assert.equal(f.scope,'OFFLINE_FIXTURE_ONLY');assert.equal(f.authorization,false);assert.equal(f.mainnetDisabled,true);
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(f,null,2)+'\n').digest('hex'),'642012176374b022f97605fc50d62c8601d78420914273430fb9cf63316d4258');
});
test('adversarial exports preserve ABI while changing the intended invalid parameter',()=>{
 const f=runtimeFixture(),coder=new BorshInstructionCoder(idl as Idl);
 for(const variant of f.variants){
  const decoded=coder.decode(Buffer.from(variant.dataBase64,'base64'))!;
  assert.equal(decoded.name,'initialize_customizable_pool');
  const p=(decoded.data as any).params;
  if(variant.name==='zeroLiquidity')assert.equal(p.liquidity.toString(),'0');
  if(variant.name==='maxLiquidity')assert.equal(p.liquidity.toString(),(2n**128n-1n).toString());
  if(variant.name==='invalidRange')assert.equal(p.sqrt_min_price.toString(),p.sqrt_max_price.toString());
  if(variant.name==='invalidActivation')assert.equal(p.activation_type,255);
  if(variant.name==='invalidFeeMode')assert.equal(p.collect_fee_mode,255);
  assert.notEqual(variant.dataBase64,f.instruction.dataBase64);
 }
});
