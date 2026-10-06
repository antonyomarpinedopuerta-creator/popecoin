import test from 'node:test';
import assert from 'node:assert/strict';
import {BorshInstructionCoder,Idl} from '@coral-xyz/anchor';
import {PublicKey} from '@solana/web3.js';
import {TOKEN_2022_PROGRAM_ID} from '@solana/spl-token';
import config from '../config/robusto-meteora-local.json';
import idl from '../scripts/meteora-local-idl.json';
import historical from '../config/robusto-rehearsal-3.json';
import {integerSqrt,localPublicFixture,prepareMeteoraLocal,validateLocalApproval,LocalInput} from '../scripts/robusto-meteora-local';

test('local approval needs explicit trial quote and cannot authorize operations',()=>{
 assert.equal(validateLocalApproval().status,'APPROVED_FOR_LOCAL_REHEARSAL_ONLY');
 assert.throws(()=>prepareMeteoraLocal(localPublicFixture()),/REQUIRES_EXPLICIT/);
 for(const [k,v] of Object.entries({inventoryBaseUnits:'3000000000001',supplyBaseUnits:'1',decimals:9,pmaxReferenceUsd:'0.001',mainnetAuthorized:true,permanentLock:true,solUsdTrialQuote:'100',signingAuthorized:true}))assert.throws(()=>validateLocalApproval({...config,[k]:v}));
});
test('exact sqrt boundaries',()=>{for(let n=0n;n<500n;n++){const s=integerSqrt(n);assert(s*s<=n);assert((s+1n)*(s+1n)>n);}assert.throws(()=>integerSqrt(-1n));});
test('unsigned creation roundtrips official IDL with separated payer/owner and no authority instructions',()=>{
 const input=localPublicFixture('100'); // Explicit synthetic test quote, NOT a market price.
 const result=prepareMeteoraLocal(input);
 const decoded=new BorshInstructionCoder(idl as Idl).decode(Buffer.from(result.instruction.dataBase64,'base64'))!;
 assert.equal(decoded.name,'initialize_customizable_pool');
 const p=(decoded.data as any).params;
 assert.equal(p.sqrt_price.toString(),result.parameters.sqrtMinPrice);
 assert.equal(p.sqrt_min_price.toString(),result.parameters.sqrtMinPrice);
 assert.equal(p.sqrt_max_price.toString(),result.parameters.sqrtMaxPrice);
 assert.equal(p.liquidity.toString(),result.parameters.liquidity);
 assert.equal(p.collect_fee_mode,1);assert.equal(p.activation_type,1);assert.equal(p.has_alpha_vault,false);assert.equal(p.activation_point,null);
 assert.equal(p.pool_fees.dynamic_fee,null);assert.equal(p.pool_fees.compounding_fee_bps,0);
 assert.equal(Buffer.from(p.pool_fees.base_fee.data).readBigUInt64LE(),2500000n);
 assert.equal(result.parameters.tokenABaseUnits,'1000000000000');assert.equal(result.parameters.tokenBBaseUnits,'1');
 assert.deepEqual(result.signatures,[]);assert.deepEqual(result.authorityChanges,[]);assert.deepEqual(result.locks,[]);assert.equal(result.sent,false);
 const accounts=result.instruction.accounts;
 assert.equal(accounts[0].address,input.positionOwner);assert.equal(accounts[3].address,input.payer);
 assert.deepEqual(accounts.filter(a=>a.isSigner).map(a=>a.address),[input.positionNftMint,input.payer]);
 assert(!accounts.some(a=>a.address===input.mintAuthority||a.address===input.metadataUpdateAuthority));
 const mint=new PublicKey(input.expectedMint),quote=new PublicKey(input.tokenB),sorted=[mint,quote].sort((a,b)=>Buffer.compare(a.toBuffer(),b.toBuffer()));
 const [pool]=PublicKey.findProgramAddressSync([Buffer.from('cpool'),sorted[1].toBuffer(),sorted[0].toBuffer()],new PublicKey(idl.address));
 assert.equal(accounts[5].address,pool.toBase58());
 const lo=BigInt(result.parameters.sqrtMinPrice),hi=BigInt(result.parameters.sqrtMaxPrice);
 const n=788675n*1000n*(1n<<128n),d=1000000000n*100n;
 assert(lo*lo*d<=n);assert((lo+1n)*(lo+1n)*d>n);
 assert(hi>lo);assert.equal(result.verification,'OFFLINE_INPUT_VALIDATED_NOT_CHAIN_VERIFIED');
});
const invalid:Array<[string,(x:LocalInput)=>void]>=[
 ['Mainnet cluster',x=>x.cluster='mainnet-beta'],['Devnet cluster',x=>x.cluster='devnet'],
 ['remote endpoint',x=>x.rpcUrl='https://api.mainnet-beta.solana.com'],['localhost alias',x=>x.rpcUrl='http://localhost:8899'],
 ['userinfo endpoint',x=>x.rpcUrl='http://127.0.0.1:8899@evil.example'],['local query',x=>x.rpcUrl+='?cluster=mainnet'],
 ['scope',x=>x.identityScope='PRODUCTION'],['wrong mint',x=>x.tokenA=x.positionNftMint],['reversed tokens',x=>[x.tokenA,x.tokenB]=[x.tokenB,x.tokenA]],
 ['payer owner alias',x=>x.positionOwner=x.payer],['authority alias',x=>x.metadataUpdateAuthority=x.mintAuthority],
 ['NFT alias',x=>x.positionNftMint=x.expectedMint],['permanent lock',x=>x.permanentLock=true],['vesting lock',x=>x.vestingLock=true],
 ['revocation',x=>x.revokeMintAuthority=true],['metadata authority',x=>x.metadataSnapshot.updateAuthority=x.payer],
 ['metadata mint',x=>x.metadataSnapshot.mint=x.positionNftMint],['immutable metadata',x=>x.metadataSnapshot.isMutable=false],
 ['Token2022 ROBUSTO',x=>x.mintAccount.owner=TOKEN_2022_PROGRAM_ID.toBase58()],
 ['supply mismatch',x=>{const b=Buffer.from(x.mintAccount.dataBase64,'base64');b.writeBigUInt64LE(1n,36);x.mintAccount.dataBase64=b.toString('base64');}],
 ['decimals mismatch',x=>{const b=Buffer.from(x.mintAccount.dataBase64,'base64');b[44]=9;x.mintAccount.dataBase64=b.toString('base64');}],
 ['freeze authority',x=>{const b=Buffer.from(x.mintAccount.dataBase64,'base64');b.writeUInt32LE(1,46);x.mintAccount.dataBase64=b.toString('base64');}],
 ['revoked mint',x=>{const b=Buffer.from(x.mintAccount.dataBase64,'base64');b.writeUInt32LE(0,0);x.mintAccount.dataBase64=b.toString('base64');}],
 ['truncated mint',x=>x.mintAccount.dataBase64='AA=='],['NaN quote',x=>x.solUsdTrialQuote='NaN'],['zero quote',x=>x.solUsdTrialQuote='0'],
 ['exponential quote',x=>x.solUsdTrialQuote='1e2'],['negative slippage',x=>x.slippageBps=-1],['large slippage',x=>x.slippageBps=101],
 ['fractional slippage',x=>x.slippageBps=.5],['zero fee',x=>x.fixedFeeBps=0],['large fee',x=>x.fixedFeeBps=1000]
];
for(const [label,mutate] of invalid)test(`reject ${label}`,()=>{const x=localPublicFixture('100');mutate(x);assert.throws(()=>prepareMeteoraLocal(x));});
test('changing trial quote changes encoded price without changing approval or inventory',()=>{
 const a=prepareMeteoraLocal(localPublicFixture('50')),b=prepareMeteoraLocal(localPublicFixture('200'));
 const lo=BigInt(a.parameters.sqrtMinPrice),hi=BigInt(b.parameters.sqrtMinPrice);
 assert(lo===2n*hi||lo===2n*hi+1n);assert.equal(a.parameters.tokenABaseUnits,b.parameters.tokenABaseUnits);assert.equal(config.solUsdTrialQuote,null);
});
test('historical Devnet payer is rejected without opening any private identity',()=>{
 const x=localPublicFixture('100');x.payer=historical.payer;
 assert.throws(()=>prepareMeteoraLocal(x),/Historical Devnet identities/);
});
test('extra operation flags and secret-bearing top-level fields are rejected',()=>{
 for(const field of ['send','sign','mainnetAuthorized','privateKey'])assert.throws(()=>prepareMeteoraLocal({...localPublicFixture('100'),[field]:true} as LocalInput),/Unexpected preparation fields/);
});
