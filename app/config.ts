import fs from 'node:fs';
import {PublicKey} from '@solana/web3.js';
import {requireMainnetReadOnly,MAINNET_GENESIS,protectedAddresses} from '../scripts/robusto-production';
export type ReaderConfig={profile:string;cluster:string;rpc:string;genesisHash:string;program:string;mint:string;symbol:string;decimals:number;beneficiaries:Record<string,string>;mainnetMode?:string};
export function validateReaderConfig(p:any,optIn:unknown=undefined):ReaderConfig {
 if(p.cluster==='mainnet-beta'){
  requireMainnetReadOnly(p,optIn);
  if(protectedAddresses().has(p.program)||protectedAddresses().has(p.mint))throw Error('Historical identities cannot be relabeled as production ROBUSTO');
  if(p.profile!=='ROBUSTO_MAINNET_READ_ONLY'||p.symbol!=='ROBUSTO'||p.genesisHash!==MAINNET_GENESIS)throw Error('Production reader not verified/configured');
 }else if(p.cluster==='devnet'){
  if(p.profile!=='HISTORICAL_PAPA_DEVNET'||p.symbol!=='PAPA'||p.rpc!=='https://api.devnet.solana.com'||p.genesisHash!=='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'||p.program!=='BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc'||p.mint!=='ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw')throw Error('Historical identity/branding mismatch');
 }else throw Error('Unsupported reader network');
 for(const k of [p.program,p.mint])if(typeof k!=='string'||new PublicKey(k).equals(PublicKey.default))throw Error('Reader public identity pending');
 if(p.decimals!==6||!p.beneficiaries||typeof p.beneficiaries!=='object'||Array.isArray(p.beneficiaries)||!Object.keys(p.beneficiaries).length)throw Error('Reader beneficiaries/decimals pending');
 for(const [role,value] of Object.entries(p.beneficiaries)){
  if(! /^[a-z][a-z0-9_-]{0,63}$/.test(role)||['constructor','__proto__','prototype'].includes(role)||typeof value!=='string'||!PublicKey.isOnCurve(new PublicKey(value).toBytes()))throw Error('Invalid beneficiary config');
 }
 return p;
}
export function loadReaderConfig(){return validateReaderConfig(JSON.parse(fs.readFileSync(process.env.ROBUSTO_APP_CONFIG??'config/app-reader.json','utf8')),process.env.ROBUSTO_MAINNET_READONLY);}
