/** Future read-only preconditions, one instruction stage; no signer/submission. */
import {Connection,PublicKey,SystemProgram,SYSVAR_CLOCK_PUBKEY} from '@solana/web3.js';
import {unpackMint,unpackAccount,getAssociatedTokenAddressSync,TOKEN_PROGRAM_ID} from '@solana/spl-token';
import {findMetadataPda,mplTokenMetadata} from '@metaplex-foundation/mpl-token-metadata';
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults';
import {publicKey} from '@metaplex-foundation/umi';
import {Idl,BorshAccountsCoder} from '@coral-xyz/anchor';
import {LOADER} from './rehearsal-one-tx';
import {verifyProductionBuffer,buildProgramDeployment} from './robusto-program-deployment';
import {address,Step,SUPPLY,validateProduction,requireMainnetReadOnly,assertMainnet,verifyProgramAccounts,buildProductionSteps,describeSteps} from './robusto-production';
/** Bind the reviewed stage to canonical instructions before consulting any RPC. */
export function validatePreparedStage(p:any,idl:Idl,elf:Buffer,step:Step,maxProgramBytes?:number){
 let candidates:Step[];
 if(step.kind.startsWith('program-')){
  let buffer:string,rent=1,capacity=maxProgramBytes;
  if(step.kind==='program-buffer'){
   const create=SystemProgram.programId.equals(step.instructions[0]?.programId)?step.instructions[0]:undefined;
   if(!create||create.data.length!==52||create.data.readUInt32LE(0)!==0)throw Error('Invalid buffer creation stage');
   buffer=create.keys[1].pubkey.toBase58();rent=Number(create.data.readBigUInt64LE(4));capacity=Number(create.data.readBigUInt64LE(12))-37;
   if(maxProgramBytes!==undefined&&capacity!==maxProgramBytes)throw Error('Program capacity mismatch');
  }else{
   const ix=step.instructions.at(-1);if(!ix)throw Error('Missing program instruction');
   buffer=ix.keys[step.kind==='program-write'?0:3].pubkey.toBase58();
   if(step.kind==='program-deploy')rent=Number(step.instructions[0].data.readBigUInt64LE(4));
  }
  candidates=buildProgramDeployment(p,elf,buffer,capacity!,{buffer:step.kind==='program-buffer'?rent:1,program:step.kind==='program-deploy'?rent:1,programData:1});
 }else{
  const rent=step.kind==='mint'&&step.instructions[0]?.data.length===52?Number(step.instructions[0].data.readBigUInt64LE(4)):1;
  candidates=buildProductionSteps(p,idl,rent);
 }
 const expected=candidates.find(s=>s.label===step.label&&s.kind===step.kind);
 if(!expected||JSON.stringify(describeSteps([expected]))!==JSON.stringify(describeSteps([step])))throw Error('Prepared stage differs from canonical approved candidate');
}
export async function preflightStage(c:Connection,p:any,idl:Idl,elf:Buffer,step:Step,network:any,optIn:unknown,maxProgramBytes?:number){
 requireMainnetReadOnly(network,optIn);if(c.rpcEndpoint!==network.rpc||idl.address!==p.program)throw Error('Preflight RPC/IDL mismatch');
 const allocations=validateProduction(p);validatePreparedStage(p,idl,elf,step,maxProgramBytes);await assertMainnet(c);
 const program=address(p.program),mint=address(p.mint),mintAuthority=address(p.mintAuthority),distributionAuthority=address(p.distributionSourceOwner),payer=address(p.payer);
 const [pd]=PublicKey.findProgramAddressSync([program.toBuffer()],LOADER),source=getAssociatedTokenAddressSync(mint,distributionAuthority);
 const umi=createUmi('http://127.0.0.1:8899').use(mplTokenMetadata()),[metadata]=findMetadataPda(umi,{mint:publicKey(p.mint)});
 const keys=[program,pd,mint,source,payer,SYSVAR_CLOCK_PUBKEY,new PublicKey(metadata)];
 for(const ix of step.instructions)for(const k of ix.keys)if(!keys.some(key=>key.equals(k.pubkey)))keys.push(k.pubkey);
 if(keys.length>100)throw Error('Preflight snapshot limit exceeded');
 const {context,value}=await c.getMultipleAccountsInfoAndContext(keys,'finalized');
 const account=(key:PublicKey)=>value[keys.findIndex(k=>k.equals(key))];
 const absent=(key:PublicKey)=>{if(account(key))throw Error('Expected new account is occupied');};
 const payerInfo=account(payer);if(!payerInfo||payerInfo.executable||!payerInfo.owner.equals(SystemProgram.programId)||payerInfo.data.length!==0)throw Error('System fee payer required');
 const clock=account(SYSVAR_CLOCK_PUBKEY);if(!clock||clock.executable||clock.data.length!==40||clock.owner.toBase58()!=='Sysvar1111111111111111111111111111111111111')throw Error('Chain Clock unavailable');
 const now=clock.data.readBigInt64LE(32);
 if(step.kind==='program-buffer'){absent(step.instructions[0].keys[1].pubkey);}
 else if(step.kind==='program-write'||step.kind==='program-deploy'){
  if(!maxProgramBytes)throw Error('Approved program capacity required');
  const ix=step.instructions[step.instructions.length-1],buffer=step.kind==='program-write'?ix.keys[0].pubkey:ix.keys[3].pubkey;
  const offset=verifyProductionBuffer(account(buffer),elf,p,maxProgramBytes);
  if(step.kind==='program-write'){if(offset!==ix.data.readUInt32LE(4))throw Error('Fragment offset differs from verified buffer cursor');}
  else {absent(program);absent(pd);if(offset!==elf.length)throw Error('Complete ELF buffer required');}
 }else {
  verifyProgramAccounts(account(program),account(pd),p,elf);
  if(step.kind==='mint')absent(mint);
  else {
   const mintInfo=account(mint),m=unpackMint(mint,mintInfo,TOKEN_PROGRAM_ID);
   if(!mintInfo||mintInfo.executable||mintInfo.data.length!==82||mintInfo.data[45]!==1||![0,1].includes(mintInfo.data.readUInt32LE(0))||![0,1].includes(mintInfo.data.readUInt32LE(46))||m.decimals!==6||m.freezeAuthority!==null||!m.mintAuthority?.equals(mintAuthority))throw Error('Classic ROBUSTO mint authority/decimals/freeze mismatch');
   const token=(key:PublicKey,owner:PublicKey)=>{const info=account(key);if(!info||info.executable||info.data.length!==165||info.data[108]!==1||![0,1].includes(info.data.readUInt32LE(72))||![0,1].includes(info.data.readUInt32LE(109))||![0,1].includes(info.data.readUInt32LE(129)))throw Error('Valid unfrozen classic token account required');const t=unpackAccount(key,info,TOKEN_PROGRAM_ID);if(!t.owner.equals(owner)||!t.mint.equals(mint)||t.delegate||t.closeAuthority||t.isNative||t.delegatedAmount!==0n)throw Error('Token account identity/powers mismatch');return t;};
   if(step.kind==='mintTo'){
    if(m.supply!==0n||token(source,distributionAuthority).amount!==0n)throw Error('MintTo requires zero supply and market source: never repeat issuance');
   }else if(step.kind==='ata'){
    const ix=step.instructions[0],dest=ix.keys[1].pubkey,owner=ix.keys[2].pubkey;
    if(!dest.equals(getAssociatedTokenAddressSync(mint,owner)))throw Error('ATA derivation mismatch');
    if(account(dest)&&token(dest,owner).amount!==0n)throw Error('ATA setup requires empty existing destination');
   }else {
    if(m.supply!==SUPPLY)throw Error('Supply changed from approved candidate');
    if(step.kind==='metadata'){absent(new PublicKey(metadata));}
    else {
     const a=allocations.find(row=>step.label===`${step.kind==='transfer'?'distribute':step.kind}-${row.label}`);if(!a)throw Error('Unknown allocation stage');
     const beneficiary=address(a.beneficiary),[vesting,bump]=PublicKey.findProgramAddressSync([Buffer.from('vesting'),beneficiary.toBuffer(),mint.toBuffer()],program),[vault]=PublicKey.findProgramAddressSync([Buffer.from('vault'),vesting.toBuffer()],program);
     if(step.kind==='transfer'){
      if(a.vesting||token(getAssociatedTokenAddressSync(mint,beneficiary),beneficiary).amount!==0n||token(source,distributionAuthority).amount<BigInt(a.baseUnits))throw Error('Distribution destination/source precondition mismatch');
     }else if(step.kind==='initialize'){absent(vesting);absent(vault);}
     else if(step.kind==='deposit'){
      if(!a.vesting)throw Error('Vesting allocation required');const info=account(vesting);
      if(!info||info.executable||!info.owner.equals(program)||info.data.length!==145)throw Error('Vesting owner/size mismatch');
      const name=idl.accounts?.find(v=>v.name.toLowerCase().replace('_','')==='vestingaccount')?.name;if(!name)throw Error('Vesting schema unavailable');
      const v=new BorshAccountsCoder(idl).decode(name,info.data);
      if(v.bump!==bump||v.authority.toBase58()!==p.distributionSourceOwner||v.beneficiary.toBase58()!==a.beneficiary||v.mint.toBase58()!==p.mint||v.total_amount.toString()!==a.baseUnits||v.released_amount.toString()!=='0'||v.start_time.toString()!==a.vesting.start||v.cliff_time.toString()!==a.vesting.cliff||v.end_time.toString()!==a.vesting.end||now>=BigInt(a.vesting.cliff)||token(vault,vesting).amount!==0n||token(source,distributionAuthority).amount<BigInt(a.baseUnits))throw Error('Deposit schedule/funding preconditions mismatch');
     }else throw Error('Unsupported preflight stage');
    }
   }
  }
 }
 await assertMainnet(c);return {status:'PRECONDITIONS_VERIFIED_SIMULATION_AND_APPROVAL_REQUIRED',slot:context.slot,chainTime:now.toString(),label:step.label,payerBalanceLamports:payerInfo.lamports};
}
