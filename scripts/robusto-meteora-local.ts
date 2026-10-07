/** Offline instruction preparation ONLY. No Connection, transport, keys or signatures. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {PublicKey, SystemProgram, TransactionInstruction} from '@solana/web3.js';
import {TOKEN_PROGRAM_ID,TOKEN_2022_PROGRAM_ID,NATIVE_MINT,getAssociatedTokenAddressSync,MintLayout,unpackMint} from '@solana/spl-token';
import {BN,BorshInstructionCoder,Idl} from '@coral-xyz/anchor';
import idl from './meteora-local-idl.json';
import approved from '../config/robusto-meteora-local.json';

const PROGRAM=new PublicKey(idl.address), Q128=1n<<128n, U128=(1n<<128n)-1n;
const IDL_SHA='e476ace8abaf90b70660c7a9bca39e604bb606880a865625bb31cfb3857b4d0d';
const roles=['payer','positionOwner','mintAuthority','metadataUpdateAuthority','upgradeAuthority'] as const;
export interface LocalInput {
 cluster:string; rpcUrl:string; identityScope:string;
 expectedMint:string; tokenA:string; tokenB:string; positionNftMint:string;
 payer:string; positionOwner:string; mintAuthority:string; metadataUpdateAuthority:string; upgradeAuthority:string;
 mintAccount:{owner:string;dataBase64:string};
 metadataSnapshot:{mint:string;updateAuthority:string;isMutable:boolean};
 solUsdTrialQuote?:string; slippageBps:number; fixedFeeBps:number;
 permanentLock:boolean; vestingLock:boolean; revokeMintAuthority:boolean;
}
function integer(n:string){if(!/^(0|[1-9][0-9]*)$/.test(n))throw Error('Canonical integer required');return BigInt(n);}
function decimal(n:string){if(typeof n!=='string'||n.length>40||!/^(0|[1-9][0-9]*)(\.[0-9]{1,12})?$/.test(n))throw Error('Positive decimal string required');const [a,b='']=n.split('.');const num=BigInt(a+b),den=10n**BigInt(b.length);if(num<=0n)throw Error('Positive quote/price required');return {num,den};}
export function integerSqrt(n:bigint):bigint{if(n<0n)throw Error('Negative radicand');if(n<2n)return n;let x=n,y=(x+1n)/2n;while(y<x){x=y;y=(x+n/x)/2n;}return x;}
const ceil=(n:bigint,d:bigint)=>(n+d-1n)/d;
const key=(s:string)=>{const p=new PublicKey(s);if(p.toBase58()!==s)throw Error('Canonical address required');return p;};
export function historicalAddresses(){
 const found=new Set<string>();
 const visit=(x:any)=>{if(typeof x==='string'){try{found.add(key(x).toBase58());}catch{}}else if(x&&typeof x==='object')Object.values(x).forEach(visit);};
 for(const name of fs.readdirSync('config').filter(n=>/devnet|rehearsal|app-reader/.test(n)&&n.endsWith('.json')))visit(JSON.parse(fs.readFileSync(`config/${name}`,'utf8')));
 return found;
}
export function validateLocalApproval(c:any=approved){
 if(JSON.stringify(c)!==JSON.stringify(approved))throw Error('Only exact local-only approved preparation is accepted');
 if(c.inventoryBaseUnits!=='1000000000000'||c.absoluteMaximumBaseUnits!=='3000000000000'||c.supplyBaseUnits!=='1000000000000000'||c.decimals!==6||c.p0ReferenceUsd!=='0.000788675'||c.pmaxReferenceUsd!=='0.002366025'||c.range!==3||c.solUsdTrialQuote!==null||c.metadataMutable!==true||c.platformStatus!=='CANDIDATE_NOT_APPROVED_FOR_LAUNCH'||c.pair!=='ROBUSTO/SOL'||c.profile!=='MEDIO')throw Error('Approved local-only parameters mismatch');
 for(const field of ['permanentLock','vestingLock','revokeMintAuthority','mainnetAuthorized','signingAuthorized','sendingAuthorized','withdrawalAuthorized','publicationAuthorized'])if(c[field]!==false)throw Error('Operations remain forbidden');
 if(c.status!=='APPROVED_FOR_LOCAL_REHEARSAL_ONLY'||c.cluster!=='localnet'||c.rpcUrl!=='http://127.0.0.1:8899')throw Error('Local only');
 const p=decimal(c.p0ReferenceUsd),m=decimal(c.pmaxReferenceUsd);
 if(m.num*p.den!==3n*p.num*m.den)throw Error('Expected exact 3x range');
 if(integer(c.inventoryBaseUnits)>integer(c.absoluteMaximumBaseUnits))throw Error('Inventory cap');
 return c;
}
export function prepareMeteoraLocal(input:LocalInput,c:any=approved){
 validateLocalApproval(c);
 const allowed=['cluster','rpcUrl','identityScope','expectedMint','tokenA','tokenB','positionNftMint',...roles,'mintAccount','metadataSnapshot','solUsdTrialQuote','slippageBps','fixedFeeBps','permanentLock','vestingLock','revokeMintAuthority'];
 if(!input||Object.keys(input).some(k=>!allowed.includes(k)))throw Error('Unexpected preparation fields or operation flags');
 if(input.cluster!=='localnet'||input.rpcUrl!=='http://127.0.0.1:8899'||!['ISOLATED_LOCAL_PUBLIC_FIXTURE','ISOLATED_LOCAL_REHEARSAL'].includes(input.identityScope))throw Error('Only isolated local preparation; Mainnet/Devnet forbidden');
 if(input.permanentLock!==false||input.vestingLock!==false||input.revokeMintAuthority!==false)throw Error('Locks and authority revocation forbidden');
 if(!Number.isInteger(input.slippageBps)||input.slippageBps<0||input.slippageBps>100)throw Error('Explicit trial slippage 0..100 bps required');
 if(!Number.isInteger(input.fixedFeeBps)||input.fixedFeeBps<1||input.fixedFeeBps>100)throw Error('Explicit trial fixed fee 1..100 bps required');
 const addresses=roles.map(r=>key(input[r]));
 if(new Set(addresses.map(p=>p.toBase58())).size!==roles.length||addresses.some(p=>!PublicKey.isOnCurve(p.toBytes())))throw Error('Payer/custodian/authorities must be distinct on-curve public addresses');
 const mint=key(input.expectedMint),a=key(input.tokenA),b=key(input.tokenB),nft=key(input.positionNftMint);
 if(!a.equals(mint)||!b.equals(NATIVE_MINT)||a.equals(b))throw Error('Token A must be expected ROBUSTO; token B classic wrapped SOL');
 if(!PublicKey.isOnCurve(mint.toBytes())||!PublicKey.isOnCurve(nft.toBytes())||new Set([...addresses,mint,nft,NATIVE_MINT].map(p=>p.toBase58())).size!==8)throw Error('Separate local mint/NFT identities required');
 const historical=historicalAddresses();
 if([...addresses,mint,nft].some(p=>historical.has(p.toBase58())))throw Error('Historical Devnet identities cannot be reused');
 if(input.mintAccount.owner!==TOKEN_PROGRAM_ID.toBase58())throw Error('Classic SPL mint required');
 const data=Buffer.from(input.mintAccount.dataBase64,'base64');
 if(data.toString('base64')!==input.mintAccount.dataBase64||data.length!==82)throw Error('Exact canonical mint bytes required');
 const decoded=unpackMint(mint,{data,owner:TOKEN_PROGRAM_ID,lamports:0,executable:false,rentEpoch:0},TOKEN_PROGRAM_ID);
 if(!decoded.isInitialized||decoded.decimals!==6||decoded.supply!==integer(c.supplyBaseUnits)||decoded.freezeAuthority!==null||!decoded.mintAuthority?.equals(key(input.mintAuthority)))throw Error('Supply, decimals, freeze or mint authority mismatch');
 if(input.metadataSnapshot?.mint!==input.expectedMint||input.metadataSnapshot.updateAuthority!==input.metadataUpdateAuthority||input.metadataSnapshot.isMutable!==true)throw Error('Mutable metadata/update authority snapshot mismatch');
 if(input.solUsdTrialQuote===undefined)throw Error('REQUIRES_EXPLICIT_TRIAL_SOL_USD_QUOTE');
 const quote=decimal(input.solUsdTrialQuote);
 if(crypto.createHash('sha256').update(fs.readFileSync('scripts/meteora-local-idl.json')).digest('hex')!==IDL_SHA)throw Error('Pinned IDL hash mismatch');
 const sqrt=(price:string)=>{const p=decimal(price);return integerSqrt(p.num*quote.den*1000n*Q128/(p.den*quote.num));};
 const lo=sqrt(c.p0ReferenceUsd),hi=sqrt(c.pmaxReferenceUsd);
 // Exact program Q64.64 prices; quote decimals 9, ROBUSTO decimals 6.
 if(lo<4295048016n||hi>79226673521066979257578248091n||lo>=hi)throw Error('Protocol price limits or P0<Pmax violated');
 const inventory=integer(c.inventoryBaseUnits),liquidity=inventory*lo*hi/(hi-lo);
 if(liquidity<=0n||liquidity>U128)throw Error('Liquidity u128 overflow');
 const amountA=ceil(liquidity*(hi-lo),lo*hi);
 if(amountA!==inventory)throw Error('Inventory rounding mismatch');
 const pda=(seeds:Buffer[])=>PublicKey.findProgramAddressSync(seeds,PROGRAM)[0];
 const sorted=[a,b].sort((x,y)=>Buffer.compare(x.toBuffer(),y.toBuffer()));
 // PDA seed order is descending. Economic A/B order remains ROBUSTO/wSOL.
 const pool=pda([Buffer.from('cpool'),sorted[1].toBuffer(),sorted[0].toBuffer()]);
 const poolAuthority=new PublicKey('HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC');
 const accounts:Record<string,PublicKey>={creator:key(input.positionOwner),position_nft_mint:nft,
  position_nft_account:pda([Buffer.from('position_nft_account'),nft.toBuffer()]),payer:key(input.payer),
  pool_authority:poolAuthority,pool,position:pda([Buffer.from('position'),nft.toBuffer()]),token_a_mint:a,token_b_mint:b,
  token_a_vault:pda([Buffer.from('token_vault'),a.toBuffer(),pool.toBuffer()]),token_b_vault:pda([Buffer.from('token_vault'),b.toBuffer(),pool.toBuffer()]),
  payer_token_a:getAssociatedTokenAddressSync(a,key(input.payer)),payer_token_b:getAssociatedTokenAddressSync(b,key(input.payer)),
  token_a_program:TOKEN_PROGRAM_ID,token_b_program:TOKEN_PROGRAM_ID,token_2022_program:TOKEN_2022_PROGRAM_ID,
  system_program:SystemProgram.programId,event_authority:pda([Buffer.from('__event_authority')]),program:PROGRAM};
 const base=Buffer.alloc(27);base.writeBigUInt64LE(BigInt(input.fixedFeeBps)*100000n,0);
 const bn=(x:bigint)=>new BN(x.toString());
 const params={pool_fees:{base_fee:{data:Array.from(base)},compounding_fee_bps:0,padding:0,dynamic_fee:null},
  sqrt_min_price:bn(lo),sqrt_max_price:bn(hi),has_alpha_vault:false,liquidity:bn(liquidity),sqrt_price:bn(lo),
  activation_type:1,collect_fee_mode:1,activation_point:null};
 const coder=new BorshInstructionCoder(idl as Idl),definition=idl.instructions[0];
 const ix=new TransactionInstruction({programId:PROGRAM,data:coder.encode('initialize_customizable_pool',{params}),
  keys:definition.accounts.map(x=>({pubkey:accounts[x.name],isSigner:('signer' in x)&&x.signer===true,isWritable:('writable' in x)&&x.writable===true}))});
 if(ix.keys.some(k=>k.pubkey.equals(key(input.mintAuthority))||k.pubkey.equals(key(input.metadataUpdateAuthority))))throw Error('Token authorities must not be instruction accounts');
 return {status:c.status,mainnetStatus:'NOT_AUTHORIZED_FOR_MAINNET',execution:'UNSIGNED_INSTRUCTION_ONLY_NOT_EXECUTED',
  cluster:'localnet',rpcUrl:input.rpcUrl,solUsdTrialQuote:input.solUsdTrialQuote,
  verification:'OFFLINE_INPUT_VALIDATED_NOT_CHAIN_VERIFIED',slippageBps:input.slippageBps,
  slippageNote:'Creation uses exact price/liquidity, no slippage field in this instruction; tolerance is preparation policy only.',
  parameters:{sqrtMinPrice:lo.toString(),sqrtMaxPrice:hi.toString(),liquidity:liquidity.toString(),tokenABaseUnits:amountA.toString(),tokenBBaseUnits:'1'},
  requiredPublicSigners:[input.payer,input.positionNftMint],
  pending:['LOCAL_PROGRAM_DEPLOYMENT','LOCAL_ACCOUNTS_AND_CUSTODY','LOCAL_METADATA_ACCOUNT_VERIFICATION','RUNTIME_REHEARSAL_SEPARATE_AUTHORIZATION'],
  instruction:{programId:PROGRAM.toBase58(),accounts:ix.keys.map(k=>({address:k.pubkey.toBase58(),isSigner:k.isSigner,isWritable:k.isWritable})),dataBase64:ix.data.toString('base64')},
  authorityChanges:[],locks:[],signatures:[],sent:false};
}
/** Public test addresses only: no keypairs, no signers, no usable custody identities. */
export function localPublicFixture(solUsdTrialQuote?:string):LocalInput{
 const publicAddress=(label:string)=>{for(let i=0;;i++){const bytes=crypto.createHash('sha256').update(`ROBUSTO_PUBLIC_FIXTURE_${label}_${i}`).digest();if(PublicKey.isOnCurve(bytes))return new PublicKey(bytes).toBase58();}};
 const identities=Object.fromEntries(roles.map(r=>[r,publicAddress(r)])) as Record<typeof roles[number],string>;
 const mint=publicAddress('mint'),data=Buffer.alloc(82);
 MintLayout.encode({mintAuthorityOption:1,mintAuthority:key(identities.mintAuthority),supply:1000000000000000n,decimals:6,isInitialized:true,freezeAuthorityOption:0,freezeAuthority:PublicKey.default},data);
 return {cluster:'localnet',rpcUrl:'http://127.0.0.1:8899',identityScope:'ISOLATED_LOCAL_PUBLIC_FIXTURE',
  ...identities,expectedMint:mint,tokenA:mint,tokenB:NATIVE_MINT.toBase58(),positionNftMint:publicAddress('nft'),
  mintAccount:{owner:TOKEN_PROGRAM_ID.toBase58(),dataBase64:data.toString('base64')},
  metadataSnapshot:{mint,updateAuthority:identities.metadataUpdateAuthority,isMutable:true},
  solUsdTrialQuote,slippageBps:50,fixedFeeBps:25,permanentLock:false,vestingLock:false,revokeMintAuthority:false};
}
if(require.main===module){try{
 const [mode,file,...extra]=process.argv.slice(2);
 if(extra.length)throw Error('Unexpected arguments');
 if(mode==='validate'&&file===undefined)console.log(JSON.stringify({status:validateLocalApproval().status,conversion:'REQUIRES_EXPLICIT_TRIAL_SOL_USD_QUOTE',executionAuthorized:false},null,2));
 else if(mode==='prepare'&&file)console.log(JSON.stringify(prepareMeteoraLocal(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));
 else throw Error('Use validate or prepare PUBLIC_LOCAL_INPUT.json; never supply keys');
}catch(e){console.error((e as Error).message);process.exitCode=1;}}
