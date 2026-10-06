/** One unsigned, single-transaction rehearsal planner. It never signs or sends. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction} from '@solana/web3.js';
import {DEVNET_MINT, DEVNET_PROGRAM_ID} from './devnet-config';
import {ALLOCATIONS, PRODUCTION_PROGRAM} from './production-plan';

export const RPC='https://api.devnet.solana.com';
export const GENESIS='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export const LOADER=new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
const ROOT=path.resolve(__dirname,'..');
const PUBKEY_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const sha=(data:Buffer|string)=>createHash('sha256').update(data).digest('hex');

export type Deployment = {cluster:string;rpc:string;genesisHash:string;program:string;payer:string;
 status:string;upgradeAuthority:string;buffer:string|null;bufferSeed:string|null;bufferAuthority:string|null;maxProgramBytes:number;
 elfSha256:string;idlSha256:string;manifestSha256:string};

export function readDeployment(file=path.join(ROOT,'config/rehearsal-deployment.json')):Deployment {
 const p=JSON.parse(fs.readFileSync(file,'utf8')) as Deployment;
 if(p.cluster!=='devnet'||p.rpc!==RPC||p.genesisHash!==GENESIS)throw Error('Deployment is not pinned to expected Devnet');
 if(p.status!=='PREPARATION ONLY — NO TRANSACTION AUTHORIZED')throw Error('Deployment status is not preparation-only');
 if(!p.program||!p.payer||!p.upgradeAuthority||p.bufferAuthority!==p.upgradeAuthority)throw Error('Incomplete deployment roles or authority mismatch');
 if(p.bufferSeed!==null&&(typeof p.bufferSeed!=='string'||! /^[A-Za-z0-9_-]{1,32}$/.test(p.bufferSeed)))throw Error('Invalid pinned public buffer seed');
 if(!Number.isSafeInteger(p.maxProgramBytes)||p.maxProgramBytes<1||p.maxProgramBytes>10*1024*1024)throw Error('Invalid max program length');
 for(const h of [p.elfSha256,p.idlSha256,p.manifestSha256])if(!/^[0-9a-f]{64}$/.test(h))throw Error('Invalid pinned artifact hash');
 return p;
}

export function pubkey(value:unknown,name:string):PublicKey {
 if(typeof value!=='string'||!PUBKEY_RE.test(value))throw Error(`Missing or invalid public ${name}`);
 const key=new PublicKey(value);if(key.toBase58()!==value||key.equals(PublicKey.default))throw Error(`Invalid public ${name}`);return key;
}
function protectedKeys(){
 const production=JSON.parse(fs.readFileSync(path.join(ROOT,'config/production-plan.json'),'utf8')) as {mint:unknown};
 if(production.mint!==null&&typeof production.mint!=='string')throw Error('Invalid protected production mint configuration');
 return [PRODUCTION_PROGRAM,DEVNET_PROGRAM_ID,DEVNET_MINT,...ALLOCATIONS.map(a=>new PublicKey(a.beneficiary)),
  ...(production.mint===null?[]:[pubkey(production.mint,'protected production mint')])];
}
export function assertSafeRoles(p:Deployment,buffer?:string):{program:PublicKey;payer:PublicKey;upgrade:PublicKey;buffer?:PublicKey} {
 if(p.cluster!=='devnet'||p.rpc!==RPC||p.genesisHash!==GENESIS)throw Error('Only the pinned Devnet cluster is allowed');
 const program=pubkey(p.program,'program'),payer=pubkey(p.payer,'payer'),upgrade=pubkey(p.upgradeAuthority,'upgrade authority');
 const protectedSet=protectedKeys();
 const roles=[program,payer,upgrade];
 if(buffer!==undefined)roles.push(pubkey(buffer,'buffer signer'));
 if(roles.some(k=>protectedSet.some(x=>x.equals(k))))throw Error('Protected identity in rehearsal role');
 if(new Set(roles.map(k=>k.toBase58())).size!==roles.length)throw Error('Rehearsal roles must use distinct identities');
 if(![program,payer,upgrade,...(buffer===undefined?[]:[roles[3]])].every(k=>PublicKey.isOnCurve(k.toBytes())))throw Error('Program ID and transaction signers must be on curve');
 return {program,payer,upgrade,...(buffer===undefined?{}:{buffer:roles[3]})};
}
export async function deriveBuffer(payer:PublicKey,seed:string):Promise<PublicKey>{
 if(typeof seed!=='string'||! /^[A-Za-z0-9_-]{1,32}$/.test(seed))throw Error('Use an explicit public ASCII buffer seed of 1..32 characters');
 return PublicKey.createWithSeed(payer,seed,LOADER);
}
export function assertBufferAddress(p:Deployment,key:PublicKey,roles:{program:PublicKey;payer:PublicKey;upgrade:PublicKey}){
 const protectedSet=protectedKeys();
 if(protectedSet.some(x=>x.equals(key))||[roles.program,roles.payer,roles.upgrade].some(x=>x.equals(key)))throw Error('Derived buffer collides with protected rehearsal identity');
 if(p.buffer!==null&&p.buffer!==key.toBase58())throw Error('Derived buffer differs from pinned public buffer address');
}

export function findCandidate(p:Deployment, candidateRoot?:string) {
 const requested=candidateRoot??path.join(ROOT,'target/rehearsal-builds');
 // Restorable public historical evidence; never accepts a different hash or signer.
 const base=path.resolve(candidateRoot===undefined&&!fs.existsSync(requested)?path.join(ROOT,'docs/evidence/rehearsal-builds'):requested);
 let baseInfo:fs.Stats;try{baseInfo=fs.lstatSync(base);}catch{throw Error('Candidate directory is absent or invalid');}
 if(!baseInfo.isDirectory())throw Error('Candidate directory is absent, a symlink or invalid');
 for(let cur=base;;){if(fs.lstatSync(cur).isSymbolicLink())throw Error('Symlink in candidate path');const parent=path.dirname(cur);if(parent===cur)break;cur=parent;}
 const dirs=fs.readdirSync(base,{withFileTypes:true}).filter(d=>d.isDirectory()&&!d.isSymbolicLink()&&d.name.startsWith(p.program+'-'));
 const matches=dirs.map(d=>path.join(base,d.name)).filter(dir=>{
  try {
   for(const name of ['manifest.json','program.so','idl.json'])if(fs.lstatSync(path.join(dir,name)).isSymbolicLink())return false;
   const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
   return m.programId===p.program&&m.status==='built-not-runtime-verified'&&sha(fs.readFileSync(path.join(dir,'program.so')))===p.elfSha256&&sha(fs.readFileSync(path.join(dir,'idl.json')))===p.idlSha256&&sha(fs.readFileSync(path.join(dir,'manifest.json')))===p.manifestSha256;
  }catch{return false;}
 });
 if(matches.length!==1)throw Error('Expected exactly one candidate matching all pinned hashes');
 const dir=matches[0],elf=fs.readFileSync(path.join(dir,'program.so'));
 if(elf.length>p.maxProgramBytes)throw Error('ELF exceeds configured maximum data length');
 const idl=JSON.parse(fs.readFileSync(path.join(dir,'idl.json'),'utf8'));
 if(idl.address!==p.program)throw Error('IDL Program ID mismatch');
 return {dir,elf,idlBytes:fs.readFileSync(path.join(dir,'idl.json'))};
}

export function loaderData(index:number,tail?:Buffer):Buffer {
 const tag=Buffer.alloc(4);tag.writeUInt32LE(index);
 return tail?Buffer.concat([tag,tail]):tag;
}
export function writeData(offset:number,chunk:Buffer):Buffer {
 if(!Number.isSafeInteger(offset)||offset<0||offset>0xffffffff||chunk.length<1||chunk.length>650)throw Error('Invalid ELF write range; use chunks of 1..650 bytes');
 const tail=Buffer.alloc(12+chunk.length);tail.writeUInt32LE(offset,0);tail.writeBigUInt64LE(BigInt(chunk.length),4);chunk.copy(tail,12);
 return loaderData(1,tail);
}
export function deployData(maxLen:number):Buffer {
 if(!Number.isSafeInteger(maxLen)||maxLen<1)throw Error('Invalid maximum program length');
 const tail=Buffer.alloc(8);tail.writeBigUInt64LE(BigInt(maxLen));return loaderData(2,tail);
}
export function verifiedPrefix(accountData:Buffer,elf:Buffer,authority:PublicKey,maxLen:number):number {
 if(accountData.length!==37+maxLen||accountData.readUInt32LE(0)!==1||accountData[4]!==1||!accountData.subarray(5,37).equals(authority.toBuffer()))throw Error('Buffer owner/state/authority/length mismatch');
 const payload=accountData.subarray(37,37+maxLen);
 for(let i=elf.length;i<payload.length;i++)if(payload[i]!==0)throw Error('Unexpected nonzero buffer data past ELF');
 let cursor=elf.length;for(let i=0;i<elf.length;i++)if(payload[i]!==elf[i]){cursor=i;break;}
 for(let i=cursor;i<payload.length;i++)if(payload[i]!==0)throw Error('Unexpected nonzero data after ELF prefix');
 if(cursor<elf.length)return cursor;
 return elf.length;
}
function ix(programId:PublicKey,keys:{pubkey:PublicKey;isSigner:boolean;isWritable:boolean}[],data:Buffer){return new TransactionInstruction({programId,keys,data});}

async function pinnedConnection(connection:Connection) {
 const endpoint=(connection as any)._rpcEndpoint;
 if(endpoint!==RPC)throw Error('RPC endpoint mismatch');
 const genesis=await connection.getGenesisHash();if(genesis!==GENESIS)throw Error('Devnet genesis mismatch');
 return genesis;
}
async function assertAbsent(connection:Connection,key:PublicKey,label:string){if(await connection.getAccountInfo(key,'confirmed'))throw Error(`${label} account already exists`);}
async function checkBuffer(connection:Connection,address:PublicKey,p:Deployment,elf:Buffer,authority:PublicKey) {
 const info=await connection.getAccountInfo(address,'confirmed');if(!info)throw Error('Buffer account is absent');
 if(!info.owner.equals(LOADER))throw Error('Buffer owner is not upgradeable loader');
 const cursor=verifiedPrefix(info.data,elf,authority,p.maxProgramBytes);return {info,cursor};
}

async function unsigned(connection:Connection,feePayer:PublicKey,instructions:TransactionInstruction[],summary:Record<string,unknown>) {
  const latest=await connection.getLatestBlockhash('confirmed');
  const tx=new Transaction({feePayer,recentBlockhash:latest.blockhash}).add(...instructions);
 const message=tx.compileMessage();const feeResponse=await connection.getFeeForMessage(message,'confirmed');
  const fee=feeResponse.value;if(fee===null||!Number.isSafeInteger(fee)||fee<0)throw Error('Exact message fee unavailable');
 const rent=Number(summary.rentLamports??0);if(!Number.isSafeInteger(rent)||rent<0)throw Error('Invalid exact rent amount');
 const balance=await connection.getBalance(feePayer,'confirmed');
 if(!Number.isSafeInteger(balance)||balance<0)throw Error('Invalid payer balance response');
 if(!Number.isSafeInteger(fee+rent))throw Error('Immediate cost exceeds safe integer range');
  const bytes=tx.serialize({requireAllSignatures:false,verifySignatures:false});
  if(bytes.length>1232)throw Error('Unsigned transaction exceeds packet limit');
  await pinnedConnection(connection);
 return {status:'UNSIGNED SINGLE TRANSACTION — NOT SIMULATED, SIGNED OR SENT',cluster:'devnet',rpc:RPC,genesisHash:GENESIS,
  observedAt:new Date().toISOString(),slot:await connection.getSlot('confirmed'),blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight,
  feeLamports:fee,rentLamports:rent,maxImmediateLamports:fee+rent,payerBalanceLamports:balance,adequatelyFunded:balance>=fee+rent,transactionBytes:bytes.length,unsignedTransactionBase64:bytes.toString('base64'),
  messageSha256:sha(message.serialize()),requiredSigners:message.accountKeys.slice(0,message.header.numRequiredSignatures).map(k=>k.toBase58()),
  expectedEffect:'Exactly the listed instructions if separately signed and submitted; this planner did neither.',evidenceToRecord:['approved message SHA-256','transaction signature','confirmation slot','before/after account snapshots'],...summary};
}

export async function prepareOne(connection:Connection,step:string,args:Record<string,string|undefined>,p=readDeployment(),candidateRoot?:string) {
 if(!['buffer-create','buffer-write','buffer-verify','program-deploy'].includes(step))throw Error('Exactly one supported rehearsal step is required');
 const roles=assertSafeRoles(p);await pinnedConnection(connection);const {dir,elf}=findCandidate(p,candidateRoot);
 const buffer=step==='program-verify'?undefined:await deriveBuffer(roles.payer,args.bufferSeed??'');
 if(step!=='program-verify'&&p.bufferSeed!==null&&args.bufferSeed!==p.bufferSeed)throw Error('Buffer seed differs from pinned public seed');
 if(buffer)assertBufferAddress(p,buffer,roles);
 const summaryBase={program:p.program,payer:p.payer,upgradeAuthority:roles.upgrade.toBase58(),buffer:buffer?.toBase58(),bufferSeed:args.bufferSeed,elfSha256:p.elfSha256,candidateDir:dir};
 if(step==='buffer-create'){
  if(!buffer||!p.bufferAuthority||p.bufferAuthority!==roles.upgrade.toBase58())throw Error('Buffer authority must equal the approved upgrade authority');
  await assertAbsent(connection,buffer,'Buffer');
  const rent=await connection.getMinimumBalanceForRentExemption(37+p.maxProgramBytes,'confirmed');
  if(!Number.isSafeInteger(rent)||rent<=0)throw Error('Exact buffer rent unavailable');
  const create=SystemProgram.createAccountWithSeed({fromPubkey:roles.payer,basePubkey:roles.payer,seed:args.bufferSeed!,newAccountPubkey:buffer,lamports:rent,space:37+p.maxProgramBytes,programId:LOADER});
  const init=ix(LOADER,[{pubkey:buffer,isSigner:false,isWritable:true},{pubkey:roles.upgrade,isSigner:false,isWritable:false}],loaderData(0));
  return unsigned(connection,roles.payer,[create,init],{operation:'create and initialize buffer',rentLamports:rent,irreversible:true,...summaryBase});
 }
 if(step==='buffer-write'){
  if(!buffer||!p.bufferAuthority||p.bufferAuthority!==roles.upgrade.toBase58())throw Error('Buffer authority mismatch');
  const offset=Number(args.offset),length=Number(args.length);
  if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||length<1||length>650||offset+length>elf.length)throw Error('Explicit valid ELF offset and 1..650-byte length required');
  const {info,cursor}=await checkBuffer(connection,buffer,p,elf,roles.upgrade);
  if(offset!==cursor)throw Error(`Next matching ELF prefix begins at offset ${cursor}`);
  const chunk=elf.subarray(offset,offset+length);const instr=ix(LOADER,[{pubkey:buffer,isSigner:false,isWritable:true},{pubkey:roles.upgrade,isSigner:true,isWritable:false}],writeData(offset,chunk));
  return unsigned(connection,roles.payer,[instr],{operation:'write one ELF fragment',offset,length,rentLamports:0,bufferDataLength:info.data.length,irreversible:true,...summaryBase});
 }
 if(step==='buffer-verify'){
  if(!buffer||!p.bufferAuthority)throw Error('Buffer and authority are required');
  if(p.bufferAuthority!==roles.upgrade.toBase58())throw Error('Buffer authority is not pinned to the approved upgrade authority');
  const {info,cursor}=await checkBuffer(connection,buffer,p,elf,roles.upgrade);
  if(cursor!==elf.length)throw Error(`Buffer incomplete at ELF offset ${cursor}`);
  return {status:'READ ONLY BUFFER VERIFIED',cluster:'devnet',genesisHash:GENESIS,slot:await connection.getSlot('confirmed'),buffer:buffer.toBase58(),owner:info.owner.toBase58(),authority:p.bufferAuthority,elfBytes:elf.length,elfSha256:sha(info.data.subarray(37,37+elf.length)),zeroPadding:true};
 }
 if(step==='program-deploy'){
  if(!buffer)throw Error('Buffer public identity is required');
  if(!p.bufferAuthority||p.bufferAuthority!==roles.upgrade.toBase58())throw Error('Buffer authority must be upgrade authority');
  await assertAbsent(connection,roles.program,'Program');
  const [programData]=PublicKey.findProgramAddressSync([roles.program.toBuffer()],LOADER);await assertAbsent(connection,programData,'ProgramData');
  const {cursor}=await checkBuffer(connection,buffer,p,elf,roles.upgrade);if(cursor!==elf.length)throw Error('Verified complete ELF buffer required');
 const programRent=await connection.getMinimumBalanceForRentExemption(36,'confirmed');
  if(!Number.isSafeInteger(programRent)||programRent<=0)throw Error('Exact program rent unavailable');
  const programDataRent=await connection.getMinimumBalanceForRentExemption(45+p.maxProgramBytes,'confirmed');
  if(!Number.isSafeInteger(programDataRent)||programDataRent<=0)throw Error('Exact ProgramData rent unavailable');
  const create=SystemProgram.createAccount({fromPubkey:roles.payer,newAccountPubkey:roles.program,lamports:programRent,space:36,programId:LOADER});
  const deploy=ix(LOADER,[{pubkey:roles.payer,isSigner:true,isWritable:true},{pubkey:programData,isSigner:false,isWritable:true},{pubkey:roles.program,isSigner:false,isWritable:true},{pubkey:buffer,isSigner:false,isWritable:true},{pubkey:new PublicKey('SysvarRent111111111111111111111111111111111'),isSigner:false,isWritable:false},{pubkey:new PublicKey('SysvarC1ock11111111111111111111111111111111'),isSigner:false,isWritable:false},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false},{pubkey:roles.upgrade,isSigner:true,isWritable:false}],deployData(p.maxProgramBytes));
  return unsigned(connection,roles.payer,[create,deploy],{operation:'create executable and deploy from verified buffer',rentLamports:programRent+programDataRent,programRentLamports:programRent,programDataRentLamports:programDataRent,programData:programData.toBase58(),maxProgramBytes:p.maxProgramBytes,irreversible:true,...summaryBase});
 }
 throw Error('Exactly one supported step is required: buffer-create, buffer-write, buffer-verify, program-deploy');
}

export async function verifyProgram(connection:Connection,p=readDeployment(),candidateRoot?:string) {
 assertSafeRoles(p);await pinnedConnection(connection);const candidate=findCandidate(p,candidateRoot);const program=pubkey(p.program,'program');
 const info=await connection.getAccountInfo(program,'confirmed');if(!info||!info.executable||!info.owner.equals(LOADER)||info.data.length!==36||info.data.readUInt32LE(0)!==2)throw Error('Program account owner/state/executable mismatch');
 const [programData]=PublicKey.findProgramAddressSync([program.toBuffer()],LOADER);if(!new PublicKey(info.data.subarray(4,36)).equals(programData))throw Error('ProgramData address mismatch');
 const pd=await connection.getAccountInfo(programData,'confirmed');if(!pd||!pd.owner.equals(LOADER)||pd.data.length!==45+p.maxProgramBytes||pd.data.readUInt32LE(0)!==3)throw Error('ProgramData owner/state/length mismatch');
 const slot=pd.data.readBigUInt64LE(4),hasAuthority=pd.data[12];if(hasAuthority!==1||!new PublicKey(pd.data.subarray(13,45)).equals(pubkey(p.upgradeAuthority,'upgrade authority')))throw Error('ProgramData upgrade authority mismatch');
 const bytes=pd.data.subarray(45,45+candidate.elf.length);if(!bytes.equals(candidate.elf)||sha(bytes)!==p.elfSha256||!pd.data.subarray(45+candidate.elf.length).every(b=>b===0))throw Error('Deployed ELF mismatch or nonzero padding');
 await pinnedConnection(connection);
 return {status:'READ ONLY PROGRAM VERIFIED',cluster:'devnet',genesisHash:GENESIS,slot:await connection.getSlot('confirmed'),program:program.toBase58(),programData:programData.toBase58(),programOwner:info.owner.toBase58(),programExecutable:info.executable,upgradeAuthority:p.upgradeAuthority,deploymentSlot:slot.toString(),elfBytes:bytes.length,elfSha256:sha(bytes)};
}

async function main(){
 const [step,...raw]=process.argv.slice(2);const args:Record<string,string|undefined>={};
 for(let i=0;i<raw.length;i+=2){if(!raw[i].startsWith('--')||!raw[i+1]||args[raw[i].slice(2)]!==undefined)throw Error('Arguments must be unique --name value pairs');args[raw[i].slice(2)]=raw[i+1];}
 const p=readDeployment();const connection=new Connection(RPC,{commitment:'confirmed',confirmTransactionInitialTimeout:15000});
 const allowed:Record<string,string[]>={'buffer-create':['bufferSeed'],'buffer-write':['bufferSeed','offset','length'],'buffer-verify':['bufferSeed'],'program-deploy':['bufferSeed'],'program-verify':[]};
 if(!allowed[step]||Object.keys(args).some(key=>!allowed[step].includes(key))||step==='program-verify'&&Object.keys(args).length)throw Error('Unexpected argument for one-step operation');
 const result=step==='program-verify'?await verifyProgram(connection,p):await prepareOne(connection,step,args,p);
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
if(require.main===module)main().catch(error=>{console.error(`STOP: ${(error as Error).message}`);process.exitCode=1;});
