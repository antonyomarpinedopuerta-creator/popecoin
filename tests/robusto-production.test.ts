import {pngFixture,pngChunk} from './png-fixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Keypair,PublicKey,Transaction,SystemProgram} from '@solana/web3.js';
import {decodeMintToCheckedInstruction,decodeTransferCheckedInstruction,decodeInitializeMint2Instruction} from '@solana/spl-token';
import {getCreateV1InstructionDataSerializer,getUpdateV1InstructionDataSerializer} from '@metaplex-foundation/mpl-token-metadata';
import {MAINNET_GENESIS,SUPPLY,integer,validateDistribution,validateProduction,buildProductionSteps,metadataInstructions,
 requireMainnetReadOnly,assertMainnet,quoteSteps,reconcileDistribution,prepareMintRevocation,verifyProgramAccounts} from '../scripts/robusto-production';
import {pinThirdPlan} from '../scripts/robusto-third-status';
import {LOADER} from '../scripts/rehearsal-one-tx';
const key=()=>Keypair.generate().publicKey.toBase58();
function fixture(){const p={...JSON.parse(fs.readFileSync('config/robusto-production.json','utf8')),
 payer:key(),mint:key(),program:key(),mintAuthority:key(),metadataUpdateAuthority:key(),upgradeAuthority:key(),
 imageSha256:'a'.repeat(64),metadataSha256:'b'.repeat(64),metadataUri:`ar://${'A'.repeat(43)}`,
 startUtc:'2027-01-01T00:00:00Z',
 allocations:[{label:'market_ecosystem_launch',beneficiary:key(),basisPoints:5000,baseUnits:'500000000000000'},
 {label:'community_marketing',beneficiary:key(),basisPoints:1500,baseUnits:'150000000000000'},
 {label:'reserve',beneficiary:key(),basisPoints:3000,baseUnits:'300000000000000',vesting:{start:'1814313600',cliff:'1814313600',end:'1908921600'}},
 {label:'team_founder',beneficiary:key(),basisPoints:500,baseUnits:'50000000000000',vesting:{start:'1830297600',cliff:'1830297600',end:'1893369600'}}]};
 p.distributionSourceOwner=p.allocations[0].beneficiary;
 const idl={...JSON.parse(fs.readFileSync('target/idl/popecoin_vesting.json','utf8')),address:p.program};return {p,idl};}
