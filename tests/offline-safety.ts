/** Loaded first by run.ts: public fixture tests must never create identities or sign. */
import {Keypair,Transaction,VersionedTransaction} from '@solana/web3.js';
const forbidden=()=>{throw Error('Offline suite forbids keypair creation/import and signing');};
Keypair.generate=forbidden;
Keypair.fromSeed=forbidden;
Keypair.fromSecretKey=forbidden;
Transaction.prototype.sign=forbidden;
Transaction.prototype.partialSign=forbidden;
VersionedTransaction.prototype.sign=forbidden;
