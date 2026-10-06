/** Future program deployment instruction builder. Offline only, no wallet or RPC. */
import {PublicKey,SystemProgram,SYSVAR_RENT_PUBKEY,SYSVAR_CLOCK_PUBKEY,TransactionInstruction} from '@solana/web3.js';
import {createHash} from 'node:crypto';
import {LOADER,loaderData,writeData,deployData,verifiedPrefix} from './rehearsal-one-tx';
import {address,validateProduction,protectedAddresses,Step} from './robusto-production';
export function buildProgramDeployment(p:any,elf:Buffer,bufferAddress:string,maxBytes:number,rents:{buffer:number;program:number;programData:number}):Step[]{
 validateProduction(p);
 if(!Number.isSafeInteger(maxBytes)||maxBytes<elf.length||maxBytes>10*1024*1024||elf.length<4||!elf.subarray(0,4).equals(Buffer.from([127,69,76,70]))||
 createHash('sha256').update(elf).digest('hex')!==p.programElfSha256||!elf.includes(address(p.program).toBuffer()))throw Error('Approved ELF identity/hash/capacity required');
 for(const role of ['buffer','program','programData'] as const)if(!Number.isSafeInteger(rents?.[role])||rents[role]<=0)throw Error('Exact deployment rents required');
 const buffer=address(bufferAddress),payer=address(p.payer),program=address(p.program),authority=address(p.upgradeAuthority);
 if(protectedAddresses().has(bufferAddress)||!PublicKey.isOnCurve(buffer.toBytes())||[p.payer,p.program,p.mint,p.mintAuthority,p.metadataUpdateAuthority,p.upgradeAuthority].includes(bufferAddress))throw Error('Fresh separate buffer signer address required');
 const meta=(pubkey:PublicKey,isSigner=false,isWritable=false)=>({pubkey,isSigner,isWritable});
 const ix=(keys:ReturnType<typeof meta>[],data:Buffer)=>new TransactionInstruction({programId:LOADER,keys,data});
 const steps:Step[]=[{label:'buffer-create',kind:'program-buffer',rentSizes:[37+maxBytes],instructions:[
  SystemProgram.createAccount({fromPubkey:payer,newAccountPubkey:buffer,lamports:rents.buffer,space:37+maxBytes,programId:LOADER}),
  ix([meta(buffer,false,true),meta(authority)],loaderData(0))]}];
 for(let offset=0;offset<elf.length;offset+=650){const chunk=elf.subarray(offset,offset+650);
  steps.push({label:`buffer-write-${offset}`,kind:'program-write',rentSizes:[],instructions:[ix([meta(buffer,false,true),meta(authority,true)],writeData(offset,chunk))]});}
 const [pd]=PublicKey.findProgramAddressSync([program.toBuffer()],LOADER);
 steps.push({label:'program-deploy',kind:'program-deploy',rentSizes:[36,45+maxBytes],instructions:[
  SystemProgram.createAccount({fromPubkey:payer,newAccountPubkey:program,lamports:rents.program,space:36,programId:LOADER}),
  ix([meta(payer,true,true),meta(pd,false,true),meta(program,false,true),meta(buffer,false,true),meta(SYSVAR_RENT_PUBKEY),meta(SYSVAR_CLOCK_PUBKEY),meta(SystemProgram.programId),meta(authority,true)],deployData(maxBytes))]});
 return steps;
}
/** Validate a resumed buffer against the approved payload before preparing next fragment. */
export function verifyProductionBuffer(info:any,elf:Buffer,p:any,maxBytes:number){
 if(!info||info.executable||!info.owner.equals(LOADER))throw Error('Loader buffer ownership mismatch');
 return verifiedPrefix(info.data,elf,address(p.upgradeAuthority),maxBytes);
}
