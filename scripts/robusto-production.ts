/** ROBUSTO offline instruction preparation. No private keys, signing or submission. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {BN, BorshInstructionCoder, Idl} from '@coral-xyz/anchor';
import {Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction} from '@solana/web3.js';
import {AuthorityType, TOKEN_PROGRAM_ID, MINT_SIZE, createInitializeMint2Instruction,
 createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync,
 createMintToCheckedInstruction, createTransferCheckedInstruction, createSetAuthorityInstruction} from '@solana/spl-token';
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults';
import {createNoopSigner, publicKey, percentAmount} from '@metaplex-foundation/umi';
import {createV1, updateV1, mplTokenMetadata, findMetadataPda, deserializeMetadata,
 MPL_TOKEN_METADATA_PROGRAM_ID} from '@metaplex-foundation/mpl-token-metadata';
import {validateRobustoProposal} from './robusto-metadata';
import {durableUri} from './durable-uri';
import {LOADER} from './rehearsal-one-tx';

export const MAINNET_GENESIS='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
export const SUPPLY=1_000_000_000_000_000n;
const digest=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
export type Allocation={label:string;beneficiary:string;basisPoints:number;baseUnits:string;
 vesting?:{start:string;cliff:string;end:string}};
/** Arithmetic proposal only: no addresses, custody, signing or adoption of allocations. */
export function validateDistributionProposal(p:any){
 if(p?.status!=='PROPOSED_NOT_APPROVED'||p.mainnetStatus!=='NOT_AUTHORIZED_FOR_MAINNET'||p.decimals!==6||p.supplyTokens!=='1000000000'||p.supplyBaseUnits!==SUPPLY.toString())throw Error('Unauthorized distribution proposal required');
 const check=(rows:any)=>{
  if(!Array.isArray(rows)||rows.length!==4)throw Error('Four proposed buckets required');
  let bps=0,total=0n;const labels=new Set<string>();
  for(const row of rows){
   if(!row||!['market_ecosystem_launch','community_marketing','reserve','team_founder'].includes(row.label)||labels.has(row.label)||!Number.isInteger(row.basisPoints)||row.basisPoints<=0||row.basisPoints>10000)throw Error('Invalid proposed bucket');
   labels.add(row.label);const raw=integer(row.baseUnits),tokens=integer(row.tokens);
   if(raw!==SUPPLY*BigInt(row.basisPoints)/10000n||tokens*1_000_000n!==raw)throw Error('Proposed tokens/base units/percentage disagree');
   bps+=row.basisPoints;total+=raw;
  }
  if(bps!==10000||total!==SUPPLY)throw Error('Proposal must sum to exactly 100%');
  return {rows,basisPoints:bps,tokens:'1000000000',baseUnits:total.toString()};
 };
 return {status:p.status,mainnetStatus:p.mainnetStatus,primary:check(p.primary),stagedAlternative:check(p.stagedAlternative)};
}
/** Owner-approved economic parameters only; never operational transaction approval. */
export function validateApprovedEconomics(p:any){
 if(p?.status!=='APPROVED_ECONOMIC_PARAMETERS_ONLY'||p.mainnetStatus!=='NOT_AUTHORIZED_FOR_MAINNET'||p.name!=='ROBUSTO'||p.symbol!=='ROBUSTO'||p.freezeAuthority!==null||p.distributionId!=='50/15/30/5')throw Error('Limited economic approval required');
 for(const key of ['mainnetAuthorized','mintAuthorized','transfersAuthorized','publicationAuthorized','paymentsAuthorized','signingAuthorized','authorityRevocationAuthorized'])if(p[key]!==false)throw Error('Economic approval cannot authorize operations');
 for(const key of ['initialCirculation','beneficiaries','vesting','custody'])if(p[key]!==null)throw Error('Separate owner decisions must remain pending');
 const result=validateDistributionProposal({status:'PROPOSED_NOT_APPROVED',mainnetStatus:p.mainnetStatus,decimals:p.decimals,supplyTokens:p.supplyTokens,supplyBaseUnits:p.supplyBaseUnits,primary:p.buckets,stagedAlternative:p.buckets}).primary;
 const expected=new Map([['market_ecosystem_launch',5000],['community_marketing',1500],['reserve',3000],['team_founder',500]]);
 if(result.rows.some((row:any)=>expected.get(row.label)!==row.basisPoints))throw Error('Approved 50/15/30/5 buckets mismatch');
 return {status:p.status,mainnetStatus:p.mainnetStatus,freezeAuthority:null,distributionId:p.distributionId,...result,initialCirculation:'PENDING_SEPARATE_OWNER_APPROVAL',operationsAuthorized:false};
}
export function integer(value:unknown, maximum=2n**64n-1n):bigint {
 if(typeof value!=='string'||! /^(0|[1-9][0-9]*)$/.test(value))throw Error('Canonical unsigned decimal string required');
 const n=BigInt(value);if(n>maximum)throw Error('Integer out of range');return n;
}
export function address(value:unknown):PublicKey {
 if(typeof value!=='string')throw Error('Public address pending');
 const k=new PublicKey(value);if(k.equals(PublicKey.default))throw Error('Default address forbidden');return k;
}
export function validateDistribution(rows:unknown):Allocation[] {
 if(!Array.isArray(rows)||!rows.length)throw Error('Distribution pending: no allocations approved');
 let bps=0,total=0n;const recipients=new Set<string>(),labels=new Set<string>();
 for(const a of rows){
  if(!a||typeof a.label!=='string'||! /^[a-zA-Z0-9_-]{1,64}$/.test(a.label)||labels.has(a.label))throw Error('Unique allocation label required');
  labels.add(a.label);const owner=address(a.beneficiary);
  if(!PublicKey.isOnCurve(owner.toBytes())||recipients.has(owner.toBase58()))throw Error('Unique signer beneficiary required; PDA custody needs separate design');
  recipients.add(owner.toBase58());
  if(!Number.isInteger(a.basisPoints)||a.basisPoints<=0||a.basisPoints>10000)throw Error('Positive integer basisPoints required');
  const raw=integer(a.baseUnits);if(raw!==SUPPLY*BigInt(a.basisPoints)/10000n)throw Error('Percentage and exact base units disagree');
  bps+=a.basisPoints;total+=raw;
  if(a.vesting){const {start,cliff,end}=a.vesting;const s=integer(start,2n**63n-1n),c=integer(cliff,2n**63n-1n),e=integer(end,2n**63n-1n);
   if(s>=e||s>c||c>e)throw Error('Invalid vesting schedule');}
 }
 if(bps!==10000||total!==SUPPLY)throw Error('Distribution must equal exactly 100% and 1,000,000,000 ROBUSTO');
 return rows;
}
export function protectedAddresses(){
 const values=new Set<string>();
 for(const file of ['config/rehearsal-deployment.json','config/rehearsal-plan.json','config/robusto-rehearsal-2.json','config/robusto-rehearsal-3.json','config/production-plan.json']){
  const walk=(v:any)=>{if(typeof v==='string'){try{values.add(new PublicKey(v).toBase58());}catch{}}else if(v&&typeof v==='object')Object.values(v).forEach(walk);};
  walk(JSON.parse(fs.readFileSync(file,'utf8')));
 }
 // Historical PAPA identities remain protected even when production-plan fields are null.
 ['ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw','BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc',
  'AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn'].forEach(v=>values.add(v));
 return values;
}
export function validateProduction(p:any){
 validateRobustoProposal(p);
 if(p.mainnetMode!=='MAINNET_DISABLED'||p.distributionStatus!=='PROPOSED_NOT_APPROVED')throw Error('Preparation must stay MAINNET_DISABLED / PROPOSED_NOT_APPROVED');
 const roles=['payer','mint','program','mintAuthority','metadataUpdateAuthority','upgradeAuthority'];
 const keys=roles.map(r=>address(p[r]));
 if(new Set(keys.map(k=>k.toBase58())).size!==keys.length)throw Error('Production roles/identities must be distinct');
 const protectedKeys=protectedAddresses();
 if(keys.some(k=>protectedKeys.has(k.toBase58())||!PublicKey.isOnCurve(k.toBytes())))throw Error('Historical/rehearsal identity or unsupported custody');
 const rows=validateDistribution(p.allocations);
 if(rows.some(a=>keys.some(k=>k.toBase58()===a.beneficiary)||protectedKeys.has(a.beneficiary)))throw Error('Allocation uses protected or authority identity');
 return rows;
}
export type Step={label:string;instructions:TransactionInstruction[];rentSizes:number[];kind:string};
function metadataContext(p:any){
 const umi=createUmi('http://127.0.0.1:8899').use(mplTokenMetadata());
 return {umi,payer:createNoopSigner(publicKey(p.payer)),mintAuthority:createNoopSigner(publicKey(p.mintAuthority)),update:createNoopSigner(publicKey(p.metadataUpdateAuthority))};
}
function fromUmi(ix:any){return new TransactionInstruction({programId:new PublicKey(ix.programId),
 keys:ix.keys.map((k:any)=>({pubkey:new PublicKey(k.pubkey),isSigner:k.isSigner,isWritable:k.isWritable})),data:Buffer.from(ix.data)});}
