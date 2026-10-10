/** Classic SPL source-account validation for synthetic snapshots only. No transport. */
import {PublicKey} from '@solana/web3.js';
import {TOKEN_PROGRAM_ID,NATIVE_MINT} from '@solana/spl-token';
import {FixtureAccount,fixtureAccountBytes} from './robusto-fixture-conditions';
export function validateTokenSourceFixture(account:FixtureAccount,mint:string,authority:string,required:string){
 if(!account.exists||account.executable||account.owner!==TOKEN_PROGRAM_ID.toBase58())throw Error('Expected classic SPL source');
 const data=fixtureAccountBytes(account);
 if(data.length!==165||!data.subarray(0,32).equals(new PublicKey(mint).toBuffer())||
    !data.subarray(32,64).equals(new PublicKey(authority).toBuffer())||data[108]!==1)
  throw Error('Token source mint/authority/state mismatch');
 // Reject delegated, close-authority and dirty option payloads conservatively.
 if(data.readUInt32LE(72)!==0||data.subarray(76,108).some(x=>x!==0)||data.readBigUInt64LE(121)!==0n||
    data.readUInt32LE(129)!==0||data.subarray(133,165).some(x=>x!==0))throw Error('Token source authority/delegation mismatch');
 if(!/^(0|[1-9][0-9]*)$/.test(required)||required.length>20||BigInt(required)>2n**64n-1n)throw Error('Invalid source requirement');
 const amount=data.readBigUInt64LE(64);
 if(amount<BigInt(required))throw Error('Insufficient token source balance');
 const native=data.readUInt32LE(109),reserve=data.readBigUInt64LE(113);
 if(mint===NATIVE_MINT.toBase58()){
  if(native!==1||BigInt(account.lamports)<reserve+amount)throw Error('Unbacked native token source');
 }else if(native!==0||reserve!==0n)throw Error('Unexpected native token state');
 return {scope:'OFFLINE_FIXTURE_ONLY' as const,authorization:false as const};
}

/** Immutable classic native-mint semantics, not merely the address/owner. */
export function validateNativeMintFixture(account:FixtureAccount){
 if(!account.exists||account.executable||account.owner!==TOKEN_PROGRAM_ID.toBase58())throw Error('Expected classic native mint');
 const data=fixtureAccountBytes(account);
 if(data.length!==82||data.readUInt32LE(0)!==0||data.subarray(4,36).some(x=>x!==0)||
    data.readBigUInt64LE(36)!==0n||data[44]!==9||data[45]!==1||data.readUInt32LE(46)!==0||data.subarray(50,82).some(x=>x!==0))
  throw Error('Native mint supply/decimals/authority/state mismatch');
 return {scope:'OFFLINE_FIXTURE_ONLY' as const,authorization:false as const};
}
