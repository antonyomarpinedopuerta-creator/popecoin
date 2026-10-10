import './offline-safety';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Keypair,Transaction,VersionedTransaction} from '@solana/web3.js';
test('offline client suite actively blocks identity creation/import and signing',()=>{
 for(const action of [()=>Keypair.generate(),()=>Keypair.fromSeed(new Uint8Array(32)),
  ()=>Keypair.fromSecretKey(new Uint8Array(64)),()=>new Transaction().sign(),()=>new Transaction().partialSign(),
  ()=>VersionedTransaction.prototype.sign.call({} as VersionedTransaction,[])])assert.throws(action,/Offline suite forbids/);
});