export function metadataInstructions(p:any,update=false):TransactionInstruction[]{
 validateProduction(p);const uri=durableUri(p.metadataUri);if(Buffer.byteLength(uri)>200)throw Error('Metadata URI exceeds 200 bytes');
 if(! /^[0-9a-f]{64}$/.test(p.metadataSha256??'')||! /^[0-9a-f]{64}$/.test(p.imageSha256??''))throw Error('Published metadata/image hashes pending');
 const {umi,payer,mintAuthority,update:authority}=metadataContext(p);
 const builder=update?updateV1(umi,{mint:publicKey(p.mint),payer,authority,
  data:{name:p.name,symbol:p.symbol,uri,sellerFeeBasisPoints:0,creators:null},isMutable:true}):
  createV1(umi,{mint:publicKey(p.mint),payer,authority:mintAuthority,updateAuthority:authority,
   name:p.name,symbol:p.symbol,uri,sellerFeeBasisPoints:percentAmount(0),tokenStandard:2,isMutable:true});
 return builder.getInstructions().map(fromUmi);
}
export function buildProductionSteps(p:any,idl:Idl,mintRent:number):Step[]{
 const allocations=validateProduction(p);
 if(!Number.isSafeInteger(mintRent)||mintRent<=0)throw Error('Exact mint rent estimate required');
 if(idl.address!==p.program)throw Error('Production IDL/build identity mismatch');
 const payer=address(p.payer),mint=address(p.mint),authority=address(p.mintAuthority),program=address(p.program);
 const source=getAssociatedTokenAddressSync(mint,authority);const coder=new BorshInstructionCoder(idl);
 const ata=(owner:PublicKey)=>createAssociatedTokenAccountIdempotentInstruction(payer,getAssociatedTokenAddressSync(mint,owner),owner,mint);
 const steps:Step[]=[{label:'create-mint',kind:'mint',rentSizes:[MINT_SIZE],instructions:[
  SystemProgram.createAccount({fromPubkey:payer,newAccountPubkey:mint,lamports:mintRent,space:MINT_SIZE,programId:TOKEN_PROGRAM_ID}),
  createInitializeMint2Instruction(mint,6,authority,null)]},
 {label:'source-ata',kind:'ata',rentSizes:[165],instructions:[ata(authority)]},
 {label:'mint-exact-supply',kind:'mintTo',rentSizes:[],instructions:[createMintToCheckedInstruction(mint,source,authority,SUPPLY,6)]}];
 for(const a of allocations){const beneficiary=address(a.beneficiary),dest=getAssociatedTokenAddressSync(mint,beneficiary),raw=integer(a.baseUnits);
  steps.push({label:`ata-${a.label}`,kind:'ata',rentSizes:[165],instructions:[ata(beneficiary)]});
  if(!a.vesting){steps.push({label:`distribute-${a.label}`,kind:'transfer',rentSizes:[],instructions:[createTransferCheckedInstruction(source,mint,dest,authority,raw,6)]});continue;}
  const [vesting]=PublicKey.findProgramAddressSync([Buffer.from('vesting'),beneficiary.toBuffer(),mint.toBuffer()],program);
  const [vault]=PublicKey.findProgramAddressSync([Buffer.from('vault'),vesting.toBuffer()],program);
  const meta=(pubkey:PublicKey,isSigner=false,isWritable=false)=>({pubkey,isSigner,isWritable});
  const init=new TransactionInstruction({programId:program,keys:[meta(payer,true,true),meta(authority,true),meta(beneficiary,true),meta(mint),meta(vesting,false,true),meta(vault,false,true),meta(TOKEN_PROGRAM_ID),meta(SystemProgram.programId),meta(SYSVAR_RENT_PUBKEY)],
   data:coder.encode('initialize',{total_amount:new BN(raw.toString()),start_time:new BN(a.vesting.start),cliff_time:new BN(a.vesting.cliff),end_time:new BN(a.vesting.end)})});
  const deposit=new TransactionInstruction({programId:program,keys:[meta(vesting,false,true),meta(vault,false,true),meta(authority,true,true),meta(mint),meta(source,false,true),meta(TOKEN_PROGRAM_ID)],data:coder.encode('deposit',{amount:new BN(raw.toString())})});
  steps.push({label:`initialize-${a.label}`,kind:'initialize',rentSizes:[145,165],instructions:[init]},
   {label:`deposit-${a.label}`,kind:'deposit',rentSizes:[],instructions:[deposit]});
 }
 steps.push({label:'metadata-create',kind:'metadata',rentSizes:[],instructions:metadataInstructions(p)});
 return steps;
}
export function describeSteps(steps:Step[]){return steps.map(s=>({label:s.label,kind:s.kind,rentSizes:s.rentSizes,
 instructions:s.instructions.map(ix=>({program:ix.programId.toBase58(),accounts:ix.keys.map(k=>({address:k.pubkey.toBase58(),signer:k.isSigner,writable:k.isWritable})),dataHex:ix.data.toString('hex')}))}));}