test('ROBUSTO distribution requires independent exact percentage and base-unit totals',()=>{
 const {p}=fixture();assert.equal(validateDistribution(p.allocations).length,4);
 for(const patch of [{basisPoints:2999},{baseUnits:'300000000000001'},{baseUnits:300000000000000},{baseUnits:'0300000000000000'},{basisPoints:30.5},{basisPoints:0},{beneficiary:p.allocations[1].beneficiary},{vesting:{start:'10',cliff:'9',end:'20'}}])assert.throws(()=>validateDistribution([{...p.allocations[0],...patch},p.allocations[1]]));
 assert.throws(()=>validateDistribution([p.allocations[0]]));assert.throws(()=>validateDistribution(null));
 for(const v of ['-1','1e15','0x10','18446744073709551616',1,null])assert.throws(()=>integer(v));
});
test('production rejects role reuse, pending config, historical identities and accidental enabling',()=>{
 const {p}=fixture();validateProduction(p);
 for(const patch of [{mainnetMode:'MAINNET_ENABLED'},{mainnetAuthorized:true},{distributionStatus:'APPROVED'},{mint:p.payer},{upgradeAuthority:p.mintAuthority},{mint:'CfHGrav3zjZyAEdspKwdBGW3yBHYkiz6cYpeeQXoujvo'},
  {distributionSourceOwner:p.mintAuthority},{distributionSourceOwner:key()},{secretKey:'must-not-appear'},{custody:{privateKey:'must-not-appear'}},
  {allocations:p.allocations.map((a:any)=>a.label==='community_marketing'?{...a,beneficiary:'ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw'}:a)},
  {allocations:p.allocations.map((a:any)=>a.label==='market_ecosystem_launch'?{...a,baseUnits:'500000000000001'}:a)},
  {allocations:p.allocations.map((a:any)=>a.label==='reserve'?{...a,vesting:{...a.vesting,end:'1908921601'}}:a)},
  {allocations:p.allocations.map((a:any)=>a.label==='team_founder'?{...a,vesting:{start:'1830297601',cliff:'1830297601',end:'1893369601'}}:a)}])assert.throws(()=>validateProduction({...p,...patch}));
 assert.throws(()=>validateProduction(JSON.parse(fs.readFileSync('config/robusto-production.json','utf8'))),/pending/);
});
test('unsigned production instructions encode exact supply, ATA, distribution and signed vesting ABI',()=>{
 const {p,idl}=fixture();const steps=buildProductionSteps(p,idl,1461600);
 assert.equal(steps.length,12);
 const init=decodeInitializeMint2Instruction(steps[0].instructions[1]);assert.equal(init.data.decimals,6);assert.equal(init.data.freezeAuthority,null);
 assert.equal(decodeMintToCheckedInstruction(steps[2].instructions[0]).data.amount,SUPPLY);
 assert.equal(decodeTransferCheckedInstruction(steps[4].instructions[0]).data.amount,150000000000000n);
 const vesting=steps.find(s=>s.label==='initialize-reserve')!.instructions[0];
 assert.deepEqual(vesting.keys.filter(k=>k.isSigner).map(k=>k.pubkey.toBase58()),[p.payer,p.distributionSourceOwner,p.allocations[2].beneficiary]);
 assert.equal(vesting.data.readBigUInt64LE(8),300000000000000n);
 assert.equal(vesting.data.readBigInt64LE(16),1814313600n);
 const mintSteps=steps.filter(s=>s.kind==='mintTo');assert.equal(mintSteps.length,1);
 assert.equal(mintSteps[0].instructions[0].keys[2].pubkey.toBase58(),p.mintAuthority);
 assert.equal(mintSteps[0].instructions[0].keys[1].pubkey.toBase58(),getAssociatedTokenAddressSync(new PublicKey(p.mint),new PublicKey(p.distributionSourceOwner)).toBase58());
 assert.notEqual(p.mintAuthority,p.distributionSourceOwner);
 for(const s of steps.filter(v=>['transfer','deposit'].includes(v.kind)))assert(s.instructions[0].keys.some(k=>k.isSigner&&k.pubkey.toBase58()===p.distributionSourceOwner));
 assert(!steps.some(s=>s.instructions.some(ix=>ix.keys.some(k=>k.pubkey.toBase58()===p.mintAuthority)&&['transfer','deposit'].includes(s.kind))));
 for(const step of steps){const tx=new Transaction({feePayer:new PublicKey(p.payer),recentBlockhash:PublicKey.default.toBase58()}).add(...step.instructions);
  const roundtrip=Transaction.from(tx.serialize({requireAllSignatures:false,verifySignatures:false}));assert(roundtrip.signatures.every(s=>s.signature===null));}
 assert.throws(()=>buildProductionSteps(p,{...idl,address:key()},1461600),/identity/);
 assert.throws(()=>buildProductionSteps(p,idl,0),/rent/);
 assert(!steps.some(s=>/revoke|immutable/.test(s.label)));
});
test('metadata creation/update preserve distinct authority, fungible standard and mutability',()=>{
 const {p}=fixture();
 const [create]=metadataInstructions(p);const [c]=getCreateV1InstructionDataSerializer().deserialize(create.data);
 assert.equal(c.isMutable,true);assert.equal(c.tokenStandard,2);assert.equal(c.name,'ROBUSTO');
 assert(create.keys.some(k=>k.pubkey.toBase58()===p.metadataUpdateAuthority));
 const [update]=metadataInstructions(p,true);const [u]=getUpdateV1InstructionDataSerializer().deserialize(update.data);
 assert.deepEqual(u.isMutable,{__option:'Some',value:true});assert.deepEqual(u.newUpdateAuthority,{__option:'None'});
 assert(update.keys.some(k=>k.isSigner&&k.pubkey.toBase58()===p.metadataUpdateAuthority));
 assert.throws(()=>metadataInstructions({...p,metadataUri:'https://placeholder.invalid/metadata.json'}));
});
test('Mainnet guard denies defaults before RPC; fees unknown fail closed',async()=>{
 const network={mainnetMode:'MAINNET_DISABLED',cluster:'mainnet-beta',rpc:'https://api.mainnet-beta.solana.com'};
 assert.throws(()=>requireMainnetReadOnly(network,undefined),/MAINNET_DISABLED/);
 requireMainnetReadOnly(network,`READ_ONLY:${MAINNET_GENESIS}`);
 assert.throws(()=>requireMainnetReadOnly({...network,rpc:'https://user:password@host/'},`READ_ONLY:${MAINNET_GENESIS}`));
 await assert.rejects(assertMainnet({getGenesisHash:async()=>'wrong'}),/genesis/);
 const {p,idl}=fixture();const steps=buildProductionSteps(p,idl,1461600);
 const c={rpcEndpoint:network.rpc,getGenesisHash:async()=>MAINNET_GENESIS,getAccountInfo:async()=>({owner:SystemProgram.programId,data:Buffer.alloc(0),executable:false,lamports:100000000}),
  getLatestBlockhash:async()=>({blockhash:PublicKey.default.toBase58(),lastValidBlockHeight:100}),getMinimumBalanceForRentExemption:async(n:number)=>n*10000,getFeeForMessage:async()=>({value:5000})} as any;
 const q=await quoteSteps(c,p,steps,network,`READ_ONLY:${MAINNET_GENESIS}`);assert.equal(q.knownCostsCovered,true);assert.equal(q.completeBudget,false);
 await assert.rejects(quoteSteps(c,p,steps),/MAINNET_DISABLED/);
 await assert.rejects(quoteSteps({...c,getFeeForMessage:async()=>({value:null})},p,steps,network,`READ_ONLY:${MAINNET_GENESIS}`),/fee/);
});
test('initial reconciliation detects shortfall, beneficiary swaps and missing/duplicate entries',()=>{
 const {p}=fixture();const snapshot={supply:SUPPLY.toString(),source:'500000000000000',sourceOwner:p.distributionSourceOwner,decimals:6,freezeAuthority:null,mintAuthority:p.mintAuthority,
 allocations:p.allocations.map((a:any)=>a.vesting?{label:a.label,beneficiary:a.beneficiary,balance:'0',total:a.baseUnits,released:'0',vault:a.baseUnits,...a.vesting}:{label:a.label,beneficiary:a.beneficiary,balance:a.baseUnits})};
 assert.equal(reconcileDistribution(p,snapshot).status,'INITIAL_DISTRIBUTION_RECONCILED');
 for(const patch of [{supply:'1000000000'},{source:'1'},{sourceOwner:p.mintAuthority},{freezeAuthority:key()},{mintAuthority:null},{allocations:[snapshot.allocations[0],snapshot.allocations[0]]}])assert.throws(()=>reconcileDistribution(p,{...snapshot,...patch}));
 assert.throws(()=>reconcileDistribution(p,{...snapshot,allocations:[{...snapshot.allocations[0],balance:'1'},snapshot.allocations[1]]}));
 assert.throws(()=>prepareMintRevocation(p,undefined,'INITIAL_DISTRIBUTION_RECONCILED'),/Separate/);
});
test('program verification pins loader linkage, upgrade authority and exact ELF',()=>{
 const {p}=fixture();const elf=Buffer.from('synthetic ELF fixture');p.programElfSha256=require('node:crypto').createHash('sha256').update(elf).digest('hex');
 const [pd]=PublicKey.findProgramAddressSync([new PublicKey(p.program).toBuffer()],LOADER);
 const data=Buffer.alloc(45+elf.length+10);data.writeUInt32LE(3);data[12]=1;new PublicKey(p.upgradeAuthority).toBuffer().copy(data,13);elf.copy(data,45);
 const link=Buffer.alloc(36);link.writeUInt32LE(2);pd.toBuffer().copy(link,4);
 const program={owner:LOADER,executable:true,data:link},programData={owner:LOADER,executable:false,data};
 assert.equal(verifyProgramAccounts(program,programData,p,elf).elfSha256,p.programElfSha256);
 data[data.length-1]=1;assert.throws(()=>verifyProgramAccounts(program,programData,p,elf),/padding/);data[data.length-1]=0;
 data[12]=0;assert.throws(()=>verifyProgramAccounts(program,programData,p,elf),/authority/);
});
test('third rehearsal frozen schedule cannot be retimed by config',()=>{
 const p=JSON.parse(fs.readFileSync('config/robusto-rehearsal-3.json','utf8'));pinThirdPlan(p);
 for(const patch of [{startUtc:null},{startUtc:'2026-10-05T00:00:00Z'},{cliffSeconds:0},{durationSeconds:10},{mintAdditionalTokens:true}])assert.throws(()=>pinThirdPlan({...p,...patch}));
});

