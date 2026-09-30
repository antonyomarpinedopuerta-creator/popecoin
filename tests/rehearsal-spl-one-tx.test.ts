import test from 'node:test';
import assert from 'node:assert/strict';
import {PublicKey,Transaction,SystemProgram} from '@solana/web3.js';
import {MINT_SIZE,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,getAssociatedTokenAddressSync} from '@solana/spl-token';
import {prepareMintCreate,prepareAta,prepareMintTo,verifyMint,verifyAtas,TEST_DECIMALS,SplPlan} from '../scripts/rehearsal-spl-one-tx';
import {GENESIS,RPC} from '../scripts/rehearsal-one-tx';
import {DEVNET_MINT,DEVNET_PROGRAM_ID} from '../scripts/devnet-config';
import {PRODUCTION_PROGRAM} from '../scripts/production-plan';

function fixture(n:number){for(let i=n;i<256;i++){const k=new PublicKey(Buffer.alloc(32,i));if(PublicKey.isOnCurve(k.toBytes()))return k;}throw Error('fixture');}
const payer=fixture(20),authority=fixture(26),beneficiary=fixture(30),program=new PublicKey(Buffer.alloc(32,23)),mint=fixture(34);
const plan:SplPlan={cluster:'devnet',rpc:RPC,genesisHash:GENESIS,program:program.toBase58(),mint:mint.toBase58(),payer:payer.toBase58(),authority:authority.toBase58(),beneficiary:beneficiary.toBase58(),amount:'1000000'};
function mock(genesis=GENESIS,accounts=new Map<string,any>()){
 const calls:string[]=[];const c:any={_rpcEndpoint:RPC,getGenesisHash:async()=>{calls.push('genesis');return genesis;},getAccountInfo:async(k:PublicKey)=>{calls.push('account');return accounts.get(k.toBase58())??null;},getMinimumBalanceForRentExemption:async(n:number)=>n*10,getLatestBlockhash:async()=>({blockhash:'11111111111111111111111111111111',lastValidBlockHeight:55}),getFeeForMessage:async()=>({value:5000}),getBalance:async()=>10000000,getSlot:async()=>88};return {c,calls};
}
function mintState(supply=0n,freeze:PublicKey|null=null,decimals=TEST_DECIMALS){const b=Buffer.alloc(82);b.writeUInt32LE(1,0);authority.toBuffer().copy(b,4);b.writeBigUInt64LE(supply,36);b[44]=decimals;b[45]=1;if(freeze){b.writeUInt32LE(1,46);freeze.toBuffer().copy(b,50);}return {owner:TOKEN_PROGRAM_ID,data:b,lamports:1,executable:false,rentEpoch:0};}
function tokenState(owner:PublicKey,amount=0n){const b=Buffer.alloc(165);mint.toBuffer().copy(b,0);owner.toBuffer().copy(b,32);b.writeBigUInt64LE(amount,64);b[108]=1;return {owner:TOKEN_PROGRAM_ID,data:b,lamports:1,executable:false,rentEpoch:0};}
test('mint create is a single unsigned classic SPL tx with decimals, authority and no freeze authority',async()=>{
 const {c}=mock();const out:any=await prepareMintCreate(c,plan);const tx=Transaction.from(Buffer.from(out.unsignedTransactionBase64,'base64'));
 assert.equal(tx.instructions.length,2);assert.equal(tx.instructions[0].programId.toBase58(),'11111111111111111111111111111111');
 assert.equal(Number(tx.instructions[0].data.readBigUInt64LE(12)),MINT_SIZE);assert.equal(tx.instructions[0].keys.some(k=>k.pubkey.equals(mint)&&k.isSigner),true);
 const init=tx.instructions[1];assert.equal(init.programId.toBase58(),TOKEN_PROGRAM_ID.toBase58());assert.equal(init.data[0],20);assert.equal(init.data[1],TEST_DECIMALS);assert(init.data.subarray(2,34).equals(authority.toBuffer()));assert.equal(init.data[34],0);
 assert.deepEqual(out.requiredSigners.sort(),[payer.toBase58(),mint.toBase58()].sort());assert.equal(out.rentLamports,MINT_SIZE*10);assert.equal(out.cluster,'devnet');
});
test('authority ATA preparation is one unsigned idempotent instruction with exact payer/rent',async()=>{
 const {c}=mock();const out:any=await prepareAta(c,plan,'authority');const tx=Transaction.from(Buffer.from(out.unsignedTransactionBase64,'base64'));
 assert.equal(tx.instructions.length,1);assert.equal(tx.instructions[0].programId.toBase58(),ASSOCIATED_TOKEN_PROGRAM_ID.toBase58());assert.deepEqual(out.requiredSigners,[payer.toBase58()]);assert.equal(out.rentLamports,1650);assert(out.ata);
});
test('rejects protected roles, malformed amounts, wrong endpoint/genesis, or an existing mint',async()=>{
 for(const change of [{mint:DEVNET_MINT.toBase58()},{program:DEVNET_PROGRAM_ID.toBase58()},{program:PRODUCTION_PROGRAM.toBase58()},{amount:'0'},{amount:'100000001'}])await assert.rejects(prepareMintCreate(mock().c,{...plan,...change} as SplPlan));
 let m=mock('wrong');await assert.rejects(prepareMintCreate(m.c,plan),/genesis/);assert.deepEqual(m.calls,['genesis']);
 m=mock();m.c._rpcEndpoint='https://api.mainnet-beta.solana.com';await assert.rejects(prepareMintCreate(m.c,plan),/endpoint/);assert.deepEqual(m.calls,[]);
 m=mock(GENESIS,new Map([[mint.toBase58(),{owner:TOKEN_PROGRAM_ID}]]));await assert.rejects(prepareMintCreate(m.c,plan),/already exists/);
});
test('existing ATA with wrong owner is rejected, never replaced with a create transaction',async()=>{
 const {getAssociatedTokenAddressSync}=require('@solana/spl-token');const ata=getAssociatedTokenAddressSync(mint,authority);
 const {c}=mock(GENESIS,new Map([[ata.toBase58(),{owner:SystemProgram.programId,data:Buffer.alloc(165)}]]));
 await assert.rejects(prepareAta(c,plan,'authority'),/unexpected owner/);
});
test('mintTo and read verifiers reject until actual mint state is correct',async()=>{
 const {c}=mock();await assert.rejects(prepareMintTo(c,plan));await assert.rejects(verifyMint(c,plan));await assert.rejects(verifyAtas(c,plan));
});
test('mintToChecked requires zero supply, correct mint authority/decimals and source ATA',async()=>{
 const source=getAssociatedTokenAddressSync(mint,authority),destination=getAssociatedTokenAddressSync(mint,beneficiary);
 const accounts=new Map([[mint.toBase58(),mintState()],[source.toBase58(),tokenState(authority)],[destination.toBase58(),tokenState(beneficiary)]]);
 const {c}=mock(GENESIS,accounts),out:any=await prepareMintTo(c,plan),tx=Transaction.from(Buffer.from(out.unsignedTransactionBase64,'base64'));
 assert.equal(tx.instructions.length,1);assert.equal(tx.instructions[0].programId.toBase58(),TOKEN_PROGRAM_ID.toBase58());assert.equal(tx.instructions[0].data[0],14);assert.equal(tx.instructions[0].data.readBigUInt64LE(1),1000000n);assert.equal(tx.instructions[0].data[9],TEST_DECIMALS);
 assert.deepEqual(new Set(out.requiredSigners),new Set([payer.toBase58(),authority.toBase58()]));assert.equal(out.supplyBefore,'0');assert.equal(out.supplyAfter,plan.amount);
 for(const badMint of [mintState(1n),mintState(0n,beneficiary),mintState(0n,null,5)]){const bad=mock(GENESIS,new Map([[mint.toBase58(),badMint],[source.toBase58(),tokenState(authority)]]));await assert.rejects(prepareMintTo(bad.c,plan));}
});
test('read-only mint and ATA verifiers report only matching classic SPL fixture state',async()=>{
 const source=getAssociatedTokenAddressSync(mint,authority),destination=getAssociatedTokenAddressSync(mint,beneficiary);
 const accounts=new Map([[mint.toBase58(),mintState()],[source.toBase58(),tokenState(authority,1000000n)],[destination.toBase58(),tokenState(beneficiary,250000n)]]);
 const {c}=mock(GENESIS,accounts);const m:any=await verifyMint(c,plan),atas:any=await verifyAtas(c,plan);
 assert.equal(m.supply,'0');assert.equal(m.decimals,6);assert.equal(m.freezeAuthority,null);assert.equal(atas.accounts[0].amount,'1000000');assert.equal(atas.accounts[1].amount,'250000');
});
