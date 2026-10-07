/** Executable rehearsal ONLY on a validator created by this process. Never public RPC. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import {spawn,execFileSync,ChildProcess} from 'node:child_process';
import assert from 'node:assert/strict';
import {Connection,PublicKey,Keypair,SystemProgram,Transaction,TransactionInstruction,VersionedTransaction,ComputeBudgetProgram} from '@solana/web3.js';
import {TOKEN_PROGRAM_ID,TOKEN_2022_PROGRAM_ID,NATIVE_MINT,MINT_SIZE,createInitializeMintInstruction,createAssociatedTokenAccountInstruction,getAssociatedTokenAddressSync,createMintToInstruction,createSyncNativeInstruction,createTransferInstruction,unpackMint,unpackAccount} from '@solana/spl-token';
import {BN,BorshInstructionCoder,BorshAccountsCoder,Idl} from '@coral-xyz/anchor';
import {getMetadataAccountDataSerializer} from '@metaplex-foundation/mpl-token-metadata';
import {publicKey,none} from '@metaplex-foundation/umi';
import config from '../config/robusto-meteora-local.json';
import creationIdl from './meteora-local-idl.json';
import runtimeIdl from './meteora-runtime-idl.json';
import {prepareMeteoraLocal,LocalInput,historicalAddresses} from './robusto-meteora-local';
import {LOCAL_RPC,TRIAL,LocalBinding,validateLocalBinding,privateLocalPath,modelSwap} from './robusto-local-guard';
import {validateFinalPreflight,REVIEWED_BINARY,concentrationCostUsd,concentrationBaseUnitTolerance,continuousSwap} from './robusto-meteora-final-checks';

const ROOT=path.resolve(__dirname,'..'),PROGRAM=new PublicKey(creationIdl.address);
const META=new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const LOADER=new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
const IDL_SHA='087af00f60183b9ea157089559a865cc27841ac9d5f5475f9d49b480ef2ae66e';
const digest=(b:Uint8Array)=>crypto.createHash('sha256').update(b).digest('hex');
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const bn=(n:bigint)=>new BN(n.toString());
const bigint=(v:any)=>BigInt(v.toString());
const ixCoder=new BorshInstructionCoder(runtimeIdl as Idl),accountCoder=new BorshAccountsCoder(runtimeIdl as Idl);
const encode=(name:string,args:unknown,accounts:Record<string,PublicKey>)=>{
 const definition=runtimeIdl.instructions.find(x=>x.name===name);if(!definition)throw Error('Non-allowlisted Meteora operation');
 return new TransactionInstruction({programId:PROGRAM,data:ixCoder.encode(name,args),keys:definition.accounts.map(a=>({pubkey:accounts[a.name]??(('optional' in a&&a.optional)?PROGRAM:(()=>{throw Error('Missing public account');})()),isSigner:'signer' in a&&a.signer===true,isWritable:'writable' in a&&a.writable===true}))});
};
async function reservePort(){await new Promise<void>((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(8899,'127.0.0.1',()=>s.close(e=>e?reject(e):resolve()));});}

export async function runLocalRehearsal(authorized:boolean,final=false){
 if(authorized!==true||final!==true)throw Error('Only final local rehearsal with explicit authorization and fresh public preflight is permitted; historical execution mode disabled');
 const preflight=final?validateFinalPreflight(JSON.parse(fs.readFileSync(path.join(ROOT,'target/robusto-final-preflight.json'),'utf8'))):undefined;
 if(digest(fs.readFileSync(path.join(ROOT,'scripts/meteora-runtime-idl.json')))!==IDL_SHA)throw Error('Runtime IDL checksum mismatch');
 const source=JSON.parse(fs.readFileSync(path.join(ROOT,'target/meteora-official/build-record.json'),'utf8'));
 const binary=path.join(ROOT,'target/meteora-official/build/cp_amm.so');
 const expectedMeteoraBytes=fs.readFileSync(binary);
 if(source.programCommit!=='a85c926607433f23f0ea60f4ca7b1ae92f4156cb'||source.binarySha256!==digest(fs.readFileSync(binary))||source.reproduced!==true)throw Error('Official locked/reproduced local binary required');
 if(final&&source.binarySha256!==REVIEWED_BINARY)throw Error('Reviewed binary changed: stop');
 await reservePort();
 const previousMask=process.umask(0o077),session=crypto.randomUUID(),base=path.join(ROOT,'.robusto-local-private',session);
 privateLocalPath(ROOT,session,'payer-keypair.json'); // Reject symlinked private roots before creating anything.
 fs.mkdirSync(base,{recursive:true,mode:0o700});fs.chmodSync(path.dirname(base),0o700);fs.chmodSync(base,0o700);
 if(execFileSync('git',['check-ignore','--',path.relative(ROOT,base)],{cwd:ROOT,encoding:'utf8'}).trim()==='')throw Error('Private session must be ignored');
 const names=['payer','positionOwner','mintAuthority','metadataUpdateAuthority','upgradeAuthority','mint','nft','smallBuyer','mediumBuyer','boundaryBuyer'] as const;
 const keys={} as Record<typeof names[number],Keypair>;
 for(const name of names){keys[name]=Keypair.generate();fs.writeFileSync(privateLocalPath(ROOT,session,`${name.toLowerCase()}-keypair.json`),JSON.stringify(Array.from(keys[name].secretKey)),{mode:0o600});}
 const pubs=Object.fromEntries(names.map(n=>[n,keys[n].publicKey.toBase58()]));
 assert.equal(new Set(Object.values(pubs)).size,names.length);
 assert(!Object.values(pubs).some(x=>historicalAddresses().has(x)));
 if(final){
  for(const file of fs.readdirSync(path.join(ROOT,'docs/evidence/robusto')).filter(x=>x.endsWith('.json'))){
   const old=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/evidence/robusto',file),'utf8'));
   if(old.identities)assert(!Object.values(pubs).some(x=>Object.values(old.identities).includes(x)),'Previous rehearsal identity reused');
  }
 }
 const [metadataAddress]=PublicKey.findProgramAddressSync([Buffer.from('metadata'),META.toBuffer(),keys.mint.publicKey.toBuffer()],META);
 const metadataBytes=Buffer.from(getMetadataAccountDataSerializer().serialize({updateAuthority:publicKey(pubs.metadataUpdateAuthority),mint:publicKey(pubs.mint),name:'ROBUSTO LOCAL TEST',symbol:'ROBUSTO',uri:'',sellerFeeBasisPoints:0,creators:none(),primarySaleHappened:false,isMutable:true,editionNonce:none(),tokenStandard:none(),collection:none(),uses:none(),collectionDetails:none(),programmableConfig:none()}));
 const fixture=privateLocalPath(ROOT,session,'metadata-fixture.json');
 fs.writeFileSync(fixture,JSON.stringify({pubkey:metadataAddress.toBase58(),account:{lamports:10000000,data:[metadataBytes.toString('base64'),'base64'],owner:META.toBase58(),executable:false,rentEpoch:0,space:metadataBytes.length}}),{mode:0o600});
 const cli=privateLocalPath(ROOT,session,'cli.yml');
 fs.writeFileSync(cli,`json_rpc_url: ${LOCAL_RPC}\nwebsocket_url: ws://127.0.0.1:8900\nkeypair_path: ${privateLocalPath(ROOT,session,'payer-keypair.json')}\ncommitment: confirmed\n`,{mode:0o600});
 const ledger=path.join(base,'ledger'),validatorLog=fs.openSync(path.join(base,'validator.log'),'wx',0o600);
 const fixturePrograms:[[PublicKey,string],[PublicKey,string],[PublicKey,string]]=[[TOKEN_PROGRAM_ID,'spl_token-3.5.0.so'],[TOKEN_2022_PROGRAM_ID,'spl_token_2022-10.0.0.so'],[new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),'spl_associated_token_account-1.1.1.so']];
 const localProgramPaths=new Map<string,string>();
 if(source.splFixturePackage?.archiveSha256!=='6a6d4edace08253a908d301768f291a7115e8e19e13473dd6e1ace78d6366433')throw Error('Expected verified official SPL fixture package');
 for(const [,file] of fixturePrograms)if(digest(fs.readFileSync(path.join(ROOT,'target/meteora-official/spl-fixtures',file)))!==source.splFixturePackage.binaries[file])throw Error('SPL fixture checksum mismatch');
 if(final){
  for(const [name,program] of [['token',TOKEN_PROGRAM_ID],['token2022',TOKEN_2022_PROGRAM_ID],['ata',fixturePrograms[2][0]]] as const){
   const entry=preflight.publicSplPrograms?.[name],expectedPath=`target/robusto-final-public-programs/${name}.so`;
   if(entry?.program!==program.toBase58()||entry.path!==expectedPath||entry.source!=='OFFICIAL_PUBLIC_SOLANA_RPC_READONLY')throw Error('Verified public SPL snapshot required');
   const file=path.join(ROOT,expectedPath);if(digest(fs.readFileSync(file))!==entry.sha256)throw Error('Public SPL bytes changed');localProgramPaths.set(program.toBase58(),file);
  }
 }
 const args=['--config',cli,'--url',LOCAL_RPC,'--ledger',ledger,'--bind-address','127.0.0.1','--rpc-port','8899','--faucet-port','18900','--gossip-port','18901','--dynamic-port-range','18910-19010','--mint',pubs.payer,'--upgradeable-program',PROGRAM.toBase58(),binary,pubs.upgradeAuthority,'--account',metadataAddress.toBase58(),fixture,'--quiet'];
 for(const [program,file] of fixturePrograms)args.push('--upgradeable-program',program.toBase58(),localProgramPaths.get(program.toBase58())??path.join(ROOT,'target/meteora-official/spl-fixtures',file),pubs.upgradeAuthority);
 assert(!args.some(x=>/mainnet|devnet|clone|warp/.test(x)));
 const validator:ChildProcess=spawn('solana-test-validator',args,{cwd:base,env:{...process.env,NO_DNA:'1'},stdio:['ignore',validatorLog,validatorLog]});
 const rawRpc=async(method:'getHealth'|'getIdentity')=>{const r=await fetch(LOCAL_RPC,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params:[]}),redirect:'error'});const value=await r.json() as any;if(value.error)throw Error('Local RPC startup/identity unavailable');return value.result;};
 const connection=new Connection(LOCAL_RPC,{commitment:'confirmed',disableRetryOnRateLimit:true,fetch:async(url,init)=>{
  if(String(url)!==LOCAL_RPC)throw Error('Non-local HTTP request rejected');
  return fetch(LOCAL_RPC,{...init,redirect:'error'});
 }});
 let binding:LocalBinding|undefined,completed=false;
 const report:any={schema:1,status:'INCOMPLETE',authorization:'THIS_LOCAL_REHEARSAL_ONLY_EXPIRES_AT_COMPLETION',cluster:'localnet',rpcUrl:LOCAL_RPC,session,trialConversion:TRIAL,approval:config,officialSource:source,identities:pubs,transactions:[],snapshots:[],modelComparisons:[],negativeChecks:[],mainnet:false,devnet:false,publicRpc:false,realFunds:false};
 if(final){report.stage='FINAL_PREPRODUCTION_LOCAL_ONLY_NOT_MAINNET_APPROVED';report.readonlyPreflight=preflight;report.concentrationScenarios=[];}
 const publicDir=path.join(ROOT,'target',final?'robusto-final-meteora-runtime':'robusto-meteora-runtime');fs.mkdirSync(publicDir,{recursive:true});
 const save=()=>fs.writeFileSync(path.join(publicDir,'evidence.json'),JSON.stringify(report,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
 let minted=false,programBaseline='',genesisFile='',genesisFileHash='';
 const get=async(address:PublicKey)=>{const x=await connection.getAccountInfo(address,'confirmed');if(!x)throw Error('Expected local account missing');return x;};
 const authorities=async()=>{
  const meta=await get(metadataAddress);assert(meta.owner.equals(META));assert.equal(digest(meta.data),digest(metadataBytes));
  const [decoded]=getMetadataAccountDataSerializer().deserialize(meta.data);assert.equal(String(decoded.mint),pubs.mint);assert.equal(String(decoded.updateAuthority),pubs.metadataUpdateAuthority);assert.equal(decoded.isMutable,true);
  const program=await get(PROGRAM);assert(program.owner.equals(LOADER));assert(program.executable);assert.equal(program.data.readUInt32LE(0),2);
  const programData=await get(new PublicKey(program.data.subarray(4,36)));assert(programData.owner.equals(LOADER));assert.equal(programData.data.readUInt32LE(0),3);assert.equal(programData.data[12],1);assert.equal(new PublicKey(programData.data.subarray(13,45)).toBase58(),pubs.upgradeAuthority);
  assert(programData.data.subarray(45,45+expectedMeteoraBytes.length).equals(expectedMeteoraBytes));assert(!programData.data.subarray(45+expectedMeteoraBytes.length).some(x=>x!==0));
  if(final)for(const entry of Object.values(preflight.publicSplPrograms) as any[]){
   const p=await get(new PublicKey(entry.program));assert(p.owner.equals(LOADER));assert(p.executable);assert.equal(p.data.readUInt32LE(0),2);
   const d=await get(new PublicKey(p.data.subarray(4,36)));assert(d.owner.equals(LOADER));assert.equal(d.data.readUInt32LE(0),3);assert.equal(d.data[12],1);assert.equal(new PublicKey(d.data.subarray(13,45)).toBase58(),pubs.upgradeAuthority);assert.equal(digest(d.data.subarray(45)),entry.sha256);
  }
  const current=digest(programData.data);if(programBaseline)assert.equal(current,programBaseline);else programBaseline=current;
  const mint=await connection.getAccountInfo(keys.mint.publicKey);if(mint){const m=unpackMint(keys.mint.publicKey,mint,TOKEN_PROGRAM_ID);assert.equal(m.decimals,6);assert.equal(m.freezeAuthority,null);assert.equal(m.mintAuthority?.toBase58(),pubs.mintAuthority);assert.equal(m.supply,minted?1000000000000000n:0n);}
 };
 const guard=async(signers:Keypair[])=>{
  if(final)validateFinalPreflight(preflight);
  if(!binding||validator.exitCode!==null||validator.killed)throw Error('Expected local validator is not running');
  if(digest(fs.readFileSync(genesisFile))!==genesisFileHash)throw Error('Local genesis file changed');
  validateLocalBinding(binding,{genesisHash:await connection.getGenesisHash(),validatorIdentity:(await rawRpc('getIdentity')).identity},signers.map(x=>x.publicKey.toBase58()));
  await authorities();
 };
 const send=async(label:string,instructions:TransactionInstruction[],signers:Keypair[],after?:()=>void)=>{
  const all=Array.from(new Map([keys.payer,...signers].map(x=>[x.publicKey.toBase58(),x])).values());
  await guard(all);
  for(const ix of instructions){
   if(![SystemProgram.programId,TOKEN_PROGRAM_ID,new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),PROGRAM].some(x=>x.equals(ix.programId)))throw Error('Unexpected transaction program');
   if(ix.programId.equals(PROGRAM)&&![creationIdl.instructions[0],...runtimeIdl.instructions].some(x=>Buffer.from(x.discriminator).equals(ix.data.subarray(0,8))))throw Error('Non-allowlisted Meteora operation');
   if(ix.programId.equals(TOKEN_PROGRAM_ID)&&ix.data[0]!==17&&!(ix.data[0]===0&&label==='create_local_mint'&&ix.data[1]===6&&new PublicKey(ix.data.subarray(2,34)).equals(keys.mintAuthority.publicKey)&&ix.data[34]===0)&&!(ix.data[0]===3&&label==='fund_local_lp_rounding_dust'&&ix.data.readBigUInt64LE(1)===1000n)&&!(ix.data[0]===7&&label==='mint_exact_local_supply'&&!minted&&ix.data.readBigUInt64LE(1)===1000000000000000n))throw Error('SPL authority/unknown operation forbidden');
  }
  const block=await connection.getLatestBlockhash('confirmed');
  const tx=new Transaction({feePayer:keys.payer.publicKey,blockhash:block.blockhash,lastValidBlockHeight:block.lastValidBlockHeight}).add(ComputeBudgetProgram.setComputeUnitLimit({units:1400000}),...instructions);
  const unsigned=new VersionedTransaction(tx.compileMessage());
  const simulation=await connection.simulateTransaction(unsigned,{sigVerify:false,commitment:'confirmed'});
  if(simulation.value.err){report.transactions.push({label,status:'SIMULATION_REJECTED_NOT_SIGNED',error:simulation.value.err,logs:simulation.value.logs});save();throw Error(`Local simulation failed: ${label}`);}
  await guard(all); // Recheck genesis, identity, parameters and authorities immediately before signing.
  tx.sign(...all);
  const signature=await connection.sendRawTransaction(tx.serialize(),{skipPreflight:false,maxRetries:0});
  for(let tries=0;tries<100;tries++){const state=(await connection.getSignatureStatuses([signature])).value[0];if(state?.err)throw Error(`Local transaction rejected: ${label}`);if(state?.confirmationStatus==='confirmed'||state?.confirmationStatus==='finalized')break;if(tries===99)throw Error('Local confirmation timeout');await sleep(100);}
  if(after)after();await authorities();
  const feeInfo=final?await connection.getTransaction(signature,{commitment:'confirmed',maxSupportedTransactionVersion:0}):undefined;
  if(final)assert(feeInfo?.meta&&!feeInfo.meta.err);
  report.transactions.push({label,status:'CONFIRMED_LOCAL',signature,signers:all.map(x=>x.publicKey.toBase58()),simulationUnits:simulation.value.unitsConsumed,...(final?{networkFeeLamports:feeInfo!.meta!.fee}: {})});save();
  console.log(JSON.stringify({localOperation:label,status:'CONFIRMED_LOCAL'}));
  return signature;
 };
 try{
  for(let i=0;i<300;i++){if(validator.exitCode!==null)throw Error('Local validator exited during startup');try{if(await rawRpc('getHealth')==='ok')break;}catch{}if(i===299)throw Error('Local validator startup timeout');await sleep(200);}
  for(let i=0;await connection.getSlot('confirmed')<3;i++){if(i>100)throw Error('Local slots did not advance');await sleep(100);}
  const identityFile=path.join(ledger,'validator-keypair.json');
  const identity=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(identityFile,'utf8')))).publicKey.toBase58();
  genesisFile=['genesis.bin','genesis.tar.bz2'].map(x=>path.join(ledger,x)).find(x=>fs.existsSync(x))!;if(!genesisFile)throw Error('Temporary ledger genesis missing');genesisFileHash=digest(fs.readFileSync(genesisFile));
  binding={cluster:'localnet',rpcUrl:LOCAL_RPC,session,genesisHash:await connection.getGenesisHash(),validatorIdentity:identity,signers:Object.values(pubs),approvedParameters:config,quoteLabel:TRIAL.label,quote:TRIAL.solUsd,active:true};
  await guard([keys.payer]);report.genesisHash=binding.genesisHash;report.validatorIdentity=identity;report.genesisFileSha256=genesisFileHash;save();
  // Negative guards never sign or contact a different endpoint.
  for(const [name,patch] of Object.entries({cluster:{cluster:'mainnet-beta'},devnet:{cluster:'devnet'},rpc:{rpcUrl:'https://api.mainnet-beta.solana.com'},identity:{validatorIdentity:pubs.mint},genesis:{genesisHash:pubs.mint},quote:{quote:'99'},quantity:{approvedParameters:{...config,inventoryBaseUnits:'1000000000001'}},price:{approvedParameters:{...config,p0ReferenceUsd:'0.001'}},range:{approvedParameters:{...config,range:2}},inactive:{active:false}})){
   assert.throws(()=>validateLocalBinding({...binding!,...patch},{genesisHash:binding!.genesisHash,validatorIdentity:identity},[pubs.payer]));report.negativeChecks.push({name,rejectedBeforeSigning:true});
  }
  assert.throws(()=>privateLocalPath(ROOT,session,'../../.config/solana/id.json'));report.negativeChecks.push({name:'global_key_path',rejectedBeforeSigning:true});
  await send('create_local_mint',[SystemProgram.createAccount({fromPubkey:keys.payer.publicKey,newAccountPubkey:keys.mint.publicKey,space:MINT_SIZE,lamports:await connection.getMinimumBalanceForRentExemption(MINT_SIZE),programId:TOKEN_PROGRAM_ID}),createInitializeMintInstruction(keys.mint.publicKey,6,keys.mintAuthority.publicKey,null)],[keys.mint]);
  const ata=(mint:PublicKey,owner:Keypair)=>getAssociatedTokenAddressSync(mint,owner.publicKey);
  const ataIx=(mint:PublicKey,owner:Keypair)=>createAssociatedTokenAccountInstruction(keys.payer.publicKey,ata(mint,owner),owner.publicKey,mint);
  await send('create_payer_accounts',[ataIx(keys.mint.publicKey,keys.payer),ataIx(NATIVE_MINT,keys.payer),SystemProgram.transfer({fromPubkey:keys.payer.publicKey,toPubkey:ata(NATIVE_MINT,keys.payer),lamports:1000000000}),createSyncNativeInstruction(ata(NATIVE_MINT,keys.payer))],[]);
  await send('mint_exact_local_supply',[createMintToInstruction(keys.mint.publicKey,ata(keys.mint.publicKey,keys.payer),keys.mintAuthority.publicKey,1000000000000000n)],[keys.mintAuthority],()=>{minted=true;});
  for(const buyer of [keys.smallBuyer,keys.mediumBuyer,keys.boundaryBuyer,keys.positionOwner])await send('create_fund_local_participant_accounts',[SystemProgram.transfer({fromPubkey:keys.payer.publicKey,toPubkey:buyer.publicKey,lamports:10000000}),ataIx(keys.mint.publicKey,buyer),ataIx(NATIVE_MINT,buyer),SystemProgram.transfer({fromPubkey:keys.payer.publicKey,toPubkey:ata(NATIVE_MINT,buyer),lamports:30000000000}),createSyncNativeInstruction(ata(NATIVE_MINT,buyer))],[]);
  await send('fund_local_lp_rounding_dust',[createTransferInstruction(ata(keys.mint.publicKey,keys.payer),ata(keys.mint.publicKey,keys.positionOwner),keys.payer.publicKey,1000n)],[]);
  const mintInfo=await get(keys.mint.publicKey);
  const input:LocalInput={cluster:'localnet',rpcUrl:LOCAL_RPC,identityScope:'ISOLATED_LOCAL_REHEARSAL',expectedMint:pubs.mint,tokenA:pubs.mint,tokenB:NATIVE_MINT.toBase58(),positionNftMint:pubs.nft,payer:pubs.payer,positionOwner:pubs.positionOwner,mintAuthority:pubs.mintAuthority,metadataUpdateAuthority:pubs.metadataUpdateAuthority,upgradeAuthority:pubs.upgradeAuthority,mintAccount:{owner:mintInfo.owner.toBase58(),dataBase64:mintInfo.data.toString('base64')},metadataSnapshot:{mint:pubs.mint,updateAuthority:pubs.metadataUpdateAuthority,isMutable:true},solUsdTrialQuote:TRIAL.solUsd,slippageBps:TRIAL.slippageBps,fixedFeeBps:TRIAL.fixedFeeBps,permanentLock:false,vestingLock:false,revokeMintAuthority:false};
  const prepared=prepareMeteoraLocal(input);report.preparedParameters=prepared.parameters;
  for(const [name,patch] of Object.entries({mint:{tokenA:pubs.nft},authority:{mintAuthority:pubs.smallBuyer},metadata_authority:{metadataSnapshot:{...input.metadataSnapshot,updateAuthority:pubs.smallBuyer}},lock:{permanentLock:true},revocation:{revokeMintAuthority:true},...(final?{token_order:{tokenA:NATIVE_MINT.toBase58(),tokenB:pubs.mint},metadata_revocation:{revokeMetadataAuthority:true},slippage:{slippageBps:101},wrong_signer:{payer:pubs.positionOwner}}:{})})){assert.throws(()=>prepareMeteoraLocal({...input,...patch}));report.negativeChecks.push({name,rejectedBeforeSigning:true});}
  const creation=new TransactionInstruction({programId:PROGRAM,keys:prepared.instruction.accounts.map(x=>({pubkey:new PublicKey(x.address),isSigner:x.isSigner,isWritable:x.isWritable})),data:Buffer.from(prepared.instruction.dataBase64,'base64')});
  const accounts=Object.fromEntries(creationIdl.instructions[0].accounts.map((a,i)=>[a.name,creation.keys[i].pubkey]));
  const poolAddress=accounts.pool,positionAddress=accounts.position;
  const tokenAccount=async(address:PublicKey,program=TOKEN_PROGRAM_ID)=>unpackAccount(address,await get(address),program);
  const snapshot=async(label:string)=>{
   await authorities();const poolInfo=await get(poolAddress),positionInfo=await get(positionAddress);assert(poolInfo.owner.equals(PROGRAM));assert(positionInfo.owner.equals(PROGRAM));
   const pool:any=accountCoder.decode('Pool',poolInfo.data),position:any=accountCoder.decode('Position',positionInfo.data);
   assert.equal(pool.token_a_mint.toBase58(),pubs.mint);assert.equal(pool.token_b_mint.toBase58(),NATIVE_MINT.toBase58());assert.equal(pool.creator.toBase58(),pubs.positionOwner);
   assert.equal(bigint(pool.sqrt_min_price).toString(),prepared.parameters.sqrtMinPrice);assert.equal(bigint(pool.sqrt_max_price).toString(),prepared.parameters.sqrtMaxPrice);assert.equal(pool.collect_fee_mode,1);
   if(final){assert.equal(pool.pool_fees.dynamic_fee.initialized,0);assert.equal(pool.pool_fees.compounding_fee_bps,0);assert.equal(Buffer.from(pool.pool_fees.base_fee.base_fee_info.data).readBigUInt64LE(0),2500000n);}
   assert.equal(bigint(pool.permanent_lock_liquidity),0n);assert.equal(bigint(position.permanent_locked_liquidity),0n);assert.equal(bigint(position.vested_liquidity),0n);assert.equal(position.delegate_permission,0);
   assert.equal(position.pool.toBase58(),poolAddress.toBase58());assert.equal(position.nft_mint.toBase58(),pubs.nft);
   const nft=await tokenAccount(accounts.position_nft_account,TOKEN_2022_PROGRAM_ID);assert.equal(nft.amount,1n);assert(nft.owner.equals(keys.positionOwner.publicKey));assert.equal(nft.delegate,null);
   const balances:any={};let total=0n;
   for(const role of ['payer','positionOwner','smallBuyer','mediumBuyer','boundaryBuyer'] as const){const a=await tokenAccount(ata(keys.mint.publicKey,keys[role])),b=await tokenAccount(ata(NATIVE_MINT,keys[role]));balances[role]={robusto:a.amount.toString(),wrappedSol:b.amount.toString()};total+=a.amount;}
   const aVault=await tokenAccount(accounts.token_a_vault),bVault=await tokenAccount(accounts.token_b_vault);total+=aVault.amount;assert.equal(total,1000000000000000n);
   const wrappedTotal=Object.values(balances).reduce((n:bigint,v:any)=>n+BigInt(v.wrappedSol),bVault.amount);assert.equal(wrappedTotal,121000000000n);
   assert(aVault.mint.equals(keys.mint.publicKey));assert(bVault.mint.equals(NATIVE_MINT));assert(aVault.owner.equals(accounts.pool_authority));assert(bVault.owner.equals(accounts.pool_authority));
   const state={label,sqrtPrice:bigint(pool.sqrt_price).toString(),liquidity:bigint(pool.liquidity).toString(),unlockedLiquidity:bigint(position.unlocked_liquidity).toString(),protocolBFee:bigint(pool.protocol_b_fee).toString(),vaultA:aVault.amount.toString(),vaultB:bVault.amount.toString(),balances,conservedRobustoBaseUnits:total.toString(),conservedWrappedSolLamports:wrappedTotal.toString(),...(final?{protocolFeePercent:pool.pool_fees.protocol_fee_percent,positionPendingBFee:bigint(position.fee_b_pending).toString()}: {})};report.snapshots.push(state);save();return state;
  };
  await send('initialize_local_unilateral_pool',[creation],[keys.nft]);
  const start=await snapshot('initial_unilateral');assert.equal(start.vaultA,'1000000000000');assert.equal(start.vaultB,'1');assert.equal(start.unlockedLiquidity,prepared.parameters.liquidity);assert.equal(start.sqrtPrice,prepared.parameters.sqrtMinPrice);
  const common={pool_authority:accounts.pool_authority,pool:poolAddress,token_a_vault:accounts.token_a_vault,token_b_vault:accounts.token_b_vault,token_a_mint:keys.mint.publicKey,token_b_mint:NATIVE_MINT,token_a_program:TOKEN_PROGRAM_ID,token_b_program:TOKEN_PROGRAM_ID,event_authority:accounts.event_authority,program:PROGRAM};
  let state=start;
  const swap=async(label:string,buyer:Keypair,amount:bigint,buy:boolean,partial=false)=>{
   const before=state,model=modelSwap(BigInt(before.liquidity),BigInt(before.sqrtPrice),BigInt(prepared.parameters.sqrtMinPrice),BigInt(prepared.parameters.sqrtMaxPrice),amount,buy,partial);
   const minimum=model.out*BigInt(10000-TRIAL.slippageBps)/10000n;
   const ix=encode('swap2',{_params:{amount_0:bn(amount),amount_1:bn(minimum),swap_mode:partial?1:0}},{...common,payer:buyer.publicKey,input_token_account:ata(buy?NATIVE_MINT:keys.mint.publicKey,buyer),output_token_account:ata(buy?keys.mint.publicKey:NATIVE_MINT,buyer)});
   await send(label,[ix],[buyer]);state=await snapshot(label);
   const role=names.find(n=>keys[n]===buyer)!;
   const actualOut=BigInt(state.balances[role][buy?'robusto':'wrappedSol'])-BigInt(before.balances[role][buy?'robusto':'wrappedSol']);
   const actualUsed=BigInt(before.balances[role][buy?'wrappedSol':'robusto'])-BigInt(state.balances[role][buy?'wrappedSol':'robusto']);
   const sqrtDiff=BigInt(state.sqrtPrice)-model.next,outDiff=actualOut-model.out;
   if(final){
    const protocolDelta=BigInt(state.protocolBFee)-BigInt(before.protocolBFee);
    assert.equal(protocolDelta,model.fee*BigInt(state.protocolFeePercent!)/100n);
    const float=continuousSwap(BigInt(before.liquidity),BigInt(before.sqrtPrice),actualUsed,buy);
    report.economicComparisons??=[];
    report.economicComparisons.push({label,continuousOutputBaseUnits:float.out,actualOutputBaseUnits:actualOut.toString(),outputDeltaBaseUnits:Number(actualOut)-float.out,
      continuousPriceMovementPercent:float.priceMovementPercent,actualPriceMovementPercent:(Number(state.sqrtPrice)**2/Number(before.sqrtPrice)**2-1)*100,
      fixedFeeLamports:model.fee.toString(),protocolFeeLamports:protocolDelta.toString(),lpFeeLamports:(model.fee-protocolDelta).toString(),testOnlySolUsd:TRIAL.solUsd});
   }
   assert(actualOut>=minimum);assert(actualUsed<=amount);assert(actualUsed-model.used>=-2n&&actualUsed-model.used<=2n,'Input rounding mismatch');assert(sqrtDiff>=-1n&&sqrtDiff<=1n,'Q64 sqrt mismatch');assert(outDiff>=-2n&&outDiff<=2n,'Output rounding mismatch');
   // Global wrapped SOL conservation excludes transaction fees paid in native SOL.
   const beforeB=Object.values(before.balances).reduce((n:bigint,v:any)=>n+BigInt(v.wrappedSol),BigInt(before.vaultB));
   const afterB=Object.values(state.balances).reduce((n:bigint,v:any)=>n+BigInt(v.wrappedSol),BigInt(state.vaultB));assert.equal(afterB,beforeB);
   report.modelComparisons.push({label,direction:buy?'SOL_TO_ROBUSTO':'ROBUSTO_TO_SOL',requestedInput:amount.toString(),model,actualInput:actualUsed.toString(),actualOutput:actualOut.toString(),sqrtDifference:sqrtDiff.toString(),outputDifferenceBaseUnits:outDiff.toString(),minimumOutput:minimum.toString(),wrappedSolConserved:true});save();
  };
  if(final){
   const probeRejected=async(label:string,ix:TransactionInstruction,expectedCode?:number)=>{
    await guard([keys.payer]);const before=await snapshot('before_negative_'+label);
    const block=await connection.getLatestBlockhash();const probe=new Transaction({feePayer:keys.payer.publicKey,recentBlockhash:block.blockhash}).add(ComputeBudgetProgram.setComputeUnitLimit({units:1400000}),ix);
    const simulation=await connection.simulateTransaction(new VersionedTransaction(probe.compileMessage()),{sigVerify:false});assert(simulation.value.err,'Adversarial instruction unexpectedly succeeded');
    if(expectedCode!==undefined)assert.equal((simulation.value.err as any).InstructionError?.[1]?.Custom,expectedCode);
    const after=await snapshot('after_negative_'+label);assert.deepEqual({...after,label:''},{...before,label:''});
    report.negativeChecks.push({name:label,simulatedLocally:true,rejectedWithoutSigning:true,error:simulation.value.err,logs:simulation.value.logs,balancesUnchanged:true});save();
   };
   const goodAccounts={...common,payer:keys.smallBuyer.publicKey,input_token_account:ata(NATIVE_MINT,keys.smallBuyer),output_token_account:ata(keys.mint.publicKey,keys.smallBuyer)};
   await probeRejected('unacceptable_min_out',encode('swap2',{_params:{amount_0:bn(10000000n),amount_1:bn(1000000000000n),swap_mode:0}},goodAccounts),6002);
   await probeRejected('wrong_mint_protocol',encode('swap2',{_params:{amount_0:bn(10000000n),amount_1:bn(1n),swap_mode:0}},{...goodAccounts,token_a_mint:NATIVE_MINT}),2014);
   await probeRejected('wrong_signer_protocol',encode('swap2',{_params:{amount_0:bn(10000000n),amount_1:bn(1n),swap_mode:0}},{...goodAccounts,payer:keys.mediumBuyer.publicKey}),4);
   await probeRejected('wrong_position_custodian',encode('remove_liquidity',{params:{liquidity_delta:bn(BigInt(start.liquidity)/100n),token_a_amount_threshold:bn(0n),token_b_amount_threshold:bn(0n)}},
    {...common,position:positionAddress,position_nft_account:accounts.position_nft_account,signer:keys.mediumBuyer.publicKey,token_a_account:ata(keys.mint.publicKey,keys.positionOwner),token_b_account:ata(NATIVE_MINT,keys.positionOwner)}));
   assert.throws(()=>encode('permanent_lock_position',{},common));report.negativeChecks.push({name:'non_allowlisted_lock_instruction',rejectedBeforeSigning:true});
   const ceil=(n:bigint,d:bigint)=>(n+d-1n)/d,L=BigInt(start.liquidity),lo=BigInt(start.sqrtPrice),N=1000000000000n;
   for(const percent of [25,50,90]){
    const target=N*BigInt(percent)/100n,next=ceil(L*lo,L-target*lo),net=ceil(L*(next-BigInt(state.sqrtPrice)),1n<<128n),gross=ceil(net*10000n,9975n);
    await swap(`one_wallet_concentrates_${percent}_percent`,keys.boundaryBuyer,gross,true);
    const owned=BigInt(state.balances.boundaryBuyer.robusto),spent=BigInt(start.balances.boundaryBuyer.wrappedSol)-BigInt(state.balances.boundaryBuyer.wrappedSol);
    const quantizationBound=concentrationBaseUnitTolerance(lo);
    assert(owned>=target-2n&&owned<=target+quantizationBound,'Concentration target rounding exceeds quote-lamport bound');
    const actualUsd=Number(spent)/1e9*Number(TRIAL.solUsd),modelNet=concentrationCostUsd(percent/100),modelGross=modelNet/0.9975;
    assert(Math.abs(actualUsd-modelGross)<0.000001,'Economic concentration comparison mismatch');
    report.concentrationScenarios.push({targetPercent:percent,ownedBaseUnits:owned.toString(),targetOvershootBaseUnits:(owned-target).toString(),quantizationBoundBaseUnits:quantizationBound.toString(),actualInventoryPercent:Number(owned)/Number(N)*100,actualGrossCostTestUsd:actualUsd,
      continuousNetCostTestUsd:modelNet,continuousGrossCostTestUsd:modelGross,costDeltaTestUsd:actualUsd-modelGross,relativeToTotalSupplyPercent:Number(owned)/1e15*100});save();
   }
   await swap('concentrating_wallet_sells_all',keys.boundaryBuyer,BigInt(state.balances.boundaryBuyer.robusto),false);
   assert.equal(state.balances.boundaryBuyer.robusto,'0');
   await swap('buy_small_test_only_usd_1',keys.smallBuyer,10000000n,true);
  }
  await swap('buy_small_test_only_usd_5',keys.smallBuyer,50000000n,true);
  if(final){await swap('buy_sequential_test_only_usd_10',keys.mediumBuyer,100000000n,true);await swap('buy_sequential_test_only_usd_25',keys.boundaryBuyer,250000000n,true);await swap('buy_sequential_test_only_usd_50',keys.mediumBuyer,500000000n,true);}
  await swap('buy_medium_test_only_usd_100',keys.mediumBuyer,1000000000n,true);
  await swap('sell_half_small_buyer',keys.smallBuyer,BigInt(state.balances.smallBuyer.robusto)/2n,false);
  if(final){const previousBuy=report.economicComparisons.filter((x:any)=>x.label.startsWith('buy_small'));report.earlyBuyer={salesAfterLaterBuyers:true,purchases:previousBuy.map((x:any)=>x.label),remainingRobustoBaseUnits:state.balances.smallBuyer.robusto,netWrappedSolChangeLamports:(BigInt(state.balances.smallBuyer.wrappedSol)-BigInt(start.balances.smallBuyer.wrappedSol)).toString(),interpretation:'Local synthetic sequence only; no predicted return or demand'};}
  const near=(BigInt(prepared.parameters.sqrtMinPrice)+(BigInt(prepared.parameters.sqrtMaxPrice)-BigInt(prepared.parameters.sqrtMinPrice))*99n/100n);
  const net=(BigInt(state.liquidity)*(near-BigInt(state.sqrtPrice))+(1n<<128n)-1n)>>128n;
  await swap('buy_near_upper_range',keys.boundaryBuyer,(net*10000n+9974n)/9975n,true);
  await swap('buy_partial_fill_to_upper_range',keys.boundaryBuyer,1000000000n,true,true);
  assert.equal(state.sqrtPrice,prepared.parameters.sqrtMaxPrice);
  const atLimit={...state};
  await assert.rejects(()=>swap('buy_beyond_upper_limit',keys.boundaryBuyer,10000000n,true),/Range exceeded/);report.negativeChecks.push({name:'buy_above_range',rejectedBeforeSigning:true});
  // Exercise protocol rejection too: simulate at upper bound; no signature/send.
  const denied=encode('swap2',{_params:{amount_0:bn(10000000n),amount_1:bn(1n),swap_mode:0}},{...common,payer:keys.boundaryBuyer.publicKey,input_token_account:ata(NATIVE_MINT,keys.boundaryBuyer),output_token_account:ata(keys.mint.publicKey,keys.boundaryBuyer)});
  await guard([keys.boundaryBuyer]);const block=await connection.getLatestBlockhash();const probe=new Transaction({feePayer:keys.payer.publicKey,recentBlockhash:block.blockhash}).add(denied);
  const rejected=await connection.simulateTransaction(new VersionedTransaction(probe.compileMessage()),{sigVerify:false});assert(rejected.value.err);report.negativeChecks.push({name:'protocol_upper_limit',simulatedLocally:true,rejectedWithoutSigning:true,error:rejected.value.err});
  await swap('sell_after_upper_limit',keys.boundaryBuyer,BigInt(atLimit.balances.boundaryBuyer.robusto)/10n,false);
  if(final){assert(BigInt(state.sqrtPrice)<BigInt(prepared.parameters.sqrtMaxPrice));await swap('buy_after_sale_reopens_capacity',keys.smallBuyer,10000000n,true);}
  const beforeWithdrawal=state,delta=BigInt(state.unlockedLiquidity)/10n,sqrt=BigInt(state.sqrtPrice),lo=BigInt(prepared.parameters.sqrtMinPrice),hi=BigInt(prepared.parameters.sqrtMaxPrice);
  const expectedA=delta*(hi-sqrt)/(sqrt*hi),expectedB=(delta*(sqrt-lo))>>128n;
  const lpAccounts={...common,position:positionAddress,position_nft_account:accounts.position_nft_account,signer:keys.positionOwner.publicKey,token_a_account:ata(keys.mint.publicKey,keys.positionOwner),token_b_account:ata(NATIVE_MINT,keys.positionOwner)};
  await send('withdraw_ten_percent_unlocked_local_liquidity',[encode('remove_liquidity',{params:{liquidity_delta:bn(delta),token_a_amount_threshold:bn(expectedA*9950n/10000n),token_b_amount_threshold:bn(expectedB*9950n/10000n)}},lpAccounts)],[keys.positionOwner]);state=await snapshot('after_partial_withdrawal');
  assert.equal(BigInt(state.unlockedLiquidity),BigInt(beforeWithdrawal.unlockedLiquidity)-delta);assert.equal(state.sqrtPrice,beforeWithdrawal.sqrtPrice);assert.equal(BigInt(state.balances.positionOwner.robusto)-BigInt(beforeWithdrawal.balances.positionOwner.robusto),expectedA);assert.equal(BigInt(state.balances.positionOwner.wrappedSol)-BigInt(beforeWithdrawal.balances.positionOwner.wrappedSol),expectedB);
  const beforeAddition=state,ceil=(n:bigint,d:bigint)=>(n+d-1n)/d;
  const maxA=ceil(delta*(hi-sqrt),sqrt*hi),maxB=ceil(delta*(sqrt-lo),1n<<128n);
  await send('redeposit_withdrawn_local_liquidity',[encode('add_liquidity',{params:{liquidity_delta:bn(delta),token_a_amount_threshold:bn(maxA),token_b_amount_threshold:bn(maxB)}},lpAccounts)],[keys.positionOwner]);state=await snapshot('after_local_redeposit');assert.equal(state.unlockedLiquidity,beforeWithdrawal.unlockedLiquidity);assert.equal(state.sqrtPrice,beforeAddition.sqrtPrice);
  report.liquidityRoundTrip={withdrawnLiquidity:delta.toString(),withdrawnA:expectedA.toString(),withdrawnB:expectedB.toString(),redepositedA:maxA.toString(),redepositedB:maxB.toString(),roundingCostA:(maxA-expectedA).toString(),roundingCostB:(maxB-expectedB).toString()};
  report.authorities={mintAuthorityUnchanged:true,metadataUpdateAuthorityUnchanged:true,metadataMutable:true,programUpgradeAuthorityUnchanged:true,positionOwnerUnchanged:true,permanentLock:false,vestingLock:false};
  report.metadataVerification='REAL_LOCAL_GENESIS_ACCOUNT_FIXTURE_NOT_METADATA_PROGRAM_EXECUTION';
  report.status='PASSED_LOCAL_RUNTIME';completed=true;save();console.log(JSON.stringify({status:report.status,localTransactions:report.transactions.filter((x:any)=>x.status==='CONFIRMED_LOCAL').length,evidence:path.relative(ROOT,path.join(publicDir,'evidence.json'))}));
 }catch(error){report.failure={message:error instanceof Error?error.message.slice(0,1000):'Local runtime failure'};throw error;}finally{
  if(binding)binding.active=false;report.authorizationExpired=true;
  validator.kill('SIGTERM');await new Promise<void>(resolve=>{if(validator.exitCode!==null)return resolve();const timer=setTimeout(()=>{validator.kill('SIGKILL');resolve();},5000);validator.once('exit',()=>{clearTimeout(timer);resolve();});});fs.closeSync(validatorLog);
  for(const k of Object.values(keys))k.secretKey.fill(0);process.umask(previousMask);report.validatorStopped=true;report.status=completed?'PASSED_LOCAL_RUNTIME':'FAILED_LOCAL_RUNTIME';save();
 }
 return report;
}
if(require.main===module){const args=process.argv.slice(2);if(args.length!==1||(args[0]!=='--authorize-local-rehearsal'&&args[0]!=='--authorize-final-local-rehearsal')){console.error('Use an explicit local rehearsal authorization flag only with owner authorization for this run.');process.exitCode=1;}else runLocalRehearsal(true,args[0]==='--authorize-final-local-rehearsal').catch((error:Error)=>{console.error('Local rehearsal failed: '+error.message.slice(0,500));process.exitCode=1;});}