import {buildProgramDeployment,verifyProductionBuffer} from '../scripts/robusto-program-deployment';
import {publicationManifest,verifyPublishedRobusto} from '../scripts/robusto-metadata-publication';
import {validateReaderConfig} from '../app/config';
import {createHash} from 'node:crypto';
test('offline deployment chunks reconstruct exact ELF and keep upgrade authority',()=>{
 const {p}=fixture(),elf=Buffer.alloc(1450);Buffer.from([127,69,76,70]).copy(elf);new PublicKey(p.program).toBuffer().copy(elf,100);
 p.programElfSha256=createHash('sha256').update(elf).digest('hex');const rents={buffer:1000000,program:100000,programData:1000000};
 const steps=buildProgramDeployment(p,elf,key(),1500,rents),chunks=steps.filter(s=>s.kind==='program-write');
 assert.equal(chunks.length,3);assert(Buffer.concat(chunks.map(s=>s.instructions[0].data.subarray(16))).equals(elf));
 const buffer=Buffer.alloc(1537);buffer.writeUInt32LE(1);buffer[4]=1;new PublicKey(p.upgradeAuthority).toBuffer().copy(buffer,5);elf.copy(buffer,37);
 assert.equal(verifyProductionBuffer({owner:LOADER,executable:false,data:buffer},elf,p,1500),elf.length);
 buffer[buffer.length-1]=1;assert.throws(()=>verifyProductionBuffer({owner:LOADER,executable:false,data:buffer},elf,p,1500));
 assert.throws(()=>buildProgramDeployment(p,elf,key(),1449,rents));
 for(const role of ['buffer','program','programData']){const missing:any={...rents};delete missing[role];assert.throws(()=>buildProgramDeployment(p,elf,key(),1500,missing),/rents/);}
});
test('metadata publication adapter detects altered downloads and never selects a provider',()=>{
 const {p}=fixture();const image=pngFixture();
 p.imageUri=`ar://${'A'.repeat(43)}`;p.imageSha256=createHash('sha256').update(image).digest('hex');
 const template={name:'ROBUSTO',symbol:'ROBUSTO',description:'Owner draft'};
 const manifest=publicationManifest(p,template,image),json=Buffer.from(manifest.bytes);p.metadataSha256=createHash('sha256').update(json).digest('hex');
 assert.equal(verifyPublishedRobusto(p,template,image,image,json).status,'PUBLISHED_BYTES_VERIFIED_NOT_ON_CHAIN');
 assert.throws(()=>verifyPublishedRobusto(p,template,image,Buffer.from('wrong'),json));
 assert.throws(()=>verifyPublishedRobusto(p,template,image,image,Buffer.concat([json,Buffer.from(' ')])));
 assert.throws(()=>verifyPublishedRobusto({...p,metadataUri:null},template,image,image,json),/URI/);
});
test('reader configuration preserves historical PAPA and denies unconfigured Mainnet',()=>{
 const p=JSON.parse(fs.readFileSync('config/app-reader.json','utf8'));assert.equal(validateReaderConfig(p).symbol,'PAPA');
 assert.throws(()=>validateReaderConfig({...p,symbol:'ROBUSTO'}));
 assert.throws(()=>validateReaderConfig(JSON.parse(fs.readFileSync('config/app-mainnet.template.json','utf8'))),/MAINNET_DISABLED/);
 assert.throws(()=>validateReaderConfig({...p,beneficiaries:{constructor:key()}}));
});

