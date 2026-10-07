import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import config from '../config/robusto-meteora-local.json';
import historical from '../config/robusto-rehearsal-3.json';
import {localPublicFixture} from '../scripts/robusto-meteora-local';
import {validateLocalBinding,privateLocalPath,LocalBinding,LOCAL_RPC,TRIAL,modelSwap} from '../scripts/robusto-local-guard';
const f=localPublicFixture('100');
const binding=():LocalBinding=>({cluster:'localnet',rpcUrl:LOCAL_RPC,session:'00000000-0000-4000-8000-000000000001',genesisHash:f.tokenB,validatorIdentity:f.expectedMint,signers:[f.payer,f.positionOwner,f.mintAuthority],approvedParameters:config,quoteLabel:TRIAL.label,quote:TRIAL.solUsd,active:true});
const observed={genesisHash:f.tokenB,validatorIdentity:f.expectedMint};
test('binding accepts only the active approved temporary local rehearsal',()=>validateLocalBinding(binding(),observed,[f.payer]));
for(const [name,patch] of Object.entries({mainnet:{cluster:'mainnet-beta'},devnet:{cluster:'devnet'},remote:{rpcUrl:'https://api.devnet.solana.com'},proxy:{rpcUrl:'http://127.0.0.1:8899@remote.example'},other_port:{rpcUrl:'http://127.0.0.1:9900'},wrong_identity:{validatorIdentity:f.positionNftMint},wrong_genesis:{genesisHash:f.positionNftMint},inactive:{active:false},quote:{quote:'101'},real_quote:{quoteLabel:'LIVE'},inventory:{approvedParameters:{...config,inventoryBaseUnits:'1'}},supply:{approvedParameters:{...config,supplyBaseUnits:'1'}},decimals:{approvedParameters:{...config,decimals:9}},price:{approvedParameters:{...config,p0ReferenceUsd:'0.001'}},range:{approvedParameters:{...config,range:5}},authority_revocation:{approvedParameters:{...config,revokeMintAuthority:true}}}))test(`pre-signature binding rejects ${name}`,()=>assert.throws(()=>validateLocalBinding({...binding(),...patch},observed,[f.payer])));
test('pre-signature gate rejects unregistered, duplicated and historical identities',()=>{
 assert.throws(()=>validateLocalBinding(binding(),observed,[f.positionNftMint]));
 assert.throws(()=>validateLocalBinding({...binding(),signers:[f.payer,f.payer]},observed,[f.payer]));
 assert.throws(()=>validateLocalBinding({...binding(),signers:[historical.payer]},observed,[historical.payer]));
});
test('private key paths cannot escape to global wallets or use arbitrary filenames',()=>{
 const b=binding();assert(privateLocalPath('/tmp/robusto-test',b.session,'payer-keypair.json').endsWith('/payer-keypair.json'));
 for(const p of ['../../.config/solana/id.json','/home/antony/.config/solana/id.json','id.json/../../wallet.json','../payer-keypair.json'])assert.throws(()=>privateLocalPath('/tmp/robusto-test',b.session,p));
 assert.throws(()=>privateLocalPath('/tmp/robusto-test','../session','payer-keypair.json'));
});
test('executable rehearsal has no automatic invocation or public RPC fallback',()=>{
 const code=fs.readFileSync('scripts/robusto-meteora-rehearsal.ts','utf8');
 assert(code.includes("args[0]!=='--authorize-local-rehearsal'"));assert(code.includes("redirect:'error'"));assert(!code.includes('sendAndConfirmTransaction'));assert(!code.includes('~/.config/solana/id.json'));assert(code.includes('binding.active=false'));
});
test('model respects price boundaries, fees and partial fill rather than spending an entire oversized input',()=>{
 const min=1000000000000000000n,max=min*2n,L=1000000000000n*min*max/(max-min);
 const small=modelSwap(L,min,min,max,100n,true);assert(small.next>min);assert(small.out>0n);assert.equal(small.fee,1n);
 assert.throws(()=>modelSwap(L,max,min,max,100n,true));
 const partial=modelSwap(L,min,min,max,1000000000000n,true,true);assert.equal(partial.next,max);assert(partial.used<1000000000000n);
 const sale=modelSwap(L,small.next,min,max,small.out/2n,false);assert(sale.next<small.next);assert(sale.next>=min);assert(sale.out>=0n);
});