/** This guard is required BEFORE any future Mainnet RPC connection is queried. */
export function requireMainnetReadOnly(config:any,optIn:unknown){
 if(config.mainnetMode!=='MAINNET_DISABLED'||optIn!==`READ_ONLY:${MAINNET_GENESIS}`)throw Error('MAINNET_DISABLED: explicit future read-only network authorization required');
 if(config.cluster!=='mainnet-beta'||typeof config.rpc!=='string')throw Error('Mainnet network config pending');
 const url=new URL(config.rpc);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('Public HTTPS RPC required; no credentials in config');
}
export async function assertMainnet(c:Pick<Connection,'getGenesisHash'>){if(await c.getGenesisHash()!==MAINNET_GENESIS)throw Error('Mainnet genesis mismatch');}
export async function quoteSteps(c:Connection,p:any,steps:Step[],network:any={mainnetMode:"MAINNET_DISABLED"},optIn:unknown=undefined){
 requireMainnetReadOnly(network,optIn);if(c.rpcEndpoint!==network.rpc)throw Error("RPC endpoint mismatch");
 validateProduction(p);await assertMainnet(c);const payer=address(p.payer);
 const info=await c.getAccountInfo(payer,'finalized');
 if(!info||info.executable||!info.owner.equals(SystemProgram.programId)||info.data.length!==0)throw Error('Fee payer must be a funded system wallet');
 const latest=await c.getLatestBlockhash('finalized');let total=0;const quotes=[];
 for(const s of steps){let rent=0;for(const size of s.rentSizes){const n=await c.getMinimumBalanceForRentExemption(size,'finalized');if(!Number.isSafeInteger(n)||n<=0)throw Error('Rent unavailable');rent+=n;}
  const tx=new Transaction({feePayer:payer,recentBlockhash:latest.blockhash}).add(...s.instructions);const fee=(await c.getFeeForMessage(tx.compileMessage(),'finalized')).value;
  if(fee===null||!Number.isSafeInteger(fee)||fee<0||!Number.isSafeInteger(rent+fee))throw Error('Exact fee unavailable');
  const bytes=tx.serialize({requireAllSignatures:false,verifySignatures:false});if(bytes.length>1232)throw Error('Transaction packet limit exceeded');
  total+=rent+fee;if(!Number.isSafeInteger(total))throw Error('Cost overflow');
  quotes.push({label:s.label,feeLamports:fee,rentLamports:rent,messageSha256:digest(tx.serializeMessage()),unsignedTransactionBase64:bytes.toString('base64')});
 }
 await assertMainnet(c);
 return {status:'READ_ONLY_ESTIMATE_NOT_AUTHORIZATION',totalKnownLamports:total,payerBalanceLamports:info.lamports,
  knownCostsCovered:info.lamports>=total,completeBudget:false,
  exclusions:['Program deployment rent/write fees (binary and max capacity must be approved)','Metadata protocol fee/rent: obtain current simulated payer delta','Priority fees, hosting and chosen market mechanism'],blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight,quotes};
}
export function verifyProgramAccounts(program:any,data:any,p:any,elf:Buffer){
 const id=address(p.program),[pd]=PublicKey.findProgramAddressSync([id.toBuffer()],LOADER);
 if(!program||!program.executable||!program.owner.equals(LOADER)||program.data.length!==36||program.data.readUInt32LE(0)!==2||!program.data.subarray(4).equals(pd.toBuffer()))throw Error('Program loader linkage mismatch');
 if(!data||data.executable||!data.owner.equals(LOADER)||data.data.length<45+elf.length||data.data.readUInt32LE(0)!==3||data.data[12]!==1||!data.data.subarray(13,45).equals(address(p.upgradeAuthority).toBuffer()))throw Error('Upgrade authority/ProgramData mismatch');
 if(digest(elf)!==p.programElfSha256||!data.data.subarray(45,45+elf.length).equals(elf)||!data.data.subarray(45+elf.length).every((n:number)=>n===0))throw Error('Production ELF/hash/padding mismatch');
 return {program:id.toBase58(),programData:pd.toBase58(),elfSha256:digest(elf),upgradeAuthority:p.upgradeAuthority};
}
export function verifyMetadataAccount(account:any,p:any){
 const {umi}=metadataContext(p),[pd]=findMetadataPda(umi,{mint:publicKey(p.mint)});
 if(!account||!account.exists||account.publicKey!==pd||account.executable||account.owner!==MPL_TOKEN_METADATA_PROGRAM_ID)throw Error('Metadata address/owner mismatch');
 const m=deserializeMetadata(account);
 if(m.key!==4||m.mint!==p.mint||m.name!==p.name||m.symbol!==p.symbol||m.uri!==p.metadataUri||!m.isMutable||m.updateAuthority!==p.metadataUpdateAuthority||m.tokenStandard.__option!=='Some'||m.tokenStandard.value!==2||m.sellerFeeBasisPoints!==0)throw Error('Metadata identity/authority/mutability mismatch');
 return {address:pd,mutable:true,updateAuthority:m.updateAuthority};
}
/** Exact initial distribution reconciliation; only use before recipients spend. */
export function reconcileDistribution(p:any,snapshot:any){
 const allocations=validateProduction(p);
 if(integer(snapshot.supply)!==SUPPLY||integer(snapshot.source)!==0n||snapshot.decimals!==6||snapshot.freezeAuthority!==null||snapshot.mintAuthority!==p.mintAuthority)throw Error('Mint/source authority/supply mismatch');
 if(!Array.isArray(snapshot.allocations)||snapshot.allocations.length!==allocations.length)throw Error('Incomplete reconciliation');
 let sum=0n;
 for(const a of allocations){const matches=snapshot.allocations.filter((v:any)=>v.label===a.label);if(matches.length!==1)throw Error('Duplicate/missing allocation snapshot');const s=matches[0];
  if(s.beneficiary!==a.beneficiary)throw Error('Wrong beneficiary snapshot');
  const balance=integer(s.balance),raw=integer(a.baseUnits);
  if(a.vesting){if(integer(s.total)!==raw||integer(s.released)>raw||balance!==integer(s.released)||integer(s.vault)+balance!==raw||s.start!==a.vesting.start||s.cliff!==a.vesting.cliff||s.end!==a.vesting.end)throw Error('Vesting allocation mismatch');sum+=balance+integer(s.vault);}
  else {if(balance!==raw)throw Error('Direct allocation mismatch');sum+=balance;}
 }
 if(sum!==SUPPLY)throw Error('Conservation failed');return {status:'INITIAL_DISTRIBUTION_RECONCILED',baseUnits:sum.toString()};
}
/** Future irreversible operation: never part of launch steps; explicit digest-bound approval. */
export function prepareMintRevocation(p:any,approval:unknown,snapshot:any){
 validateProduction(p);const planDigest=digest(Buffer.from(JSON.stringify(p)));
 if(approval!==`REVOKE_MINT_AUTHORITY:${planDigest}`)throw Error('Separate irreversible authority approval and fresh reconciliation required');
 reconcileDistribution(p,snapshot);
 return createSetAuthorityInstruction(address(p.mint),address(p.mintAuthority),AuthorityType.MintTokens,null);
}
if(require.main===module){try{
 const [mode='validate',file=mode==='economics'?'config/robusto-economics-approved.json':mode==='distribution'?'config/robusto-distribution-proposal.json':'config/robusto-production.json']=process.argv.slice(2);const p=JSON.parse(fs.readFileSync(file,'utf8'));
 if(mode==='validate'){validateRobustoProposal(p);console.log(JSON.stringify({status:p.status,mainnetMode:p.mainnetMode,supplyBaseUnits:SUPPLY.toString(),distribution:p.allocations===null?'PENDING_OPERATIONAL_ALLOCATIONS':validateDistribution(p.allocations)},null,2));}
 else if(mode==='economics')console.log(JSON.stringify(validateApprovedEconomics(p),null,2));
 else if(mode==='distribution')console.log(JSON.stringify(validateDistributionProposal(p),null,2));
 else if(mode==='instructions'){
  const idl=JSON.parse(fs.readFileSync('target/robusto-production/idl.json','utf8'));
  // Offline estimate supplied separately; refresh from authorized RPC before signing.
  const mintRent=Number(process.env.ROBUSTO_OFFLINE_MINT_RENT);
  console.log(JSON.stringify({status:'OFFLINE_UNSIGNED_NOT_AUTHORIZED',steps:describeSteps(buildProductionSteps(p,idl,mintRent))},null,2));
 }else throw Error('Only validate/instructions/distribution/economics modes supported. MAINNET_DISABLED; no executor installed.');
}catch(e){console.error((e as Error).message);process.exitCode=1;}}

/** Optional future name/symbol/URI update using the retained metadata authority. */
export function buildMetadataUpdate(p:any,change:any):TransactionInstruction[]{
 validateProduction(p);
 const data=require('./robusto-metadata-publication').validateMetadataUpdate(change);
 const {umi,payer,update:authority}=metadataContext(p);
 return updateV1(umi,{mint:publicKey(p.mint),payer,authority,
  data:{name:data.name,symbol:data.symbol,uri:data.uri,sellerFeeBasisPoints:0,creators:null},isMutable:true}).getInstructions().map(fromUmi);
}