import {validatePng} from '../scripts/png-validation';
test('official PNG preparation rejects truncation, damaged chunks and unapproved replacement',()=>{
 const png=pngFixture();assert.deepEqual(validatePng(png),{width:1,height:1});
 assert.throws(()=>validatePng(png.subarray(0,24)));const altered=Buffer.from(png);altered[16]^=1;assert.throws(()=>validatePng(altered),/CRC/);
 assert.throws(()=>validatePng(Buffer.concat([png,Buffer.from('extra')])));
});
test('PNG asset validator rejects invalid compressed pixels, filters, palette and critical chunks',()=>{
 assert.deepEqual(validatePng(pngFixture(undefined,6,1)),{width:1,height:1});
 for(const raw of [Buffer.alloc(0),Buffer.alloc(4),Buffer.alloc(6),Buffer.from([5,0,0,0,0])])assert.throws(()=>validatePng(pngFixture(raw)));
 assert.throws(()=>validatePng(pngFixture(Buffer.from([0,0]),3)),/palette/);
 const indexed=pngFixture(Buffer.from([0,255]),3);
 assert.throws(()=>validatePng(Buffer.concat([indexed.subarray(0,33),pngChunk('PLTE',Buffer.from([255,0,0])),indexed.subarray(33)])),/palette index/);
 const png=pngFixture(),header=png.subarray(0,33),end=png.subarray(-12);
 assert.throws(()=>validatePng(Buffer.concat([header,pngChunk('IDAT',Buffer.from('invalid zlib')),end])));
 assert.throws(()=>validatePng(Buffer.concat([header,pngChunk('ABCD',Buffer.alloc(0)),png.subarray(33)])),/critical/);
 const idat=png.subarray(33,-12);
 assert.throws(()=>validatePng(Buffer.concat([header,idat,pngChunk('tEXt',Buffer.alloc(0)),idat,end])),/order/);
 const packed=png.subarray(41,png.length-16);
 assert.throws(()=>validatePng(Buffer.concat([header,pngChunk('IDAT',Buffer.concat([packed,Buffer.from('extra')])),end])));
});

