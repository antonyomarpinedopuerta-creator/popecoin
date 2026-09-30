/** Classic SPL rehearsal transaction planner. One unsigned transaction per call; never signs, simulates or sends. */
import {Connection,PublicKey,SystemProgram,Transaction,TransactionInstruction} from '@solana/web3.js';
import {ASSOCIATED_TOKEN_PROGRAM_ID,createAssociatedTokenAccountIdempotentInstruction,createInitializeMint2Instruction,createMintToCheckedInstruction,getAccount,getAssociatedTokenAddressSync,getMint,MINT_SIZE,TOKEN_PROGRAM_ID} from '@solana/spl-token';
import {createHash} from 'node:crypto';
import {GENESIS,RPC,pubkey} from './rehearsal-one-tx';
import {DEVNET_MINT,DEVNET_PROGRAM_ID} from './devnet-config';
import {ALLOCATIONS,PRODUCTION_PROGRAM} from './production-plan';

export const TEST_DECIMALS=6;
export type SplPlan={cluster:'devnet';rpc:string;genesisHash:string;program:string;mint:string;payer:string;authority:string;beneficiary:string;amount:string;protectedMint?:string};
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
function validate(p:SplPlan){
 if(p.cluster!=='devnet'||p.rpc!==RPC||p.genesisHash!==GENESIS)throw Error('Only pinned Devnet is supported');
 const program=pubkey(p.program,'program'),mint=pubkey(p.mint,'test mint'),payer=pubkey(p.payer,'payer'),authority=pubkey(p.authority,'authority'),beneficiary=pubkey(p.beneficiary,'beneficiary');
 const protectedKeys=[PRODUCTION_PROGRAM,DEVNET_PROGRAM_ID,DEVNET_MINT,...ALLOCATIONS.map(x=>new PublicKey(x.beneficiary)),...(p.protectedMint?[pubkey(p.protectedMint,'protected mint')]:[])];
 const roles=[program,mint,payer,authority,beneficiary];if(roles.some(k=>protectedKeys.some(x=>x.equals(k))))throw Error('Protected identity used in rehearsal roles');
 if(new Set(roles.map(x=>x.toBase58())).size!==roles.length)throw Error('Program, mint and rehearsal roles must be distinct');
 if(![mint,payer,authority,beneficiary].every(k=>PublicKey.isOnCurve(k.toBytes())))throw Error('Mint and transaction signers must be on curve');
 if(!/^[1-9][0-9]{0,8}$/.test(p.amount)||BigInt(p.amount)>100000000n)throw Error('Test amount must be 1..100000000 base units');
 return {program,mint,payer,authority,beneficiary,amount:BigInt(p.amount)};
}
async function pin(c:Connection){if((c as any)._rpcEndpoint!==RPC)throw Error('RPC endpoint mismatch');if(await c.getGenesisHash()!==GENESIS)throw Error('Devnet genesis mismatch');}
async function finish(c:Connection,p:SplPlan,feePayer:PublicKey,ixs:TransactionInstruction[],summary:Record<string,unknown>){
 const bh=await c.getLatestBlockhash('confirmed'),tx=new Transaction({feePayer,recentBlockhash:bh.blockhash}).add(...ixs),message=tx.compileMessage(),f=await c.getFeeForMessage(message,'confirmed');
 if(f.value===null||!Number.isSafeInteger(f.value)||f.value<0)throw Error('Exact transaction fee unavailable');
 const rent=Number(summary.rentLamports??0);if(!Number.isSafeInteger(rent)||rent<0)throw Error('Invalid rent estimate');
 if(!Number.isSafeInteger(rent+f.value))throw Error('Immediate transaction cost exceeds safe integer range');
 const bytes=tx.serialize({requireAllSignatures:false,verifySignatures:false});if(bytes.length>1232)throw Error('Transaction exceeds packet limit');
 await pin(c);const balance=await c.getBalance(feePayer,'confirmed');if(!Number.isSafeInteger(balance)||balance<0)throw Error('Invalid payer balance');
 return {status:'UNSIGNED SINGLE TRANSACTION — NOT SIMULATED, SIGNED OR SENT',cluster:'devnet',rpc:RPC,genesisHash:GENESIS,
  operation:summary.operation,program:p.program,mint:p.mint,payer:p.payer,authority:p.authority,beneficiary:p.beneficiary,decimals:TEST_DECIMALS,amount:p.amount,
  feeLamports:f.value,rentLamports:rent,maxImmediateLamports:f.value+rent,payerBalanceLamports:balance,adequatelyFunded:balance>=f.value+rent,
  unsignedTransactionBase64:bytes.toString('base64'),transactionBytes:bytes.length,messageSha256:sha(message.serialize()),requiredSigners:message.accountKeys.slice(0,message.header.numRequiredSignatures).map(k=>k.toBase58()),...summary};
}
export async function prepareMintCreate(c:Connection,p:SplPlan){const r=validate(p);await pin(c);if(await c.getAccountInfo(r.mint,'confirmed'))throw Error('Mint address already exists');
 const rent=await c.getMinimumBalanceForRentExemption(MINT_SIZE,'confirmed');if(!Number.isSafeInteger(rent)||rent<=0)throw Error('Mint rent unavailable');
 const create=SystemProgram.createAccount({fromPubkey:r.payer,newAccountPubkey:r.mint,lamports:rent,space:MINT_SIZE,programId:TOKEN_PROGRAM_ID});
 const init=createInitializeMint2Instruction(r.mint,TEST_DECIMALS,r.authority,null,TOKEN_PROGRAM_ID);
 return finish(c,p,r.payer,[create,init],{operation:'create classic SPL test mint; initialize decimals=6, mintAuthority=authority, freezeAuthority=null',rentLamports:rent,reversible:false});}
