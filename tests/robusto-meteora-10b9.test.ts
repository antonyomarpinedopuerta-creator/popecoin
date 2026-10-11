import './offline-safety';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BorshInstructionCoder,Idl} from '@coral-xyz/anchor';
import idl from '../scripts/meteora-local-idl.json';
import {poolMath,runtimeFixture10b9,validateMints} from '../scripts/robusto-meteora-10b9';
import {SUPPLY} from '../scripts/robusto-10b9-alternative';
test('separate 9/6 fixture has exact closed supply, quote decimals and deterministic bytes',()=>{
 const f=runtimeFixture10b9();assert.deepEqual(f,runtimeFixture10b9());
 const a=Buffer.from(f.input.mintAccount.dataBase64,'base64'),b=Buffer.from(f.mintB,'base64');
 validateMints(a,b);assert.equal(a.readBigUInt64LE(36),SUPPLY);assert.equal(a[44],9);assert.equal(b[44],6);
 for(const [data,offset,value] of [[a,44,6],[b,44,9],[a,0,1],[b,46,1]] as const){const changed=Buffer.from(data);changed[offset]=value;assert.throws(()=>validateMints(data===a?changed:a,data===b?changed:b));}
 assert.equal(f.authorization,false);assert.equal(f.status,'PROPOSED_NOT_APPROVED');
});
test('human prices convert 9/6 decimals using exact rational Q64.64 bounds',()=>{
 const {lo,hi,liquidity}=poolMath(4_000_000_000_000_000_000n,1n,3n,1000n);
 const radicand=(1n<<128n)/1_000_000n;
 assert.ok(lo*lo<=radicand&&(lo+1n)*(lo+1n)>radicand);assert.ok(hi>lo);
 assert.ok(liquidity>BigInt(Number.MAX_SAFE_INTEGER)&&liquidity<(1n<<128n));
 for(const args of [[0n,1n,3n,1000n],[4_000_000_000_000_000_001n,1n,3n,1000n],[1n,3n,1n,1000n],[1n,1n,3n,0n],[1n,1n,3n,1n<<64n]] as const)assert.throws(()=>poolMath(args[0],args[1],args[2],args[3]));
});
test('encoded liquidity retains all u128 bytes and authorities are absent from preparation',()=>{
 const f=runtimeFixture10b9(),data=Buffer.from(f.instruction.dataBase64,'base64');
 const decoded=new BorshInstructionCoder(idl as Idl).decode(data)!.data as any;
 assert.equal(decoded.params.liquidity.toString(),f.liquidity);
 assert.equal(decoded.params.collect_fee_mode,1);assert.equal(decoded.params.activation_type,1);
 assert.deepEqual(f.instruction.accounts.filter(a=>a.isSigner).map(a=>a.name),['position_nft_mint','payer']);
 assert.ok(!f.instruction.accounts.some(a=>/mint_authority|freeze_authority/.test(a.name)));
});