import {verifyProductionSnapshot} from '../scripts/robusto-network-verification';
import {BorshAccountsCoder,BN} from '@coral-xyz/anchor';
import {AccountLayout,MintLayout,TOKEN_PROGRAM_ID,getAssociatedTokenAddressSync} from '@solana/spl-token';
import {getMetadataAccountDataSerializer,MPL_TOKEN_METADATA_PROGRAM_ID} from '@metaplex-foundation/mpl-token-metadata';
import {publicKey} from '@metaplex-foundation/umi';
test('future production snapshot verifies one-slot ownership, ABI, metadata, authorities and conservation',async()=>{
 const {p,idl}=fixture(),elf=Buffer.from('synthetic reviewed program');p.programElfSha256=createHash('sha256').update(elf).digest('hex');
 const program=new PublicKey(p.program),mint=new PublicKey(p.mint),[pd]=PublicKey.findProgramAddressSync([program.toBuffer()],LOADER);
 const link=Buffer.alloc(36);link.writeUInt32LE(2);pd.toBuffer().copy(link,4);
 const payload=Buffer.alloc(45+elf.length);payload.writeUInt32LE(3);payload[12]=1;new PublicKey(p.upgradeAuthority).toBuffer().copy(payload,13);elf.copy(payload,45);
 const info=(data:Buffer,owner=TOKEN_PROGRAM_ID,executable=false)=>({data,owner,executable,lamports:10000000,rentEpoch:0});
 const token=(owner:PublicKey,amount:bigint)=>{const data=Buffer.alloc(165);AccountLayout.encode({mint,owner,amount,delegateOption:0,delegate:PublicKey.default,state:1,isNativeOption:0,isNative:0n,delegatedAmount:0n,closeAuthorityOption:0,closeAuthority:PublicKey.default},data);return info(data);};
 const mintData=Buffer.alloc(82);MintLayout.encode({mintAuthorityOption:1,mintAuthority:new PublicKey(p.mintAuthority),supply:SUPPLY,decimals:6,isInitialized:true,freezeAuthorityOption:0,freezeAuthority:PublicKey.default},mintData);
 const metadata=Buffer.from(getMetadataAccountDataSerializer().serialize({updateAuthority:publicKey(p.metadataUpdateAuthority),mint:publicKey(p.mint),name:'ROBUSTO',symbol:'ROBUSTO',uri:p.metadataUri,sellerFeeBasisPoints:0,creators:null,primarySaleHappened:false,isMutable:true,editionNonce:null,tokenStandard:2,collection:null,uses:null,collectionDetails:null,programmableConfig:null}));
 const reserve=p.allocations[2],team=p.allocations[3],coder=new BorshAccountsCoder(idl);
 const vestingAccount=async(a:any)=>{const [v,bump]=PublicKey.findProgramAddressSync([Buffer.from('vesting'),new PublicKey(a.beneficiary).toBuffer(),mint.toBuffer()],program);const data=await coder.encode('VestingAccount',{authority:new PublicKey(p.distributionSourceOwner),beneficiary:new PublicKey(a.beneficiary),mint,total_amount:new BN(a.baseUnits),released_amount:new BN(0),start_time:new BN(a.vesting.start),cliff_time:new BN(a.vesting.cliff),end_time:new BN(a.vesting.end),bump});return {v,data};};
 const rv=await vestingAccount(reserve),tv=await vestingAccount(team);
 const values=[info(link,LOADER,true),info(payload,LOADER),info(mintData),token(new PublicKey(p.distributionSourceOwner),500000000000000n),info(metadata,new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID)),token(new PublicKey(p.distributionSourceOwner),500000000000000n),token(new PublicKey(p.allocations[1].beneficiary),150000000000000n),token(new PublicKey(reserve.beneficiary),0n),info(rv.data,program),token(rv.v,300000000000000n),token(new PublicKey(team.beneficiary),0n),info(tv.data,program),token(tv.v,50000000000000n)];
 const network={mainnetMode:'MAINNET_DISABLED',cluster:'mainnet-beta',rpc:'https://api.mainnet-beta.solana.com'};
 const accountMap=new Map<string,any>();
 const c={rpcEndpoint:network.rpc,getGenesisHash:async()=>MAINNET_GENESIS,getMultipleAccountsInfoAndContext:async(keys:PublicKey[])=>{if(accountMap.size===0){assert.equal(keys.length,values.length);keys.forEach((k,i)=>accountMap.set(k.toBase58(),values[i]));}return {context:{slot:123},value:keys.map(k=>accountMap.get(k.toBase58())??null)};}} as any;
 const result=await verifyProductionSnapshot(c,p,idl,elf,network,`READ_ONLY:${MAINNET_GENESIS}`);assert.equal(result.slot,123);assert.equal(result.reconciliation.baseUnits,SUPPLY.toString());
 const clock=Buffer.alloc(40);clock.writeBigInt64LE(1799999999n,32);accountMap.set('SysvarC1ock11111111111111111111111111111111',info(clock,new PublicKey('Sysvar1111111111111111111111111111111111111')));accountMap.set(p.payer,info(Buffer.alloc(0),SystemProgram.programId));
 const steps=buildProductionSteps(p,idl,1461600),optIn=`READ_ONLY:${MAINNET_GENESIS}`;
 values[5].data.writeBigUInt64LE(0n,64);
 await assert.rejects(preflightStage(c,p,idl,elf,steps[2],network,optIn),/zero supply/);
 mintData.writeBigUInt64LE(0n,36);
 assert.equal((await preflightStage(c,p,idl,elf,steps[2],network,optIn)).status,'PRECONDITIONS_VERIFIED_SIMULATION_AND_APPROVAL_REQUIRED');
 await assert.rejects(preflightStage(c,p,idl,elf,steps[0],network,optIn),/occupied/);
 mintData.writeBigUInt64LE(SUPPLY,36);
 const deposit=steps.find(s=>s.kind==='deposit')!;
 values[5].data.writeBigUInt64LE(0n,64);values[9].data.writeBigUInt64LE(0n,64);
 await assert.rejects(preflightStage(c,p,idl,elf,deposit,network,optIn),/preconditions/);
 values[5].data.writeBigUInt64LE(500000000000000n,64);
 assert.equal((await preflightStage(c,p,idl,elf,deposit,network,optIn)).label,'deposit-reserve');
 clock.writeBigInt64LE(1814313600n,32);await assert.rejects(preflightStage(c,p,idl,elf,deposit,network,optIn),/preconditions/);
 values[5].data.writeBigUInt64LE(500000000000000n,64);
 values[9].data.writeBigUInt64LE(299999999999999n,64);await assert.rejects(verifyProductionSnapshot(c,p,idl,elf,network,`READ_ONLY:${MAINNET_GENESIS}`),/allocation mismatch/);
});

