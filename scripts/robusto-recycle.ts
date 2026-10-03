/** Prepare exactly one unsigned SPL return transfer; never reads signers or submits. */
import fs from 'node:fs';
import {Connection,PublicKey,Transaction} from '@solana/web3.js';
import {createTransferCheckedInstruction} from '@solana/spl-token';
import {createHash} from 'node:crypto';
import {ROBUSTO,connection} from './robusto-recovery';
import {readVestingSnapshot,reconcileFinalSnapshot,VestingSnapshot} from './rehearsal-vesting-one-tx';
import {GENESIS,RPC} from './rehearsal-one-tx';
export async function prepareRecycle(c:Connection,read=()=>readVestingSnapshot(c,ROBUSTO)){
 if(c.rpcEndpoint!==RPC||await c.getGenesisHash()!==GENESIS)throw Error('Devnet only');
 const s:VestingSnapshot=await read();reconcileFinalSnapshot(s,ROBUSTO);
 // The verified reader checks all identities; never accept an alternate mint or source.
 if(s.mint!==ROBUSTO.mint||s.vesting!=='DyVmc4pABesYYvHe5RZdTsNpheFyBsyK3nUpu1S9HeEB'||s.source!=='DHyysduG5SxsqiupB7Zvw32fLq14BUVBZbHKbXBqYcN6'||s.beneficiaryAta!=='GThf94JHTRKpQtk1jBubduGgazGq1YBLDnqpDqFRWLRJ')throw Error('Recycling identities mismatch');
 const latest=await c.getLatestBlockhash('confirmed');
 const tx=new Transaction({feePayer:new PublicKey(ROBUSTO.payer),recentBlockhash:latest.blockhash}).add(
  createTransferCheckedInstruction(new PublicKey(s.beneficiaryAta),new PublicKey(s.mint),new PublicKey(s.source),new PublicKey(ROBUSTO.beneficiary),10000000n,6));
 const message=tx.compileMessage(),fee=(await c.getFeeForMessage(message,'confirmed')).value;
 const balance=await c.getBalance(new PublicKey(ROBUSTO.payer),'confirmed');
 if(fee===null||!Number.isSafeInteger(fee)||fee<0||balance<fee)throw Error('Fee unavailable or payer insufficient');
 return {status:'UNSIGNED — AUTHORIZATION REQUIRED — NOT SIMULATED OR SENT',operation:'TransferChecked',cluster:'devnet',genesis:GENESIS,
  mint:s.mint,from:s.beneficiaryAta,to:s.source,owner:ROBUSTO.beneficiary,payer:ROBUSTO.payer,amountBaseUnits:'10000000',tokens:'10',decimals:6,
  feeLamports:fee,rentLamports:0,payerBalanceLamports:balance,requiredSigners:[ROBUSTO.payer,ROBUSTO.beneficiary],
  blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight,observedSlot:s.slot,
  expected:{supply:'10000000',oldReleased:'10000000',oldVault:'0',oldBeneficiaryAta:'0',source:'10000000'},
  messageSha256:createHash('sha256').update(message.serialize()).digest('hex'),
  unsignedTransactionBase64:tx.serialize({requireAllSignatures:false,verifySignatures:false}).toString('base64')};
}
if(require.main===module)(async()=>{
 const args=process.argv.slice(2);if(args.some(x=>x!=='--simulate')||args.length>1)throw Error('Only --simulate supported');
 const c=connection(),p=await prepareRecycle(c);let simulation:unknown;
 if(args.includes('--simulate')){
  const response=await fetch(RPC,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({jsonrpc:'2.0',id:1,method:'simulateTransaction',params:[p.unsignedTransactionBase64,{encoding:'base64',commitment:'confirmed',sigVerify:false,replaceRecentBlockhash:false,accounts:{encoding:'base64',addresses:[p.from,p.to]}}]})});
  const result=await response.json() as any;
  if(!response.ok||result.error||result.result?.value?.err)throw Error('Simulation failed: '+JSON.stringify(result.error??result.result?.value?.err));
  const accounts=result.result?.value?.accounts;
  if(!Array.isArray(accounts)||accounts.length!==2||accounts.some((a:any)=>!a||a.owner!=='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'||a.data[1]!=='base64'))throw Error('Simulation accounts unavailable');
  const amounts=accounts.map((a:any)=>Buffer.from(a.data[0],'base64').readBigUInt64LE(64).toString());
  if(amounts[0]!=='0'||amounts[1]!=='10000000')throw Error('Simulated transfer balances mismatch');
  reconcileFinalSnapshot(await readVestingSnapshot(c,ROBUSTO),ROBUSTO);
  simulation={...result.result,expectedPostAmounts:amounts,sigVerify:false,note:'Unsigned simulation only; actual on-chain balances remain unchanged'};
 }
 return {...p,...(simulation?{status:'UNSIGNED — SIMULATED — AUTHORIZATION REQUIRED — NOT SENT',simulation}:{})};
})().then(p=>{
 const output=`docs/evidence/robusto/recycle-proposal-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
 fs.mkdirSync('docs/evidence/robusto',{recursive:true});fs.writeFileSync(output,JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify({output,...p},null,2));
}).catch(e=>{console.error(e.message);process.exitCode=1;});
