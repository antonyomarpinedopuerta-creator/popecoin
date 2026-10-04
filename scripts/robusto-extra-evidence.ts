/** Supplemental public RPC evidence. No secrets, signing or send methods. */
import fs from 'node:fs';
import {PublicKey} from '@solana/web3.js';
import {connection,ROBUSTO} from './robusto-recovery';
import {GENESIS} from './rehearsal-one-tx';
async function main(){
 const c=connection();if(await c.getGenesisHash()!==GENESIS)throw Error('Devnet mismatch');
 const identity=JSON.parse(fs.readFileSync('docs/evidence/robusto/second-beneficiary-public.json','utf8'));
 const names=['beneficiary','beneficiaryAta','vesting','vault'];
 const absent=await c.getMultipleAccountsInfoAndContext(names.map(n=>new PublicKey(identity[n])),'finalized');
 if(absent.value.some(x=>x!==null))throw Error('New rehearsal account already exists; stop');
 const signatures=await c.getSignaturesForAddress(new PublicKey(ROBUSTO.program),{limit:20},'finalized');
 const transactions=[];
 for(const s of signatures){
  const tx=await c.getParsedTransaction(s.signature,{commitment:'finalized',maxSupportedTransactionVersion:1});
  if(!tx||tx.meta?.err)throw Error('Program transaction missing or failed');
  transactions.push({signature:s.signature,transaction:tx});await new Promise(r=>setTimeout(r,500));
 }
 const metadataProgram=new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
 const [metadata]=PublicKey.findProgramAddressSync([Buffer.from('metadata'),metadataProgram.toBuffer(),new PublicKey(ROBUSTO.mint).toBuffer()],metadataProgram);
 const metadataInfo=await c.getAccountInfo(metadata,'finalized');
 const mint=await c.getParsedAccountInfo(new PublicKey(ROBUSTO.mint),'finalized');
 const report={observedAt:new Date().toISOString(),genesis:GENESIS,commitment:'finalized',newIdentity:identity,
 absentAtSlot:absent.context.slot,absentAccounts:names.map(n=>({role:n,address:identity[n],exists:false})),
 mint,metadata:{address:metadata.toBase58(),exists:metadataInfo!==null,owner:metadataInfo?.owner.toBase58()??null},
 programHistory:signatures,transactions,note:'Read-only evidence; private identity creation is local only. No second rehearsal transaction submitted.'};
 const output=`docs/evidence/robusto/additional-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,absentAccounts:report.absentAccounts,metadata:report.metadata,programHistory:signatures},null,2));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