import {buildMetadataUpdate} from '../scripts/robusto-production';
test('future owner-approved name/URI update retains mutable account and update authority',()=>{
 const {p}=fixture();const [ix]=buildMetadataUpdate(p,{name:'ROBUSTO Community',symbol:'ROBUSTO',uri:p.metadataUri,metadataSha256:'c'.repeat(64)});
 const [decoded]=getUpdateV1InstructionDataSerializer().deserialize(ix.data);
 assert.equal(decoded.data.__option,'Some');if(decoded.data.__option==='Some')assert.equal(decoded.data.value.name,'ROBUSTO Community');
 assert.deepEqual(decoded.newUpdateAuthority,{__option:'None'});
 assert.deepEqual(decoded.isMutable,{__option:'Some',value:true});
 assert.throws(()=>buildMetadataUpdate(p,{name:'X'.repeat(33),symbol:'ROBUSTO',uri:p.metadataUri,metadataSha256:'c'.repeat(64)}),/limits/);
 assert.throws(()=>buildMetadataUpdate(p,{name:'ROBUSTO',symbol:'ROBUSTO',uri:p.metadataUri+'/'+ 'x'.repeat(200),metadataSha256:'c'.repeat(64)}),/URI/);
});

import {preflightStage} from '../scripts/robusto-preflight';
import {validatePreparedStage} from '../scripts/robusto-preflight';
test('production preflight binds amounts, destinations, signers and stage to canonical instructions',async()=>{
 const {p,idl}=fixture(),steps=buildProductionSteps(p,idl,1461600),original=steps[2];
 validatePreparedStage(p,idl,Buffer.alloc(0),original);
 const changed={...original,instructions:original.instructions.map(ix=>new (require('@solana/web3.js').TransactionInstruction)({programId:ix.programId,keys:ix.keys.map(k=>({...k})),data:Buffer.from(ix.data)}))};
 changed.instructions[0].data.writeBigUInt64LE(SUPPLY+1n,1);
 assert.throws(()=>validatePreparedStage(p,idl,Buffer.alloc(0),changed),/canonical/);
 const mintStage=steps[2],wrongAuthority={...mintStage,instructions:mintStage.instructions.map(ix=>new (require('@solana/web3.js').TransactionInstruction)({programId:ix.programId,keys:ix.keys.map(k=>({...k})),data:Buffer.from(ix.data)}))};
 wrongAuthority.instructions[0].keys[2].pubkey=new PublicKey(p.distributionSourceOwner);
 assert.throws(()=>validatePreparedStage(p,idl,Buffer.alloc(0),wrongAuthority),/canonical/);
 let calls=0;const network={mainnetMode:'MAINNET_DISABLED',cluster:'mainnet-beta',rpc:'https://api.mainnet-beta.solana.com'};
 const c={rpcEndpoint:network.rpc,getGenesisHash:async()=>{calls++;return MAINNET_GENESIS;}} as any;
 await assert.rejects(preflightStage(c,p,idl,Buffer.alloc(0),changed,network,`READ_ONLY:${MAINNET_GENESIS}`),/canonical/);assert.equal(calls,0);
 const direct=steps.find(s=>s.kind==='transfer')!;
 const ix=direct.instructions[0],saved=ix.keys[2].pubkey;ix.keys[2].pubkey=new PublicKey(key());
 assert.throws(()=>validatePreparedStage(p,idl,Buffer.alloc(0),direct),/canonical/);ix.keys[2].pubkey=saved;
 ix.keys[3].isSigner=false;assert.throws(()=>validatePreparedStage(p,idl,Buffer.alloc(0),direct),/canonical/);
 assert.throws(()=>validatePreparedStage(p,idl,Buffer.alloc(0),{...original,label:'unknown'}),/canonical/);
});
test('stage preflight blocks Mainnet by default before making any request',async()=>{
 const {p,idl}=fixture();let calls=0;const c={getGenesisHash:async()=>{calls++;return MAINNET_GENESIS;}} as any;
 await assert.rejects(preflightStage(c,p,idl,Buffer.alloc(0),{label:'mint',kind:'mint',rentSizes:[],instructions:[]},{mainnetMode:'MAINNET_DISABLED'},undefined),/MAINNET_DISABLED/);assert.equal(calls,0);
});

import path from 'node:path';
import {findCandidate,readDeployment} from '../scripts/rehearsal-one-tx';
test('public pinned rehearsal artifact survives a source-only restoration without private identities',()=>{
 const deployment=readDeployment();const candidate=findCandidate(deployment,path.resolve('docs/evidence/rehearsal-builds'));
 assert.equal(createHash('sha256').update(candidate.elf).digest('hex'),deployment.elfSha256);
 assert.equal(JSON.parse(candidate.idlBytes.toString()).address,deployment.program);
});
