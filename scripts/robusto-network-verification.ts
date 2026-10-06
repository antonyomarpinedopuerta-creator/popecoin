/** Future authorized read-only Mainnet post-deployment verification, never an executor. */
import {BorshAccountsCoder,Idl} from '@coral-xyz/anchor';
import {Connection,PublicKey} from '@solana/web3.js';
import {getAssociatedTokenAddressSync,TOKEN_PROGRAM_ID,unpackMint,unpackAccount} from '@solana/spl-token';
import {publicKey,lamports} from '@metaplex-foundation/umi';
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults';
import {mplTokenMetadata,findMetadataPda} from '@metaplex-foundation/mpl-token-metadata';
import {LOADER} from './rehearsal-one-tx';
import {address,validateProduction,requireMainnetReadOnly,assertMainnet,verifyProgramAccounts,verifyMetadataAccount,reconcileDistribution} from './robusto-production';
export async function verifyProductionSnapshot(c:Connection,p:any,idl:Idl,elf:Buffer,network:any,optIn:unknown){
 requireMainnetReadOnly(network,optIn);if(c.rpcEndpoint!==network.rpc)throw Error('RPC endpoint mismatch');
 const rows=validateProduction(p);if(idl.address!==p.program)throw Error('IDL identity mismatch');await assertMainnet(c);
 const program=address(p.program),mint=address(p.mint),authority=address(p.mintAuthority),source=getAssociatedTokenAddressSync(mint,authority);
 const [pd]=PublicKey.findProgramAddressSync([program.toBuffer()],LOADER);
 const umi=createUmi('http://127.0.0.1:8899').use(mplTokenMetadata()),[metadata]=findMetadataPda(umi,{mint:publicKey(p.mint)});
 const keys=[program,pd,mint,source,new PublicKey(metadata)];
 const positions=rows.map(a=>{const beneficiary=address(a.beneficiary),ata=getAssociatedTokenAddressSync(mint,beneficiary),index=keys.length;keys.push(ata);
  if(a.vesting){const [v,bump]=PublicKey.findProgramAddressSync([Buffer.from('vesting'),beneficiary.toBuffer(),mint.toBuffer()],program),[vault]=PublicKey.findProgramAddressSync([Buffer.from('vault'),v.toBuffer()],program);keys.push(v,vault);return {a,index,v,vault,bump};}return {a,index};});
 if(keys.length>100)throw Error('Atomic snapshot exceeds RPC limit; independently reviewed batching required');
 const {context,value}=await c.getMultipleAccountsInfoAndContext(keys,'finalized');
 const binary=verifyProgramAccounts(value[0],value[1],p,elf),m=unpackMint(mint,value[2],TOKEN_PROGRAM_ID);
 if(!value[2]||value[2].executable||value[2].data.length!==82||value[2].data[45]!==1||![0,1].includes(value[2].data.readUInt32LE(0))||![0,1].includes(value[2].data.readUInt32LE(46))||!m.isInitialized)throw Error('Invalid classic mint');
 function token(index:number,owner:PublicKey){const info=value[index];if(!info||info.executable||info.data.length!==165||info.data[108]!==1||![0,1].includes(info.data.readUInt32LE(72))||![0,1].includes(info.data.readUInt32LE(109))||![0,1].includes(info.data.readUInt32LE(129)))throw Error('Invalid classic token account');
  const t=unpackAccount(keys[index],info,TOKEN_PROGRAM_ID);if(!t.isInitialized||t.isFrozen||!t.mint.equals(mint)||!t.owner.equals(owner)||t.delegate||t.closeAuthority||t.isNative||t.delegatedAmount!==0n)throw Error('Token identity/state/powers mismatch');return t;}
 const sourceState=token(3,authority),mi=value[4];if(!mi)throw Error('Metadata absent');
 const metadataState=verifyMetadataAccount({exists:true,publicKey:publicKey(metadata),owner:publicKey(mi.owner.toBase58()),executable:mi.executable,data:mi.data,lamports:lamports(mi.lamports)},p);
 const coder=new BorshAccountsCoder(idl);
 const accountName=idl.accounts?.find(a=>a.name.toLowerCase().replace('_','')==='vestingaccount')?.name;if(!accountName)throw Error('Vesting schema missing');
 const allocations=positions.map(pos=>{const balance=token(pos.index,address(pos.a.beneficiary)).amount.toString();
  if(!pos.v)return {label:pos.a.label,beneficiary:pos.a.beneficiary,balance};
  const info=value[pos.index+1];if(!info||info.executable||!info.owner.equals(program)||info.data.length!==145)throw Error('Invalid vesting account');
  const v=coder.decode(accountName,info.data),vault=token(pos.index+2,pos.v).amount;
  if(v.authority.toBase58()!==p.mintAuthority||v.beneficiary.toBase58()!==pos.a.beneficiary||v.mint.toBase58()!==p.mint||v.bump!==pos.bump)throw Error('Vesting identity mismatch');
  return {label:pos.a.label,beneficiary:pos.a.beneficiary,balance,total:v.total_amount.toString(),released:v.released_amount.toString(),vault:vault.toString(),start:v.start_time.toString(),cliff:v.cliff_time.toString(),end:v.end_time.toString()};
 });
 const snapshot={supply:m.supply.toString(),source:sourceState.amount.toString(),decimals:m.decimals,freezeAuthority:m.freezeAuthority?.toBase58()??null,mintAuthority:m.mintAuthority?.toBase58()??null,allocations};
 const reconciliation=reconcileDistribution(p,snapshot);await assertMainnet(c);
 return {status:'READ_ONLY_MAINNET_INITIAL_STATE_VERIFIED',commitment:'finalized',slot:context.slot,binary,metadata:metadataState,snapshot,reconciliation};
}
