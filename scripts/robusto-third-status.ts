/** Frozen third rehearsal: read-only, no signer, simulation or submission. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PublicKey} from '@solana/web3.js';
import {connection} from './robusto-recovery';
import {readVestingSnapshot} from './rehearsal-vesting-one-tx';
export function pinThirdPlan(p:any){
 const expected={cluster:'devnet',program:'6nLZrtmi9Uf3E3kJjGY9Po4KqNhvLDQqQAax5UKMAGVk',mint:'CfHGrav3zjZyAEdspKwdBGW3yBHYkiz6cYpeeQXoujvo',beneficiary:'GuKSMzTw7JZfAkh9A4hGYYysmQGpxTxXF2QdC1QHVFTF',amount:'10000000',startUtc:'2026-10-06T13:32:52Z',cliffSeconds:43200,durationSeconds:604800,mintAdditionalTokens:false};
 for(const [key,value] of Object.entries(expected))if(p[key]!==value)throw Error('Frozen third rehearsal plan mismatch: '+key);
 return p;
}
export async function thirdStatus(c=connection()){
 const p=pinThirdPlan(JSON.parse(fs.readFileSync('config/robusto-rehearsal-3.json','utf8')));
 const reader=Object.create(c);reader.getMultipleAccountsInfoAndContext=(keys:PublicKey[])=>c.getMultipleAccountsInfoAndContext(keys,'finalized');
 const snapshot=await readVestingSnapshot(reader,p);
 if(snapshot.vesting!=='4A63yMPGnrH4XY8yFAAFK8TkRi7rJ3May1GW1DvX2tNN'||snapshot.vault!=='CNJpJ3D9FUJcMnfpPQgxV6AxMoWbUwvGcUgtp2DmVuAT'||snapshot.beneficiaryAta!=='9gSDUytN7u3tUk8B8h7Tmdtik8U3SScyXfHRHL2Swgby')throw Error('Frozen PDA/ATA mismatch');
 const v=snapshot.vestingState;
 if(!v||v.start!==1791293572n||v.cliff!==1791336772n||v.end!==1791898372n||snapshot.supply!==10000000n||snapshot.sourceAmount!==0n||snapshot.vaultAmount!+snapshot.beneficiaryAmount!==10000000n||snapshot.beneficiaryAmount!==v.released)throw Error('Third rehearsal reconciliation mismatch');
 const keys=[snapshot.vesting,snapshot.vault,snapshot.beneficiaryAta,snapshot.mint];
 const accounts=await c.getMultipleAccountsInfoAndContext(keys.map(k=>new PublicKey(k)),'finalized');
 const fingerprints=accounts.value.map((a,i)=>{if(!a)throw Error('Account missing');return {address:keys[i],owner:a.owner.toBase58(),lamports:a.lamports,dataSha256:createHash('sha256').update(a.data).digest('hex')};});
 return {status:'READ_ONLY_DEVNET_OBSERVATION',commitment:'finalized',observedAt:new Date().toISOString(),snapshot,fingerprintSlot:accounts.context.slot,fingerprints,
  notes:['Separate fingerprint read may use a newer slot.','No release authorized or submitted by this tool.','Eligibility depends on on-chain Clock, not wall clock or target date.']};
}
if(require.main===module)thirdStatus().then(r=>{
 const out=`docs/evidence/robusto/third-status-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
 fs.writeFileSync(out,JSON.stringify(r,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
 console.log(JSON.stringify({output:out,snapshot:r.snapshot},(_,v)=>typeof v==='bigint'?v.toString():v,2));
}).catch(e=>{console.error(e.message);process.exitCode=1;});
