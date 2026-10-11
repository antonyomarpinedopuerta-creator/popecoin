/** Separate unapproved public fixture. Integer arithmetic only; no transport. */
import '../tests/offline-safety';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {PublicKey,SystemProgram} from '@solana/web3.js';
import {TOKEN_PROGRAM_ID,TOKEN_2022_PROGRAM_ID,MintLayout} from '@solana/spl-token';
import {BN,BorshInstructionCoder,Idl} from '@coral-xyz/anchor';
import idl from './meteora-local-idl.json';
import {integerSqrt} from './robusto-meteora-local';
import {SUPPLY,U64,validateAlternative,verifyClosedMint} from './robusto-10b9-alternative';
export function poolMath(inventory:bigint,lowNumerator:bigint,highNumerator:bigint,denominator:bigint){
 if(inventory<=0n||inventory>4_000_000_000n*1_000_000_000n||denominator<=0n||denominator>U64||lowNumerator<=0n||highNumerator>U64||lowNumerator>=highNumerator)throw Error('Invalid fictional price/inventory bounds');
 // Human USDC/ROBUSTO -> raw B/A: 10^6 / 10^9. Q64.64 sqrt price.
 const lo=integerSqrt(lowNumerator*(1n<<128n)/(denominator*1000n));
 const hi=integerSqrt(highNumerator*(1n<<128n)/(denominator*1000n));
 if(lo<4295048016n||hi>79226673521066979257578248091n||lo>=hi)throw Error('Protocol price bounds');
 const liquidity=inventory*lo*hi/(hi-lo);
 if(liquidity<=0n||liquidity>=(1n<<128n))throw Error('Liquidity overflow');
 const amount=(liquidity*(hi-lo)+lo*hi-1n)/(lo*hi);
 if(amount!==inventory)throw Error('Inventory rounding mismatch');
 return {lo,hi,liquidity};
}
export function validateMints(a:Buffer,b:Buffer){
 verifyClosedMint({data:a,owner:TOKEN_PROGRAM_ID,executable:false});
 if(b.length!==82)throw Error('Quote mint layout');
 const m=MintLayout.decode(b);
 if(!m.isInitialized||m.decimals!==6||m.supply!==1_000_000_000_000n||m.mintAuthorityOption!==0||m.freezeAuthorityOption!==0)throw Error('Fictional USDC mint mismatch');
}
export function runtimeFixture10b9(){
 validateAlternative(JSON.parse(fs.readFileSync('config/robusto-tokenomics-10b9-alternative.json','utf8')));
 const hash=crypto.createHash('sha256').update(fs.readFileSync('scripts/meteora-local-idl.json')).digest('hex');
 if(hash!=='e476ace8abaf90b70660c7a9bca39e604bb606880a865625bb31cfb3857b4d0d')throw Error('Unreviewed IDL');
 const publicKey=(label:string)=>{for(let n=0;;n++){const b=crypto.createHash('sha256').update(`ROBUSTO_10B9_USDC_PUBLIC_${label}_${n}`).digest();if(PublicKey.isOnCurve(b))return new PublicKey(b);}};
 const a=publicKey('asset'),b=publicKey('USDC_FIXTURE_NOT_REAL_USDC'),payer=publicKey('payer'),creator=publicKey('creator'),nft=publicKey('nft');
 const program=new PublicKey(idl.address),pda=(s:Buffer[])=>PublicKey.findProgramAddressSync(s,program)[0];
 const sorted=[a,b].sort((x,y)=>Buffer.compare(x.toBuffer(),y.toBuffer()));
 const pool=pda([Buffer.from('cpool'),sorted[1].toBuffer(),sorted[0].toBuffer()]);
 const accounts:Record<string,PublicKey>={creator,position_nft_mint:nft,position_nft_account:pda([Buffer.from('position_nft_account'),nft.toBuffer()]),payer,pool_authority:new PublicKey('HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC'),pool,position:pda([Buffer.from('position'),nft.toBuffer()]),token_a_mint:a,token_b_mint:b,token_a_vault:pda([Buffer.from('token_vault'),a.toBuffer(),pool.toBuffer()]),token_b_vault:pda([Buffer.from('token_vault'),b.toBuffer(),pool.toBuffer()]),payer_token_a:publicKey('sourceA'),payer_token_b:publicKey('sourceB'),token_a_program:TOKEN_PROGRAM_ID,token_b_program:TOKEN_PROGRAM_ID,token_2022_program:TOKEN_2022_PROGRAM_ID,system_program:SystemProgram.programId,event_authority:pda([Buffer.from('__event_authority')]),program};
 const mint=(supply:bigint,decimals:number)=>{const data=Buffer.alloc(82);MintLayout.encode({mintAuthorityOption:0,mintAuthority:PublicKey.default,supply,decimals,isInitialized:true,freezeAuthorityOption:0,freezeAuthority:PublicKey.default},data);return data;};
 const mintA=mint(SUPPLY,9),mintB=mint(1_000_000_000_000n,6);validateMints(mintA,mintB);
 const inventory=1_000_000_000_000_000n,{lo,hi,liquidity}=poolMath(inventory,1n,3n,1000n);
 const bn=(v:bigint)=>new BN(v.toString()),base=Buffer.alloc(27);base.writeBigUInt64LE(2500000n);
 const params={pool_fees:{base_fee:{data:Array.from(base)},compounding_fee_bps:0,padding:0,dynamic_fee:null},sqrt_min_price:bn(lo),sqrt_max_price:bn(hi),has_alpha_vault:false,liquidity:bn(liquidity),sqrt_price:bn(lo),activation_type:1,collect_fee_mode:1,activation_point:null};
 const coder=new BorshInstructionCoder(idl as Idl);
 const variants=Object.entries({zeroLiquidity:(p:any):void=>{p.liquidity=new BN(0);},maxLiquidity:(p:any):void=>{p.liquidity=bn((1n<<128n)-1n);},invalidRange:(p:any):void=>{p.sqrt_min_price=p.sqrt_max_price;},invalidActivation:(p:any):void=>{p.activation_type=255;},invalidFeeMode:(p:any):void=>{p.collect_fee_mode=255;}}).map(([name,mutate])=>{const p=coder.decode(coder.encode('initialize_customizable_pool',{params}))!.data as any;mutate(p.params);return {name,dataBase64:coder.encode('initialize_customizable_pool',p).toString('base64')};});
 return {schemaVersion:1,scope:'OFFLINE_FIXTURE_ONLY',status:'PROPOSED_NOT_APPROVED',authorization:false,mainnetStatus:'NOT_AUTHORIZED_FOR_MAINNET',mainnetDisabled:true,idlSha256:hash,pair:'ROBUSTO/USDC_FIXTURE',priceNote:'Fictional 0.001..0.003 USDC/ROBUSTO, not approved or market data',inventory:inventory.toString(),liquidity:liquidity.toString(),mintB:mintB.toString('base64'),input:{mintAccount:{dataBase64:mintA.toString('base64')}},variants,instruction:{programId:program.toBase58(),dataBase64:coder.encode('initialize_customizable_pool',{params}).toString('base64'),accounts:idl.instructions[0].accounts.map(x=>({name:x.name,address:accounts[x.name].toBase58(),isSigner:'signer'in x&&x.signer===true,isWritable:'writable'in x&&x.writable===true}))}};
}
if(require.main===module)console.log(JSON.stringify(runtimeFixture10b9(),null,2));
