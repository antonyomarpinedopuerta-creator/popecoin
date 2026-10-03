/** Read-only Devnet recovery. No keypairs, signing, simulation or submission. */
import fs from 'node:fs';
import {Connection, PublicKey} from '@solana/web3.js';
import {readVestingSnapshot, reconcileFinalSnapshot} from './rehearsal-vesting-one-tx';
import {GENESIS, RPC} from './rehearsal-one-tx';
export const ROBUSTO = {
 cluster:'devnet', program:'6nLZrtmi9Uf3E3kJjGY9Po4KqNhvLDQqQAax5UKMAGVk',
 mint:'CfHGrav3zjZyAEdspKwdBGW3yBHYkiz6cYpeeQXoujvo', payer:'4nt7G7nXvBNvygsDjn4zS9vQCR1Zgn1GTpyh8Snh5N7m',
 authority:'EEbLZxtZ7hfruksSCG3iKd9CZ7fJ69tQE414Z78Kzt8p', beneficiary:'BUzXyQ5EREcrQsNDpRsByU56TU9bU5mh3hxUtyB8q4nc',
 amount:'10000000', startUtc:'2026-10-01T10:14:22Z', cliffSeconds:10, durationSeconds:1810,
};
export const FINAL_SIGNATURE='2BBYKsCEPVcbgi76YEBy2782xWhrXAqt55rbPT6PHYgeJXQUKZuZ14SKJWe1m8WxBdryBZCCFret8UXzSjkKCguB';
export function connection(){return new Connection(RPC,{commitment:'finalized',disableRetryOnRateLimit:true,
 fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})});}
export async function recover(c=connection()){
 const genesis=await c.getGenesisHash();if(genesis!==GENESIS)throw Error('Devnet genesis mismatch');
 // The existing reader requests confirmed explicitly; force its account snapshot to finalized.
 const reader=Object.create(c) as Connection;
 reader.getMultipleAccountsInfoAndContext=(keys,config)=>c.getMultipleAccountsInfoAndContext(keys,'finalized');
 const snapshot=await readVestingSnapshot(reader,ROBUSTO);
 const reconciliation=reconcileFinalSnapshot(snapshot,ROBUSTO);
 const names={mint:ROBUSTO.mint,vesting:snapshot.vesting,vault:snapshot.vault,source:snapshot.source,
 beneficiaryAta:snapshot.beneficiaryAta,beneficiary:ROBUSTO.beneficiary,payer:ROBUSTO.payer};
 const histories:Record<string,unknown>={};
 for(const [name,address] of Object.entries(names)){
  histories[name]=await c.getSignaturesForAddress(new PublicKey(address),{limit:name==='payer'?1000:100},'finalized');
  await new Promise(r=>setTimeout(r,500));
 }
 const signatures=(histories.mint as {signature:string}[]).map(x=>x.signature);
 const transactions:Record<string,unknown>={};
 for(const signature of signatures){
  const tx=await c.getParsedTransaction(signature,{commitment:'finalized',maxSupportedTransactionVersion:1});
  if(!tx)throw Error('Transaction unavailable: '+signature);transactions[signature]=tx;
  await new Promise(r=>setTimeout(r,500));
 }
 const status=(await c.getSignatureStatuses([FINAL_SIGNATURE],{searchTransactionHistory:true})).value[0];
 if(status?.confirmationStatus!=='finalized'||status.err)throw Error('Final release not finalized successfully');
 const payer=await c.getAccountInfo(new PublicKey(ROBUSTO.payer),'finalized');
 if(!payer||payer.owner.toBase58()!=='11111111111111111111111111111111')throw Error('Unexpected payer');
 return {status:'RPC VERIFIED — NOT AN INDEPENDENT AUDIT',observedAt:new Date().toISOString(),rpc:RPC,genesis,
 commitment:'finalized',snapshot,reconciliation,payerBalanceLamports:payer.lamports,
 finalSignature:FINAL_SIGNATURE,finalStatus:status,histories,transactions,
 scope:'Public RPC observations and local pinned ELF comparison. Histories bounded to 100 entries/account, 1000 for payer. No new transactions.'};
}
if(require.main===module){
 const date=new Date().toISOString().replace(/[:.]/g,'-');const output=`docs/evidence/robusto/recovery-${date}.json`;
 recover().then(report=>{fs.mkdirSync('docs/evidence/robusto',{recursive:true});fs.writeFileSync(output,JSON.stringify(report,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
 console.log(JSON.stringify({output,snapshot:report.snapshot,payerBalanceLamports:report.payerBalanceLamports,finalStatus:report.finalStatus},(_,v)=>typeof v==='bigint'?v.toString():v,2));
 }).catch(e=>{console.error(e.message);process.exitCode=1;});
}
