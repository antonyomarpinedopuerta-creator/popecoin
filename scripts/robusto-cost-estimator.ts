/** Offline checklist or future explicitly authorized read-only quotes. No signers or submission. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Connection,PublicKey,Transaction,SystemProgram} from '@solana/web3.js';
import {Idl} from '@coral-xyz/anchor';
import {findMetadataPda,mplTokenMetadata,MPL_TOKEN_METADATA_PROGRAM_ID} from '@metaplex-foundation/mpl-token-metadata';
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults';
import {publicKey} from '@metaplex-foundation/umi';
import {validateRobustoProposal} from './robusto-metadata';
import {address,integer,validateProduction,buildProductionSteps,quoteSteps,requireMainnetReadOnly,assertMainnet,verifyProgramAccounts,MAINNET_GENESIS} from './robusto-production';
import {buildProgramDeployment} from './robusto-program-deployment';
import {LOADER} from './rehearsal-one-tx';

export function offlineCostChecklist(){
 const p=validateRobustoProposal(JSON.parse(fs.readFileSync('config/robusto-production.json','utf8')));
 return {status:'OFFLINE_NOT_A_QUOTE_NOT_AUTHORIZED',mainnetMode:p.mainnetMode,prices:null,
  categories:[
   {kind:'program',sizes:'buffer 37+capacity, program 36, ProgramData 45+capacity',fees:'one create, ceil(ELF bytes/650) writes, one deploy; buffer rent temporary'},
   {kind:'mint',size:82,fees:'create+initialize, exact supply issuance'},
   {kind:'atas',size:165,count:'one source + one per unique distribution recipient'},
   {kind:'metadata',cost:'fresh unsigned mint+metadata simulation: payer debit minus mint rent and bundled transaction fee'},
   {kind:'vesting',sizes:[145,165],count:'one state/vault pair per approved vested recipient; initialize/deposit/release fees separately'},
   {kind:'transactions',cost:'getFeeForMessage for each exact message; re-quote changes, retries and priority instructions'},
   {kind:'external',cost:'hosting/RPC/custody/review, operational reserve and market capital/fees; provider quotes pending'},
  ],requirements:['Approved public addresses, distribution and schedule','Real ELF/IDL/hash and capacity','Owner deployment/fee policy and reserve decisions','Explicit future read-only Mainnet authorization; never run during this closure'],completeBudget:false};
}
function lamports(value:unknown,label:string){if(!Number.isSafeInteger(value)||Number(value)<0)throw Error('Invalid lamports: '+label);return Number(value);}
export async function quoteProductionCosts(c:Connection,p:any,idl:Idl,elf:Buffer,input:any,optIn:unknown){
 requireMainnetReadOnly(input.network,optIn);
 if(c.rpcEndpoint!==input.network.rpc)throw Error('Quote RPC endpoint mismatch');
 validateProduction(p);
 if(input.status!=='PROPOSED_NOT_APPROVED'||typeof input.deployProgram!=='boolean'||input.feePolicy!=='NO_PRIORITY_IN_QUOTED_MESSAGES')throw Error('Deployment and explicit base-fee policy decisions required');
 const reserve=integer(input.payerReserveLamports,BigInt(Number.MAX_SAFE_INTEGER));
 await assertMainnet(c);
 const rent=async(size:number)=>{const n=lamports(await c.getMinimumBalanceForRentExemption(size,'finalized'),'rent');if(n<=0)throw Error('Rent unavailable');return n;};
 const mintRent=await rent(82),production=buildProductionSteps(p,idl,mintRent);
 let deployment:ReturnType<typeof buildProgramDeployment>=[],bufferRent=0;
 if(input.deployProgram){
  if(!Number.isSafeInteger(input.maxProgramBytes)||input.maxProgramBytes<elf.length||input.maxProgramBytes>10*1024*1024-45)throw Error('Approved capacity required');
  const rents={buffer:await rent(37+input.maxProgramBytes),program:await rent(36),programData:await rent(45+input.maxProgramBytes)};
  deployment=buildProgramDeployment(p,elf,input.bufferAddress,input.maxProgramBytes,rents);bufferRent=rents.buffer;
  const program=address(p.program),[pd]=PublicKey.findProgramAddressSync([program.toBuffer()],LOADER);
  const absent=await c.getMultipleAccountsInfoAndContext([program,pd,address(input.bufferAddress)],'finalized');
  if(absent.value.some(a=>a!==null))throw Error('Deployment quote requires new empty program/buffer addresses');
 }else{
  const program=address(p.program),[pd]=PublicKey.findProgramAddressSync([program.toBuffer()],LOADER);
  const existing=await c.getMultipleAccountsInfoAndContext([program,pd],'finalized');verifyProgramAccounts(existing.value[0],existing.value[1],p,elf);
 }
 const steps=[...deployment,...production],quote=await quoteSteps(c,p,steps,input.network,optIn);
 const umi=createUmi('http://127.0.0.1:8899').use(mplTokenMetadata()),[metadata]=findMetadataPda(umi,{mint:publicKey(p.mint)});
 const payer=address(p.payer),initial=await c.getMultipleAccountsInfoAndContext([payer,address(p.mint),new PublicKey(metadata)],'finalized');
 const payerInfo=initial.value[0];
 if(!payerInfo||payerInfo.executable||!payerInfo.owner.equals(SystemProgram.programId)||payerInfo.data.length!==0||initial.value[1]!==null||initial.value[2]!==null)throw Error('Fresh mint/metadata and system payer required for metadata quote');
 // Creation bundle is simulation only, never a replacement for separate approved execution steps.
 const tx=new Transaction({feePayer:payer,recentBlockhash:quote.blockhash}).add(...production[0].instructions,...production.at(-1)!.instructions);
 const raw=tx.serialize({requireAllSignatures:false,verifySignatures:false});if(raw.length>1232)throw Error('Metadata quote bundle exceeds packet limit');
 const bundleFee=(await c.getFeeForMessage(tx.compileMessage(),'finalized')).value;
 if(bundleFee===null)throw Error('Metadata bundle fee unavailable');lamports(bundleFee,'bundle fee');
 const response=await (c as any)._rpcRequest('simulateTransaction',[raw.toString('base64'),{encoding:'base64',commitment:'finalized',sigVerify:false,replaceRecentBlockhash:false,minContextSlot:initial.context.slot,accounts:{encoding:'base64',addresses:[payer.toBase58(),metadata]}}]);
 const result=response.result;
 if(response.error||!result||result.context.slot<initial.context.slot||result.value.err!==null)throw Error('Metadata simulation unavailable or failed; no complete quote');
 const value=result.value;
 if(value.fee===undefined||value.fee!==bundleFee)throw Error('Simulation fee unavailable/changed; refresh quotation');
 const before=lamports(value.preBalances?.[0],'simulation payer pre-balance'),after=lamports(value.postBalances?.[0],'simulation payer post-balance');
 const postPayer=value.accounts?.[0],postMetadata=value.accounts?.[1];
 if(!postPayer||postPayer.owner!==SystemProgram.programId.toBase58()||postPayer.executable||postPayer.lamports!==after||!postMetadata||postMetadata.executable||postMetadata.owner!==MPL_TOKEN_METADATA_PROGRAM_ID||!Array.isArray(postMetadata.data)||postMetadata.data[1]!=='base64'||typeof postMetadata.data[0]!=='string')throw Error('Metadata simulation account ownership/balance mismatch');
 const data=Buffer.from(postMetadata.data[0],'base64');
 if(data.toString('base64')!==postMetadata.data[0]||data.length<1||data.length>8192)throw Error('Metadata simulated data size/encoding invalid');
 const metadataRent=await rent(data.length),allocated=lamports(postMetadata.lamports,'allocated metadata balance'),metadataExtra=before-after-bundleFee-mintRent;
 if(allocated<metadataRent||metadataExtra<allocated||!Number.isSafeInteger(metadataExtra))throw Error('Metadata debit/rent reconciliation failed');
 const gross=quote.totalKnownLamports+metadataExtra,net=gross-bufferRent,conservative=gross+Number(reserve);
 if(!Number.isSafeInteger(conservative)||!Number.isSafeInteger(net)||net<0)throw Error('Technical cost overflow');
 await assertMainnet(c);
 return {status:'READ_ONLY_TECHNICAL_QUOTE_NOT_AUTHORIZED',observedAt:new Date().toISOString(),cluster:'mainnet-beta',genesisHash:MAINNET_GENESIS,
  planSha256:createHash('sha256').update(JSON.stringify(p)).digest('hex'),blockhash:quote.blockhash,lastValidBlockHeight:quote.lastValidBlockHeight,
  transactionCount:steps.length,quotes:quote.quotes,metadata:{simulationSlot:result.context.slot,bundleMessageSha256:createHash('sha256').update(tx.serializeMessage()).digest('hex'),dataBytes:data.length,rentLamports:metadataRent,allocatedLamports:allocated,protocolAndOtherDebitLamports:metadataExtra-metadataRent,totalExtraLamports:metadataExtra},
  temporaryBufferRentLamports:bufferRent,quotedNetTechnicalLamports:net,conservativeFundingLamports:conservative,payerReserveLamports:reserve.toString(),payerBalanceLamports:before,knownConservativeCostsCovered:before>=conservative,
  completeBudget:false,exclusions:['Additional priority instructions/retries or future vesting release transactions: quote their exact messages at use','Off-chain hosting/RPC, custody hardware/service and independent review','Market protocol costs and real capital/liquidity, not priced until mechanism chosen'],
  notes:['Gross funding bound conservatively includes buffer rent and ProgramData rent; buffer refund is counted only in net estimate.','All values are lamports; divide by 1e9 for SOL. No fiat price used.','Separate RPC contexts; no state reservation or signer possession proof. Re-quote and simulate immediately before signing.']};
}
if(require.main===module){(async()=>{
 const [mode='offline',...extra]=process.argv.slice(2);if(extra.length||!['offline','quote'].includes(mode))throw Error('Use offline or quote');
 if(mode==='offline'){console.log(JSON.stringify(offlineCostChecklist(),null,2));return;}
 const input=JSON.parse(fs.readFileSync('config/robusto-cost-inputs.json','utf8')),optIn=process.env.ROBUSTO_MAINNET_READ_ONLY;
 // Fail before constructing any connection or attempting Mainnet RPC.
 requireMainnetReadOnly(input.network,optIn);
 const p=JSON.parse(fs.readFileSync('config/robusto-production.json','utf8')),idl=JSON.parse(fs.readFileSync('target/robusto-production/idl.json','utf8')),elf=fs.readFileSync('target/robusto-production/program.so');
 const c=new Connection(input.network.rpc,{commitment:'finalized',disableRetryOnRateLimit:true,fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})});
 console.log(JSON.stringify(await quoteProductionCosts(c,p,idl,elf,input,optIn),null,2));
})().catch(e=>{console.error((e as Error).message);process.exitCode=1;});}
