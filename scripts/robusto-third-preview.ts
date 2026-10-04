/** Read-only RPC and unsigned simulations. Never loads a keypair or signs/sends. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PublicKey,Transaction,TransactionInstruction} from '@solana/web3.js';
import {createAssociatedTokenAccountInstruction,TOKEN_PROGRAM_ID,unpackAccount} from '@solana/spl-token';
import {connection} from './robusto-recovery';
import {GENESIS,findCandidate,readDeployment} from './rehearsal-one-tx';
import {prepareRehearsal} from './prepare-rehearsal';
import {readVestingSnapshot} from './rehearsal-vesting-one-tx';
async function main(){
 const c=connection();
 // Space public RPC calls to avoid rate-limit bursts.
 const original=(c as any)._rpcRequest.bind(c);
 (c as any)._rpcRequest=async(...args:any[])=>{await new Promise(r=>setTimeout(r,450));return original(...args);};
 assert.equal(await c.getGenesisHash(),GENESIS);
 const reader=Object.create(c);reader.getMultipleAccountsInfoAndContext=(keys:PublicKey[])=>c.getMultipleAccountsInfoAndContext(keys,'finalized');
 const old=await readVestingSnapshot(reader,JSON.parse(fs.readFileSync('config/robusto-rehearsal-2.json','utf8')));
 assert.equal(old.sourceAmount,10000000n);assert.equal(old.supply,10000000n);assert.equal(old.vaultAmount,0n);assert.equal(old.vestingState?.released,0n);assert.equal(old.beneficiaryAmount,0n);
 const p=JSON.parse(fs.readFileSync('config/robusto-rehearsal-3.json','utf8'));
 assert.equal(p.startUtc,null);assert.equal(p.amount,'10000000');assert.equal(p.mintAdditionalTokens,false);
 const now=old.unixTime,preview={...p,startUtc:new Date((now+172800)*1000).toISOString().replace('.000Z','Z')};
 const plan=prepareRehearsal(preview,JSON.parse(findCandidate(readDeployment()).idlBytes.toString()));
 const keys=[plan.destination,plan.vesting,plan.vault].map(x=>new PublicKey(x));
 const absent=await c.getMultipleAccountsInfoAndContext(keys,'finalized');assert(absent.value.every(x=>x===null),'Third accounts already exist: stop and recover');
 const payer=new PublicKey(p.payer),mint=new PublicKey(p.mint),beneficiary=new PublicKey(p.beneficiary);
 const rentAta=await c.getMinimumBalanceForRentExemption(165,'finalized'),rentVesting=await c.getMinimumBalanceForRentExemption(145,'finalized');
 const balance=await c.getBalance(payer,'finalized');
 const latest=await c.getLatestBlockhash('finalized');
 const ata=createAssociatedTokenAccountInstruction(payer,keys[0],beneficiary,mint);
 const ix=plan.steps.map(s=>new TransactionInstruction({programId:new PublicKey(s.program),keys:s.accounts.map(a=>({pubkey:new PublicKey(a.address),isSigner:a.signer,isWritable:a.writable})),data:Buffer.from(s.dataHex,'hex')}));
 const tx=(instructions:TransactionInstruction[])=>new Transaction({feePayer:payer,recentBlockhash:latest.blockhash}).add(...instructions);
 const feeQuotes=[];
 for(const [name,instruction,maxFee,rent] of [['create-ata',ata,5000,rentAta],['initialize',ix[0],15000,rentAta+rentVesting],['deposit',ix[1],10000,0],['release',ix[2],10000,0]] as const){
  const message=tx([instruction]).compileMessage();const fee=(await c.getFeeForMessage(message,'finalized')).value;assert(fee!==null&&fee<=maxFee);
  feeQuotes.push({name,fee,maxFee,rent,signers:message.accountKeys.slice(0,message.header.numRequiredSignatures).map(k=>k.toBase58()),accounts:instruction.keys.map(k=>k.pubkey.toBase58())});
 }
 assert(balance>=rentAta*2+rentVesting+60000);
 const simulate=async(instructions:TransactionInstruction[])=>{
  const raw=tx(instructions).serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64');
  const response=await (c as any)._rpcRequest('simulateTransaction',[raw,{encoding:'base64',commitment:'finalized',sigVerify:false,replaceRecentBlockhash:true,accounts:{encoding:'base64',addresses:[plan.source,plan.destination,plan.vault,plan.vesting]}}]);
  if(response.error)throw Error(JSON.stringify(response.error));return response.result;
 };
 const setup=await simulate([ata,ix[0],ix[1]]);assert.equal(setup.value.err,null);
 const amounts=setup.value.accounts.slice(0,3).map((a:any,i:number)=>unpackAccount(new PublicKey([plan.source,plan.destination,plan.vault][i]),{...a,owner:new PublicKey(a.owner),data:Buffer.from(a.data[0],'base64')},TOKEN_PROGRAM_ID).amount.toString());
 assert.deepEqual(amounts,['0','0','10000000']);
 const precliff=await simulate([ata,ix[0],ix[1],ix[2]]);
 assert.deepEqual(precliff.value.err,{InstructionError:[3,{Custom:6002}]});
 const evidence={status:'UNSIGNED_SIMULATIONS_ONLY_NO_TRANSACTIONS',genesis:GENESIS,commitment:'finalized',snapshot:old,absentAtSlot:absent.context.slot,payerBalanceLamports:balance,rentAta,rentVesting,feeQuotes,maxTotalLamports:rentAta*2+rentVesting+60000,previewOnly:plan,relativeSchedule:p.schedulePolicy,setupSimulation:setup,precliffSimulation:precliff,notes:['Preview dates are illustrative only; recompute from fresh chain time at authorized Initialize.','Bundled simulations prove dependencies without creating accounts. Actual plan uses separate transactions.','No signatures verified in simulation; signer possession and approvals remain execution prerequisites.','Future-time releases require local tests; not externally verified.']};
 fs.writeFileSync('docs/evidence/robusto/third-rehearsal-preview.json',JSON.stringify(evidence,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
 console.log(JSON.stringify({slot:old.slot,chainTime:new Date(now*1000).toISOString(),beneficiary:p.beneficiary,ata:plan.destination,vesting:plan.vesting,vault:plan.vault,rentAta,rentVesting,balance,feeQuotes,maxTotalLamports:evidence.maxTotalLamports,setup:setup.value.err,precliff:precliff.value.err},null,2));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
