/** Isolated public instruction fixtures only. No Connection, keypairs, transactions or signing. */
import '../tests/offline-safety';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {BN,BorshInstructionCoder,Idl} from '@coral-xyz/anchor';
import {PublicKey,SystemProgram,SYSVAR_RENT_PUBKEY,TransactionInstruction} from '@solana/web3.js';
import {TOKEN_PROGRAM_ID,AuthorityType,createInitializeMint2Instruction,createMintToCheckedInstruction,createTransferCheckedInstruction,createSetAuthorityInstruction,MintLayout} from '@solana/spl-token';
export const SCALE=1_000_000_000n,SUPPLY=10_000_000_000n*SCALE,FOUNDER=1_000_000n*SCALE,U64=(1n<<64n)-1n;
export function units(text:unknown):bigint{
 if(typeof text!=='string'||! /^(0|[1-9][0-9]*)(\.[0-9]{1,9})?$/.test(text)||text.length>40)throw Error('Exact unsigned decimal with at most nine places required');
 const [whole,fraction='']=text.split('.');const value=BigInt(whole)*SCALE+BigInt(fraction.padEnd(9,'0'));
 if(value>U64)throw Error('u64 overflow');return value;
}
export function validateAlternative(p:any){
 if(p?.status!=='PROPOSED_NOT_APPROVED'||p.scope!=='OFFLINE_FIXTURE_ONLY'||p.mainnetStatus!=='NOT_AUTHORIZED_FOR_MAINNET'||p.mainnetDisabled!==true||p.operationsAuthorized!==false)throw Error('Only unauthorized alternative accepted');
 if(p.decimalsAssumption!==9||p.supplyTokens!=='10000000000'||p.supplyBaseUnits!==SUPPLY.toString()||p.fixedSupplyProposed!==true||p.additionalIssuanceProposed!==false||p.founderPersonalFunding!=='0')throw Error('Alternative supply/authority assumptions mismatch');
 const expected:Record<string,[string,number]>={liquidity_market:['4000000000',4000],community:['3000000000',3000],strategic_reserve:['1500000000',1500],development_operations:['1499000000',1499],founder:['1000000',1]};
 if(!Array.isArray(p.allocations)||p.allocations.length!==5||new Set(p.allocations.map((r:any)=>r.label)).size!==5)throw Error('Exactly five distinct buckets required');
 let total=0n;
 for(const r of p.allocations){const e=expected[r.label];if(!e||r.tokens!==e[0]||r.basisPoints!==e[1])throw Error('Allocation mismatch');const raw=units(r.tokens);if(raw*10000n!==SUPPLY*BigInt(r.basisPoints))throw Error('Allocation arithmetic mismatch');total+=raw;}
 if(total!==SUPPLY||total>U64)throw Error('Conservation failed');
 const v=p.founderVesting;
 if(!v||v.requestedLockMonths!==12||v.requestedLinearMonths!==24||v.model!=='FIXED_DAYS_ILLUSTRATION_NOT_CALENDAR_MONTHS'||v.lockDaysAssumption!==365||v.linearDaysAssumption!==730||v.accrualDuringLock!==false||v.baseUtc!==null||v.beneficiary!==null)throw Error('Only fictional pending schedule accepted');
 for(const k of ['initialCirculationTokens','otherBucketSchedules','price','quoteLiquidity'])if(p[k]!==null)throw Error('Effective decisions pending');
 return {supply:SUPPLY,founder:FOUNDER};
}
export function vested(total:bigint,start:bigint,end:bigint,now:bigint){
 if(total<0n||total>U64||start<0n||end<=start||end>(1n<<63n)-1n)throw Error('Invalid vesting bounds');
 return now<start?0n:now>=end?total:total*(now-start)/(end-start);
}
export function verifyClosedMint(account:{data:Buffer;owner:PublicKey;executable:boolean}){
 if(!account.owner.equals(TOKEN_PROGRAM_ID)||account.executable)throw Error("Classic mint owner required");
 const data=account.data;
 if(data.length!==82)throw Error('Classic mint length required');const m=MintLayout.decode(data);
 if(!m.isInitialized||m.decimals!==9||m.supply!==SUPPLY||m.mintAuthorityOption!==0||m.freezeAuthorityOption!==0)throw Error('Fixed supply not established');
 return {scope:'OFFLINE_FIXTURE_ONLY',supply:SUPPLY.toString(),additionalIssuancePossible:false,authorization:false};
}
export function fixture(p:any){
 validateAlternative(p);
 const key=(n:number)=>new PublicKey(Buffer.alloc(32,n));
 const mint=key(10),beneficiary=key(11),mintAuthority=key(12),authority=key(13),payer=key(14),source=key(15);
 const program=new PublicKey('YMN9Qj5jPNp7j14VPcML1B6xGgcPWVZUGLFU3Mnyfaf');
 const idlBytes=fs.readFileSync('target/idl/popecoin_vesting.json');
 const idlSha256=createHash('sha256').update(idlBytes).digest('hex');
 if(idlSha256!=='bdd866c6853977ca05943b1961753850082eb91818a606d0dce117b78e0abb42')throw Error('Unreviewed IDL');
 const idl=JSON.parse(idlBytes.toString()) as Idl;
 const coder=new BorshInstructionCoder(idl);
 const [vesting]=PublicKey.findProgramAddressSync([Buffer.from('vesting'),beneficiary.toBuffer(),mint.toBuffer()],program);
 const [vault]=PublicKey.findProgramAddressSync([Buffer.from('vault'),vesting.toBuffer()],program);
 const start=365n*86400n,end=start+730n*86400n;
 const meta=(pubkey:PublicKey,isSigner=false,isWritable=false)=>({pubkey,isSigner,isWritable});
 const initialize=new TransactionInstruction({programId:program,keys:[meta(payer,true,true),meta(authority,true),meta(beneficiary,true),meta(mint),meta(vesting,false,true),meta(vault,false,true),meta(TOKEN_PROGRAM_ID),meta(SystemProgram.programId),meta(SYSVAR_RENT_PUBKEY)],data:coder.encode('initialize',{total_amount:new BN(FOUNDER.toString()),start_time:new BN(start.toString()),cliff_time:new BN(start.toString()),end_time:new BN(end.toString())})});
 const deposit=new TransactionInstruction({programId:program,keys:[meta(vesting,false,true),meta(vault,false,true),meta(authority,true,true),meta(mint),meta(source,false,true),meta(TOKEN_PROGRAM_ID)],data:coder.encode('deposit',{amount:new BN(FOUNDER.toString())})});
 const release=new TransactionInstruction({programId:program,keys:[meta(vesting,false,true),meta(vault,false,true),meta(beneficiary,true,true),meta(mint),meta(key(16),false,true),meta(TOKEN_PROGRAM_ID)],data:coder.encode('release',{})});
 const instructions=[createInitializeMint2Instruction(mint,9,mintAuthority,null),createMintToCheckedInstruction(mint,source,mintAuthority,SUPPLY,9),...p.allocations.filter((r:any)=>r.label!=='founder').map((r:any,i:number)=>createTransferCheckedInstruction(source,mint,key(20+i),authority,units(r.tokens),9)),initialize,deposit,createSetAuthorityInstruction(mint,mintAuthority,AuthorityType.MintTokens,null)];
 const encode=(ix:TransactionInstruction)=>({programId:ix.programId.toBase58(),accounts:ix.keys.map(a=>({address:a.pubkey.toBase58(),isSigner:a.isSigner,isWritable:a.isWritable})),dataHex:ix.data.toString('hex')});
 return {idlSha256,scope:'OFFLINE_FIXTURE_ONLY',mainnetStatus:'NOT_AUTHORIZED_FOR_MAINNET',mainnetDisabled:true,authorization:false,decimals:9,supplyBaseUnits:SUPPLY.toString(),founderBaseUnits:FOUNDER.toString(),start:start.toString(),end:end.toString(),mintAuthority:mintAuthority.toBase58(),distributionAuthority:authority.toBase58(),mint:mint.toBase58(),vesting:vesting.toBase58(),vault:vault.toBase58(),program:program.toBase58(),instructions:instructions.map(encode),release:encode(release),extraMint:encode(createMintToCheckedInstruction(mint,source,mintAuthority,1n,9)),overflowMint:encode(createMintToCheckedInstruction(mint,source,mintAuthority,U64,9)),restoreAuthority:encode(createSetAuthorityInstruction(mint,mintAuthority,AuthorityType.MintTokens,mintAuthority))};
}
if(require.main===module){console.log(JSON.stringify(fixture(JSON.parse(fs.readFileSync('config/robusto-tokenomics-10b9-alternative.json','utf8'))),null,2));}
