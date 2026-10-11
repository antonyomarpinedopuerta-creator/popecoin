import './offline-safety';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PublicKey} from '@solana/web3.js';
import {MintLayout,TOKEN_PROGRAM_ID} from '@solana/spl-token';
import {BorshInstructionCoder,Idl} from '@coral-xyz/anchor';
import {FOUNDER,SUPPLY,U64,units,vested,validateAlternative,fixture,verifyClosedMint} from '../scripts/robusto-10b9-alternative';
const proposal=()=>JSON.parse(fs.readFileSync('config/robusto-tokenomics-10b9-alternative.json','utf8'));
test('10B/9 conserves five allocations exactly above signed i64 and JS precision',()=>{
 const p=proposal();assert.equal(validateAlternative(p).supply,10_000_000_000_000_000_000n);
 assert.ok(SUPPLY>(1n<<63n)-1n&&SUPPLY<=U64);
 assert.equal(FOUNDER,1_000_000_000_000_000n);
 assert.equal(p.allocations.reduce((a:bigint,r:any)=>a+units(r.tokens),0n),SUPPLY);
 for(const mutate of [(p:any)=>p.allocations[4].tokens='1000001',(p:any)=>p.allocations[4].label='community',(p:any)=>p.operationsAuthorized=true,(p:any)=>p.decimalsAssumption=6]){const changed=proposal();mutate(changed);assert.throws(()=>validateAlternative(changed));}
});
test('decimal conversion never rounds, uses no Number and enforces u64 boundary',()=>{
 assert.equal(units('18446744073.709551615'),U64);assert.equal(units('0.000000001'),1n);
 for(const v of ['18446744073.709551616','0.0000000001','1e10','01','-1',10000000000])assert.throws(()=>units(v));
});
test('founder lock, rounding, duplicate release arithmetic and full allocation',()=>{
 const start=365n*86400n,end=start+730n*86400n;
 assert.equal(vested(FOUNDER,start,end,start-1n),0n);assert.equal(vested(FOUNDER,start,end,start),0n);
 assert.equal(vested(FOUNDER,start,end,start+365n*86400n),FOUNDER/2n);
 const first=vested(FOUNDER,start,end,start+1n);
 assert.equal(first,FOUNDER/(730n*86400n));assert.equal(vested(FOUNDER,start,end,start+1n)-first,0n);
 assert.equal(vested(FOUNDER,start,end,end),FOUNDER);
 assert.throws(()=>vested(U64+1n,start,end,end));assert.throws(()=>vested(1n,2n,2n,2n));
});
test('encoded SPL supply uses all eight bytes and nine decimals, never a JS number',()=>{
 const f=fixture(proposal()),mint=Buffer.from(f.instructions[1].dataHex,'hex');
 assert.equal(mint[0],14);assert.equal(mint.readBigUInt64LE(1),SUPPLY);assert.equal(mint[9],9);
 assert.equal(Buffer.from(f.instructions[0].dataHex,'hex')[1],9);
 const close=Buffer.from(f.instructions.at(-1)!.dataHex,'hex');assert.equal(close[0],6);assert.equal(close[1],0);assert.equal(close[2],0);
 assert.notEqual(f.mintAuthority,f.distributionAuthority);
 assert.equal(f.instructions[1].accounts[2].address,f.mintAuthority);
 assert.equal(f.instructions[2].accounts[3].address,f.distributionAuthority);
 assert.equal(f.authorization,false);assert.equal(f.mainnetDisabled,true);
 const coder=new BorshInstructionCoder(JSON.parse(fs.readFileSync('target/idl/popecoin_vesting.json','utf8')) as Idl);
 const initialize=coder.decode(Buffer.from(f.instructions[6].dataHex,'hex'))!;
 assert.equal((initialize.data as any).total_amount.toString(),FOUNDER.toString());
 assert.equal((initialize.data as any).start_time.toString(),(365n*86400n).toString());
 assert.equal(Buffer.from(f.instructions[7].dataHex,'hex').readBigUInt64LE(8),FOUNDER);
});
test('closed mint requires exact supply, null emission/freeze authorities, classic owner and layout',()=>{
 const data=Buffer.alloc(82);
 MintLayout.encode({mintAuthorityOption:0,mintAuthority:PublicKey.default,supply:SUPPLY,decimals:9,isInitialized:true,freezeAuthorityOption:0,freezeAuthority:PublicKey.default},data);
 const account={data,owner:TOKEN_PROGRAM_ID,executable:false};assert.equal(verifyClosedMint(account).additionalIssuancePossible,false);
 for(const [offset,value] of [[0,1],[44,8],[46,1]]){const altered=Buffer.from(data);altered[offset]=value;assert.throws(()=>verifyClosedMint({...account,data:altered}));}
 assert.throws(()=>verifyClosedMint({...account,owner:PublicKey.default}));assert.throws(()=>verifyClosedMint({...account,executable:true}));
});
