import {pngFixture} from './png-fixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Transaction} from '@solana/web3.js';
import {TOKEN_PROGRAM_ID,decodeTransferCheckedInstruction} from '@solana/spl-token';
import {validateRobustoProposal,prepareRobustoMetadata} from '../scripts/robusto-metadata';
import {prepareRecycle} from '../scripts/robusto-recycle';
import {GENESIS,RPC} from '../scripts/rehearsal-one-tx';
import {ROBUSTO} from '../scripts/robusto-recovery';
import {VestingSnapshot} from '../scripts/rehearsal-vesting-one-tx';
const proposal=JSON.parse(fs.readFileSync('config/robusto-production.json','utf8'));
test('ROBUSTO proposal separates token/base supply and preserves mutable metadata policy',()=>{
 assert.equal(validateRobustoProposal(proposal).supplyBaseUnits,'1000000000000000');
 for(const patch of [{supplyBaseUnits:'1000000000'},{decimals:9},{metadataMutable:false},{freezeAuthority:'somebody'},{mainnetAuthorized:true},{mintAuthorityRevocationAuthorized:true},{imagePath:'metadata/papa-logo.png'}])
  assert.throws(()=>validateRobustoProposal({...proposal,...patch}));
});
test('ROBUSTO publication fails closed on missing approval/hash or durable URI',()=>{
 const image=pngFixture();
 const template={name:'ROBUSTO',symbol:'ROBUSTO',description:'Draft'};
 assert.throws(()=>prepareRobustoMetadata(proposal,template,image),/pending/);
 const p={...proposal,imageSha256:createHash('sha256').update(image).digest('hex')};
 assert.throws(()=>prepareRobustoMetadata(p,template,image),/URI/);
 const result=prepareRobustoMetadata({...p,imageUri:`ar://${'A'.repeat(43)}`},template,image);
 assert.equal(JSON.parse(result.bytes).symbol,'ROBUSTO');assert.equal(result.isMutable,true);
 assert.throws(()=>prepareRobustoMetadata({...p,imageUri:`ar://${'A'.repeat(43)}`},{...template,name:'PAPA'},image));
});
const snapshot:VestingSnapshot={slot:123,unixTime:1790852000,program:ROBUSTO.program,programData:'unused',mint:ROBUSTO.mint,decimals:6,supply:10000000n,
 vesting:'DyVmc4pABesYYvHe5RZdTsNpheFyBsyK3nUpu1S9HeEB',vestingState:{authority:ROBUSTO.authority,beneficiary:ROBUSTO.beneficiary,mint:ROBUSTO.mint,total:10000000n,released:10000000n,start:1790849662n,cliff:1790849672n,end:1790851472n},
 vault:'FojRoyoMmuLXh8iipNjH2KfQyQG12KLa5kCf7CgP5Wp9',vaultAmount:0n,source:'DHyysduG5SxsqiupB7Zvw32fLq14BUVBZbHKbXBqYcN6',sourceAmount:0n,beneficiaryAta:'GThf94JHTRKpQtk1jBubduGgazGq1YBLDnqpDqFRWLRJ',beneficiaryAmount:10000000n};
function mock(fee:number|null=10000,balance=6305902880){return {rpcEndpoint:RPC,getGenesisHash:async()=>GENESIS,getLatestBlockhash:async()=>({blockhash:'11111111111111111111111111111111',lastValidBlockHeight:100}),getFeeForMessage:async()=>({value:fee}),getBalance:async()=>balance} as any;}
test('recycle prepares only full-supply return TransferChecked with two empty signatures',async()=>{
 const p=await prepareRecycle(mock(),async()=>snapshot);const tx=Transaction.from(Buffer.from(p.unsignedTransactionBase64,'base64'));
 assert.equal(tx.instructions.length,1);assert(tx.instructions[0].programId.equals(TOKEN_PROGRAM_ID));
 const ix=decodeTransferCheckedInstruction(tx.instructions[0]);assert.equal(ix.data.amount,10000000n);assert.equal(ix.data.decimals,6);
 assert.equal(ix.keys.source.pubkey.toBase58(),snapshot.beneficiaryAta);assert.equal(ix.keys.destination.pubkey.toBase58(),snapshot.source);
 assert.equal(ix.keys.owner.pubkey.toBase58(),ROBUSTO.beneficiary);assert.equal(tx.signatures.length,2);assert(tx.signatures.every(x=>x.signature===null));
 assert.equal(p.feeLamports,10000);assert.equal(p.rentLamports,0);
});
test('recycle rejects changed balances, identities, network and unavailable funding',async()=>{
 for(const patch of [{sourceAmount:10000000n},{beneficiaryAmount:0n},{vaultAmount:1n},{supply:10000001n},{beneficiaryAta:ROBUSTO.authority}])
  await assert.rejects(prepareRecycle(mock(),async()=>({...snapshot,...patch})));
 await assert.rejects(prepareRecycle({...mock(),rpcEndpoint:'https://api.mainnet-beta.solana.com'},async()=>snapshot),/Devnet/);
 await assert.rejects(prepareRecycle({...mock(),getGenesisHash:async()=>'wrong'},async()=>snapshot),/Devnet/);
 await assert.rejects(prepareRecycle(mock(null),async()=>snapshot),/Fee/);
 await assert.rejects(prepareRecycle(mock(10000,0),async()=>snapshot),/payer/);
});

test('metadata authority stays separate from mint and upgrade authority; pending is explicit',()=>{
 assert.equal(validateRobustoProposal(proposal).metadataUpdateAuthority,null);
 assert.throws(()=>validateRobustoProposal({...proposal,metadataUpdateAuthority:'invalid'}),/public key/);
 assert.throws(()=>validateRobustoProposal({...proposal,metadataUpdateAuthority:ROBUSTO.authority,mintAuthority:ROBUSTO.authority}),/separate/);
 assert.throws(()=>validateRobustoProposal({...proposal,metadataUpdateAuthority:ROBUSTO.authority,upgradeAuthority:ROBUSTO.authority}),/separate/);
 assert.throws(()=>validateRobustoProposal({...proposal,metadataUpdateAuthority:'11111111111111111111111111111111'}),/custody/);
});
