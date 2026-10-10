/** Synthetic, independently supplied expectations only. Never RPC evidence or authorization. */
import {createHash} from 'node:crypto';
import {PublicKey,Transaction,SystemProgram} from '@solana/web3.js';
export type FixtureAccount = {exists:boolean;owner:string|null;lamports:string;dataSha256:string|null;executable:boolean};
export type FixtureConditions = {
 scope:'OFFLINE_FIXTURE_ONLY'; authorization:false; cluster:'SIMULATED';
 snapshotSlot:number;snapshotAtMs:number;nowMs:number;currentSlot:number;maxAgeMs:number;maxSlotLag:number;
 currentHeight:number;blockhash:string;knownBlockhashes:string[];firstValidHeight:number;lastValidHeight:number;
 expectedAccounts:Record<string,FixtureAccount>;observedAccounts:Record<string,FixtureAccount>;
 budget:{fee:string;rent:string;otherDebit:string;maxFee:string;maxRent:string;maxTotal:string;payerReserve:string};
};
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function number(v:unknown){if(!Number.isSafeInteger(v)||Number(v)<0)throw Error('Missing or invalid simulated integer');return v as number;}
function amount(v:unknown){if(typeof v!=='string'||! /^(0|[1-9][0-9]*)$/.test(v)||v.length>20||BigInt(v)>2n**64n-1n)throw Error('Missing or invalid simulated amount');return BigInt(v);}
function account(a:FixtureAccount){
 if(!a||typeof a.exists!=='boolean'||typeof a.executable!=='boolean')throw Error('Missing account state');
 amount(a.lamports);
 if(a.exists){if(typeof a.owner!=='string'||new PublicKey(a.owner).toBase58()!==a.owner||! /^[a-f0-9]{64}$/.test(a.dataSha256??''))throw Error('Invalid account state');}
 else if(a.owner!==null||a.dataSha256!==null||a.lamports!=='0'||a.executable!==false)throw Error('Inconsistent absent account');
 return [a.exists,a.owner,a.lamports,a.dataSha256,a.executable];
}
export function validateFixtureConditions(encoded:string,c:FixtureConditions){
 if(!c||c.scope!=='OFFLINE_FIXTURE_ONLY'||c.authorization!==false||c.cluster!=='SIMULATED')throw Error('Synthetic conditions only; not authorization');
 const now=number(c.nowMs),at=number(c.snapshotAtMs),slot=number(c.currentSlot),snapshot=number(c.snapshotSlot);
 if(now<at||now-at>number(c.maxAgeMs)||slot<snapshot||slot-snapshot>number(c.maxSlotLag))throw Error('Stale or inconsistent fixture snapshot');
 const height=number(c.currentHeight),first=number(c.firstValidHeight),last=number(c.lastValidHeight);
 const tx=Transaction.from(Buffer.from(encoded,'base64'));
 if(typeof c.blockhash!=='string'||new PublicKey(c.blockhash).toBase58()!==c.blockhash||tx.recentBlockhash!==c.blockhash||
    !Array.isArray(c.knownBlockhashes)||!c.knownBlockhashes.includes(c.blockhash)||first>last||height<first||height>last)
   throw Error('Unknown or expired simulated blockhash');
 const keys=tx.compileMessage().accountKeys.map(k=>k.toBase58()).sort();
 for(const rows of [c.expectedAccounts,c.observedAccounts]){
  if(!rows||JSON.stringify(Object.keys(rows).sort())!==JSON.stringify(keys))throw Error('Complete account snapshot required');
 }
 const states=keys.map(k=>{
  const expected=account(c.expectedAccounts[k]),observed=account(c.observedAccounts[k]);
  if(JSON.stringify(expected)!==JSON.stringify(observed))throw Error('Account differs from expected fixture state');
  return [k,...observed];
 });
 if(!c.budget)throw Error('Missing fixture budget');
 const b=c.budget,fee=amount(b.fee),rent=amount(b.rent),other=amount(b.otherDebit),total=fee+rent+other;
 let explicitRent=0n,explicitTransfers=0n;
 for(const ix of tx.instructions)if(ix.programId.equals(SystemProgram.programId)){
  if(ix.data.length===52&&ix.data.readUInt32LE(0)===0)explicitRent+=ix.data.readBigUInt64LE(4);
  else if(ix.data.length===12&&ix.data.readUInt32LE(0)===2)explicitTransfers+=ix.data.readBigUInt64LE(4);
  else throw Error('Unsupported system debit in fixture');
 }
 if(rent<explicitRent||other<explicitTransfers)throw Error('Fixture budget understates explicit instruction debit');
 if(fee>amount(b.maxFee)||rent>amount(b.maxRent)||total>amount(b.maxTotal))throw Error('Fixture budget limit exceeded');
 const payer=c.observedAccounts[tx.feePayer!.toBase58()];
 if(!payer.exists||payer.executable||payer.owner!=='11111111111111111111111111111111'||amount(payer.lamports)<total+amount(b.payerReserve))
   throw Error('Fixture payer balance/reserve insufficient');
 // Time/height may advance during review, but the reviewed snapshot and limits must not change.
 return digest({scope:c.scope,cluster:c.cluster,snapshot,at,maxAgeMs:c.maxAgeMs,maxSlotLag:c.maxSlotLag,
  blockhash:c.blockhash,known:c.knownBlockhashes,first,last,states,budget:b});
}
