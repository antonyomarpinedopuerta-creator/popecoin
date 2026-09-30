/** One unsigned vesting lifecycle transaction at a time plus read-only snapshots. */
import fs from 'node:fs';
import {Connection,PublicKey,Transaction,TransactionInstruction} from '@solana/web3.js';
import {Idl} from '@coral-xyz/anchor';
import {unpackAccount,unpackMint,TOKEN_PROGRAM_ID} from '@solana/spl-token';
import {createHash} from 'node:crypto';
import {GENESIS,LOADER,RPC,Deployment,findCandidate,readDeployment,pubkey} from './rehearsal-one-tx';
import {DEVNET_MINT,DEVNET_PROGRAM_ID} from './devnet-config';
import {ALLOCATIONS,PRODUCTION_PROGRAM} from './production-plan';
import {prepareRehearsal,RehearsalInput} from './prepare-rehearsal';

export const PRECLIFF_SAFETY_MARGIN_SECONDS=1800;
export const PREEND_SAFETY_MARGIN_SECONDS=300;
export type VestingStep='initialize'|'deposit'|'release-precliff'|'release-partial'|'release-repeated'|'release-final';
export type VestingSnapshot={slot:number;unixTime:number;program:string;programData:string;mint:string;decimals:number;supply:bigint;
 vesting:string;vestingState:null|{authority:string;beneficiary:string;mint:string;total:bigint;released:bigint;start:bigint;cliff:bigint;end:bigint};
 vault:string;vaultAmount:bigint|null;source:string;sourceAmount:bigint;beneficiaryAta:string;beneficiaryAmount:bigint};
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
function pinPlan(input:RehearsalInput,deployment:Deployment){
 if(input.cluster!=='devnet'||input.program!==deployment.program||input.payer!==deployment.payer)
  throw Error('Vesting program/payer must match the isolated Devnet deployment config');
 if(input.mint!==null&&input.mint!==undefined&&input.mint===DEVNET_MINT.toBase58())throw Error('Historical Devnet mint is protected');
 if(input.program===PRODUCTION_PROGRAM.toBase58()||input.program===DEVNET_PROGRAM_ID.toBase58())throw Error('Production/historical program is protected');
 const beneficiary=pubkey(input.beneficiary,'beneficiary');
 if(ALLOCATIONS.some(a=>beneficiary.toBase58()===a.beneficiary))throw Error('Production allocation identity is protected');
}
function readVesting(data:Buffer,idl:Idl){
 const account=(idl as any).accounts?.find((a:any)=>a.name==='VestingAccount');
 if(!account||!Array.isArray(account.discriminator)||!Buffer.from(account.discriminator).equals(data.subarray(0,8))||data.length!==145)
  throw Error('Vesting account discriminator/size mismatch');
 const state={authority:new PublicKey(data.subarray(8,40)).toBase58(),beneficiary:new PublicKey(data.subarray(40,72)).toBase58(),mint:new PublicKey(data.subarray(72,104)).toBase58(),
  total:data.readBigUInt64LE(104),released:data.readBigUInt64LE(112),start:data.readBigInt64LE(120),cliff:data.readBigInt64LE(128),end:data.readBigInt64LE(136)};
 if(state.total===0n||state.released>state.total||state.start>=state.end||state.start>state.cliff||state.cliff>state.end)throw Error('Vesting state values are invalid');
 return state;
}
export function vestedAmount(total:bigint,start:bigint,cliff:bigint,end:bigint,now:bigint){
 if(total<=0n||start>=end||start>cliff||cliff>end)throw Error('Invalid vesting schedule');
 if(now<cliff)return 0n;if(now>=end)return total;
 return total*(now-start)/(end-start);
}
function verifyCandidateDeployment(deployment:Deployment,candidateRoot?:string){
 const candidate=findCandidate(deployment,candidateRoot);const [pd]=PublicKey.findProgramAddressSync([pubkey(deployment.program,'program').toBuffer()],LOADER);
 return {candidate,pd};
}
export async function readVestingSnapshot(c:Connection,input:RehearsalInput,protectedMint?:string,deployment=readDeployment(),candidateRoot?:string):Promise<VestingSnapshot>{
 pinPlan(input,deployment);if((c as any)._rpcEndpoint!==RPC)throw Error('RPC endpoint mismatch');if(await c.getGenesisHash()!==GENESIS)throw Error('Devnet genesis mismatch');
 const {candidate,pd}=verifyCandidateDeployment(deployment,candidateRoot),idl=JSON.parse(candidate.idlBytes.toString('utf8')) as Idl;
 if((idl as any).address!==deployment.program)throw Error('Pinned candidate IDL Program ID mismatch');
 const prepared=prepareRehearsal(input,idl,protectedMint);
 const program=pubkey(input.program,'program'),mint=pubkey(input.mint,'mint');
 const vesting=new PublicKey(prepared.vesting),vault=new PublicKey(prepared.vault),source=new PublicKey(prepared.source),beneficiaryAta=new PublicKey(prepared.destination);
 const keys=[program,pd,mint,vesting,vault,source,beneficiaryAta];const response=await c.getMultipleAccountsInfoAndContext(keys,'confirmed');
 const [programInfo,pdInfo,mintInfo,vestingInfo,vaultInfo,sourceInfo,beneficiaryInfo]=response.value;
 if(!programInfo||!programInfo.executable||!programInfo.owner.equals(LOADER)||programInfo.data.length!==36||programInfo.data.readUInt32LE(0)!==2||!programInfo.data.subarray(4,36).equals(pd.toBuffer()))throw Error('Program loader linkage/executable mismatch');
 if(!pdInfo||!pdInfo.owner.equals(LOADER)||pdInfo.data.length!==45+deployment.maxProgramBytes||pdInfo.data.readUInt32LE(0)!==3||pdInfo.data[12]!==1||!pdInfo.data.subarray(13,45).equals(pubkey(deployment.upgradeAuthority,'upgrade authority').toBuffer()))throw Error('ProgramData owner/state/authority mismatch');
 const elf=pdInfo.data.subarray(45,45+candidate.elf.length);if(!elf.equals(candidate.elf)||hash(elf)!==deployment.elfSha256||!pdInfo.data.subarray(45+candidate.elf.length).every(x=>x===0))throw Error('Deployed program ELF/hash/padding mismatch');
 const mintState=unpackMint(mint,mintInfo,TOKEN_PROGRAM_ID);if(!mintState.isInitialized||mintState.decimals!==6||!mintState.mintAuthority?.equals(pubkey(input.authority,'authority'))||mintState.freezeAuthority!==null)throw Error('Test mint state does not match decimals/authority/freeze design');
 const sourceState=unpackAccount(source,sourceInfo,TOKEN_PROGRAM_ID),beneficiaryState=unpackAccount(beneficiaryAta,beneficiaryInfo,TOKEN_PROGRAM_ID);
 if(!sourceState.isInitialized||sourceState.isFrozen||!sourceState.owner.equals(pubkey(input.authority,'authority'))||!sourceState.mint.equals(mint)||!beneficiaryState.isInitialized||beneficiaryState.isFrozen||!beneficiaryState.owner.equals(pubkey(input.beneficiary,'beneficiary'))||!beneficiaryState.mint.equals(mint))throw Error('Source/beneficiary ATA state mismatch');
 if(vestingInfo&&!vestingInfo.owner.equals(program))throw Error('Vesting PDA owner mismatch');
 const vestingState=vestingInfo?readVesting(vestingInfo.data,idl):null;
 if(vaultInfo&&!vaultInfo.owner.equals(TOKEN_PROGRAM_ID))throw Error('Vault token account owner mismatch');
 const vaultState=vaultInfo?unpackAccount(vault,vaultInfo,TOKEN_PROGRAM_ID):null;
 if(vaultState&&(!vaultState.isInitialized||vaultState.isFrozen||!vaultState.owner.equals(vesting)||!vaultState.mint.equals(mint)))throw Error('Vesting vault mint/authority/state mismatch');
 if(vestingState&&(!vaultState||vestingState.authority!==input.authority||vestingState.beneficiary!==input.beneficiary||vestingState.mint!==input.mint||vestingState.total!==BigInt(input.amount as string)||vestingState.start!==BigInt(prepared.start)||vestingState.cliff!==BigInt(prepared.cliff)||vestingState.end!==BigInt(prepared.end)))throw Error('On-chain vesting state differs from approved plan');
 const unixTime=await c.getBlockTime(response.context.slot);if(unixTime===null||!Number.isSafeInteger(unixTime)||unixTime<0)throw Error('Confirmed chain timestamp unavailable');
 if(await c.getGenesisHash()!==GENESIS)throw Error('Devnet genesis changed during snapshot');
 return {slot:response.context.slot,unixTime,program:program.toBase58(),programData:pd.toBase58(),mint:mint.toBase58(),decimals:mintState.decimals,supply:mintState.supply,vesting:vesting.toBase58(),vestingState:vestingState?{...vestingState}:null,vault:vault.toBase58(),vaultAmount:vaultState?.amount??null,source:source.toBase58(),sourceAmount:sourceState.amount,beneficiaryAta:beneficiaryAta.toBase58(),beneficiaryAmount:beneficiaryState.amount};
}
function asInstruction(step:any){return new TransactionInstruction({programId:new PublicKey(step.program),keys:step.accounts.map((a:any)=>({pubkey:new PublicKey(a.address),isSigner:a.signer,isWritable:a.writable})),data:Buffer.from(step.dataHex,'hex')});}
async function unsigned(c:Connection,input:RehearsalInput,step:VestingStep,ix:TransactionInstruction[],rent:number,snapshot:VestingSnapshot,expected:string){
 const payer=pubkey(input.payer,'payer'),latest=await c.getLatestBlockhash('confirmed'),tx=new Transaction({feePayer:payer,recentBlockhash:latest.blockhash}).add(...ix),message=tx.compileMessage();
 const fee=(await c.getFeeForMessage(message,'confirmed')).value;if(fee===null||!Number.isSafeInteger(fee)||fee<0)throw Error('Exact transaction fee unavailable');
 const balance=await c.getBalance(payer,'confirmed');if(!Number.isSafeInteger(balance)||balance<0||!Number.isSafeInteger(fee+rent))throw Error('Payer balance or transaction cost response invalid');
 const bytes=tx.serialize({requireAllSignatures:false,verifySignatures:false});if(bytes.length>1232)throw Error('Unsigned transaction exceeds packet limit');
 if(await c.getGenesisHash()!==GENESIS)throw Error('Devnet genesis changed while preparing message');
 return {status:'UNSIGNED SINGLE TRANSACTION — NOT SIMULATED, SIGNED OR SENT',operation:step,cluster:'devnet',rpc:RPC,genesisHash:GENESIS,
  slot:snapshot.slot,chainTime:snapshot.unixTime,program:input.program,mint:input.mint,payer:input.payer,authority:input.authority,beneficiary:input.beneficiary,
  expectedAmountAtSnapshot:expected,amountIsInstructionArgument:step==='initialize'||step==='deposit',feeLamports:fee,rentLamports:rent,maxImmediateLamports:fee+rent,payerBalanceLamports:balance,adequatelyFunded:balance>=fee+rent,
  blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight,transactionBytes:bytes.length,unsignedTransactionBase64:bytes.toString('base64'),
  messageSha256:hash(message.serialize()),requiredSigners:message.accountKeys.slice(0,message.header.numRequiredSignatures).map(k=>k.toBase58()),
  expectedEffect:'Only this listed transaction if separately approved, signed and submitted. No automatic next step.'};
}
function reconcileSchedule(s:VestingSnapshot,input:RehearsalInput){
 const v=s.vestingState;if(!v||s.vaultAmount===null)throw Error('Initialized vesting/vault required');
 if(s.program!==input.program||s.mint!==input.mint||s.decimals!==6)throw Error('Snapshot program/mint/decimals mismatch');
 if(v.total!==BigInt(input.amount as string)||v.authority!==input.authority||v.beneficiary!==input.beneficiary||v.mint!==input.mint)throw Error('Vesting state mismatch');
 return v;
}
export async function prepareVestingOne(c:Connection,step:VestingStep,input:RehearsalInput,protectedMint?:string,deployment=readDeployment(),candidateRoot?:string){
 if(!['initialize','deposit','release-precliff','release-partial','release-repeated','release-final'].includes(step))throw Error('Exactly one lifecycle step is required');
 const snapshot=await readVestingSnapshot(c,input,protectedMint,deployment,candidateRoot);const idl=JSON.parse(verifyCandidateDeployment(deployment,candidateRoot).candidate.idlBytes.toString('utf8')) as Idl;const prepared=prepareRehearsal(input,idl,protectedMint);const txStep=step.startsWith('release-')?'release':step;
 const planStep=prepared.steps.find(x=>x.name===txStep);if(!planStep)throw Error('Expected instruction missing from pinned IDL');
 const amount=BigInt(input.amount as string);
 if(step==='initialize'){
  if(snapshot.vestingState||snapshot.vaultAmount!==null)throw Error('Vesting or vault PDA already exists');
  if(snapshot.supply!==amount||snapshot.sourceAmount!==amount||snapshot.beneficiaryAmount!==0n)throw Error('Mint/source/beneficiary balances do not equal the exact initial test supply');
  const vestingRent=await c.getMinimumBalanceForRentExemption(145,'confirmed'),vaultRent=await c.getMinimumBalanceForRentExemption(165,'confirmed');
  if(!Number.isSafeInteger(vestingRent)||vestingRent<=0||!Number.isSafeInteger(vaultRent)||vaultRent<=0)throw Error('Vesting/vault rent unavailable');
  return unsigned(c,input,step,[asInstruction(planStep)],vestingRent+vaultRent,snapshot,input.amount as string);
 }
 const v=reconcileSchedule(snapshot,input);if(snapshot.supply!==amount)throw Error('Test mint supply differs from approved total');
 if(step==='deposit'){
  if(v.released!==0n||snapshot.vaultAmount!==0n||snapshot.sourceAmount!==v.total||snapshot.beneficiaryAmount!==0n)throw Error('Deposit requires empty vault, exact full source balance, empty beneficiary and unreleased schedule');
  return unsigned(c,input,step,[asInstruction(planStep)],0,snapshot,(v.total-snapshot.vaultAmount!).toString());
 }
 if(snapshot.vaultAmount!+snapshot.beneficiaryAmount!==v.total||snapshot.sourceAmount!==0n)throw Error('Release requires deposited total and zero source balance');
 const now=BigInt(snapshot.unixTime),vested=vestedAmount(v.total,v.start,v.cliff,v.end,now);if(v.released>vested)throw Error('Released amount exceeds chain-time vested amount');
 const releasable=vested-v.released;
 if(step==='release-precliff'){
  if(now>=v.cliff||v.cliff-now<BigInt(PRECLIFF_SAFETY_MARGIN_SECONDS))throw Error('Pre-cliff release is unsafe: cliff is not at least 30 minutes beyond confirmed chain time');
  if(releasable!==0n)throw Error('Pre-cliff release must have zero vested amount');
 } else if(step==='release-partial'){
  if(now<v.cliff||now>=v.end||v.end-now<BigInt(PREEND_SAFETY_MARGIN_SECONDS)||releasable<=0n||releasable>=v.total)throw Error('Partial release requires cliff reached, >5 minutes before end and a positive partial amount');
 } else if(step==='release-repeated'){
  if(v.released===0n||now>=v.end||v.end-now<BigInt(PREEND_SAFETY_MARGIN_SECONDS)||releasable<=0n)throw Error('Repeated release requires a prior release, >5 minutes before end and newly accrued positive amount');
 } else if(step==='release-final'){
  if(now<v.end||releasable!==v.total-v.released||releasable<=0n)throw Error('Final release requires end reached and positive remaining amount');
 }
 if(snapshot.beneficiaryAmount!==v.released)throw Error('Beneficiary balance differs from Anchor released_amount');
 return unsigned(c,input,step,[asInstruction(planStep)],0,snapshot,releasable.toString());
}
export function reconcileFinalSnapshot(s:VestingSnapshot,input:RehearsalInput){
 const v=reconcileSchedule(s,input);if(BigInt(s.unixTime)<v.end||s.supply!==v.total||s.sourceAmount!==0n||s.vaultAmount!==0n||s.beneficiaryAmount!==v.total||v.released!==v.total||s.sourceAmount+s.vaultAmount!+s.beneficiaryAmount!==s.supply)
  throw Error('Final reconciliation mismatch: supply/source/vault/beneficiary/released shortfall');
 return {status:'FINAL RECONCILIATION PASSED',slot:s.slot,program:s.program,mint:s.mint,supply:s.supply.toString(),source:{address:s.source,amount:s.sourceAmount.toString()},vault:{address:s.vault,amount:s.vaultAmount?.toString()},beneficiary:{address:s.beneficiaryAta,amount:s.beneficiaryAmount.toString()},released:v.released.toString(),shortfall:'0'};
}
async function main(){
 const [step,...extra]=process.argv.slice(2);if(!step||extra.length)throw Error('Provide exactly one lifecycle step');
 const input=JSON.parse(fs.readFileSync('config/rehearsal-plan.json','utf8')) as RehearsalInput;
 const production=JSON.parse(fs.readFileSync('config/production-plan.json','utf8')) as {mint:unknown};
 if(production.mint!==null&&typeof production.mint!=='string')throw Error('Invalid protected production mint');
 const c=new Connection(RPC,{commitment:'confirmed'}),protectedMint=production.mint??undefined;
 let result:unknown;
 if(step==='snapshot'||step==='reconcile-final'){
  const snapshot=await readVestingSnapshot(c,input,protectedMint);
  result=step==='snapshot'?snapshot:reconcileFinalSnapshot(snapshot,input);
 } else result=await prepareVestingOne(c,step as VestingStep,input,protectedMint);
 process.stdout.write(JSON.stringify(result,(_k,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
}
if(require.main===module)main().catch(e=>{console.error(`STOP: ${(e as Error).message}`);process.exitCode=1;});