export async function prepareAta(c:Connection,p:SplPlan,owner:'authority'|'beneficiary'){const r=validate(p);await pin(c);const authority=owner==='authority';const tokenOwner=authority?r.authority:r.beneficiary;const ata=getAssociatedTokenAddressSync(r.mint,tokenOwner,false,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
 const existing=await c.getAccountInfo(ata,'confirmed');if(existing){if(!existing.owner.equals(TOKEN_PROGRAM_ID))throw Error('ATA address has unexpected owner');const decoded=await getAccount(c,ata,'confirmed',TOKEN_PROGRAM_ID);if(!decoded.isInitialized||decoded.isFrozen||!decoded.mint.equals(r.mint)||!decoded.owner.equals(tokenOwner))throw Error('Existing ATA mint/owner/state mismatch');await pin(c);throw Error('ATA already exists and is verified; no creation transaction needed');}
 const rent=await c.getMinimumBalanceForRentExemption(165,'confirmed');if(!Number.isSafeInteger(rent)||rent<=0)throw Error('Token account rent unavailable');
 return finish(c,p,r.payer,[createAssociatedTokenAccountIdempotentInstruction(r.payer,ata,tokenOwner,r.mint,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID)],{operation:`create ${owner} classic SPL associated token account`,tokenOwner:tokenOwner.toBase58(),ata:ata.toBase58(),rentLamports:rent,reversible:false});}
export async function prepareMintTo(c:Connection,p:SplPlan){const r=validate(p);await pin(c);const mint=await getMint(c,r.mint,'confirmed',TOKEN_PROGRAM_ID);if(!mint.isInitialized||mint.decimals!==TEST_DECIMALS||!mint.mintAuthority?.equals(r.authority)||mint.freezeAuthority!==null)throw Error('Mint decimals/authority/freeze authority do not match approved test design');
 const ata=getAssociatedTokenAddressSync(r.mint,r.authority,false,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);const source=await getAccount(c,ata,'confirmed',TOKEN_PROGRAM_ID);if(!source.isInitialized||source.isFrozen||!source.owner.equals(r.authority)||!source.mint.equals(r.mint))throw Error('Authority source ATA mismatch');
 if(mint.supply!==0n)throw Error('MintTo is permitted only once on a zero-supply rehearsal mint');
 return finish(c,p,r.payer,[createMintToCheckedInstruction(r.mint,ata,r.authority,r.amount,TEST_DECIMALS,[],TOKEN_PROGRAM_ID)],{operation:'mintToChecked test tokens to authority ATA',sourceAta:ata.toBase58(),supplyBefore:mint.supply.toString(),supplyAfter:(mint.supply+r.amount).toString(),rentLamports:0,reversible:false});}
export async function verifyMint(c:Connection,p:SplPlan){const r=validate(p);await pin(c);const m=await getMint(c,r.mint,'confirmed',TOKEN_PROGRAM_ID);if(!m.isInitialized||m.decimals!==TEST_DECIMALS||!m.mintAuthority?.equals(r.authority)||m.freezeAuthority!==null)throw Error('Test mint state mismatch');await pin(c);return {status:'READ ONLY MINT VERIFIED',cluster:'devnet',genesisHash:GENESIS,mint:r.mint,decimals:m.decimals,mintAuthority:m.mintAuthority?.toBase58(),freezeAuthority:null,supply:m.supply.toString(),slot:await c.getSlot('confirmed')};}
export async function verifyAtas(c:Connection,p:SplPlan){const r=validate(p);await pin(c);const owners=[r.authority,r.beneficiary];const accounts=await Promise.all(owners.map(async owner=>{const address=getAssociatedTokenAddressSync(r.mint,owner,false,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);const a=await getAccount(c,address,'confirmed',TOKEN_PROGRAM_ID);if(!a.isInitialized||a.isFrozen||!a.owner.equals(owner)||!a.mint.equals(r.mint))throw Error('ATA state mismatch');return {owner:owner.toBase58(),address:address.toBase58(),amount:a.amount.toString(),state:'initialized'};}));await pin(c);return {status:'READ ONLY ATAS VERIFIED',cluster:'devnet',genesisHash:GENESIS,mint:r.mint,accounts,slot:await c.getSlot('confirmed')};}

async function main(){
 const [step,...rest]=process.argv.slice(2);if(rest.length)throw Error('This tool accepts exactly one operation');
 const raw=JSON.parse(require('node:fs').readFileSync('config/rehearsal-plan.json','utf8'));
 const production=JSON.parse(require('node:fs').readFileSync('config/production-plan.json','utf8'));
 if(production.mint!==null&&typeof production.mint!=='string')throw Error('Invalid protected production mint');
 const p={...raw,cluster:raw.cluster,rpc:RPC,genesisHash:GENESIS,protectedMint:production.mint??undefined} as SplPlan;
 const c=new Connection(RPC,{commitment:'confirmed'});
 const actions:Record<string,()=>Promise<unknown>>={
  'mint-create':()=>prepareMintCreate(c,p),'mint-verify':()=>verifyMint(c,p),
  'ata-authority-create':()=>prepareAta(c,p,'authority'),'ata-beneficiary-create':()=>prepareAta(c,p,'beneficiary'),
  'ata-verify':()=>verifyAtas(c,p),'mint-to':()=>prepareMintTo(c,p),
 };
 if(!actions[step])throw Error('Choose one: mint-create, mint-verify, ata-authority-create, ata-beneficiary-create, ata-verify, mint-to');
 process.stdout.write(JSON.stringify(await actions[step](),null,2)+'\n');
}
if(require.main===module)main().catch(e=>{console.error(`STOP: ${(e as Error).message}`);process.exitCode=1;});
