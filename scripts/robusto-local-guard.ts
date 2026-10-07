/** Fail closed before every rehearsal signature. No key loading or public RPC. */
import fs from 'node:fs';
import path from 'node:path';
import {PublicKey} from '@solana/web3.js';
import {historicalAddresses,validateLocalApproval} from './robusto-meteora-local';
import config from '../config/robusto-meteora-local.json';

export const LOCAL_RPC='http://127.0.0.1:8899';
export const TRIAL={label:'TEST_ONLY_NOT_A_MARKET_QUOTE',solUsd:'100',fixedFeeBps:25,slippageBps:50} as const;
export interface LocalBinding {cluster:string;rpcUrl:string;session:string;genesisHash:string;validatorIdentity:string;signers:string[];approvedParameters:unknown;quoteLabel:string;quote:string;active:boolean;}
export function validateLocalBinding(binding:LocalBinding,observed:{genesisHash:string;validatorIdentity:string},signers:string[]){
 validateLocalApproval();
 if(binding.cluster!=='localnet'||binding.rpcUrl!==LOCAL_RPC)throw Error('Only exact loopback local RPC allowed');
 if(!/^[0-9a-f-]{36}$/.test(binding.session)||binding.active!==true)throw Error('Inactive/invalid temporary rehearsal session');
 if(binding.quoteLabel!==TRIAL.label||binding.quote!==TRIAL.solUsd)throw Error('Exact TEST_ONLY conversion required');
 if(JSON.stringify(binding.approvedParameters)!==JSON.stringify(config))throw Error('Approved rehearsal parameters changed');
 for(const value of [binding.genesisHash,binding.validatorIdentity,observed.genesisHash,observed.validatorIdentity])new PublicKey(value);
 if(binding.genesisHash!==observed.genesisHash||binding.validatorIdentity!==observed.validatorIdentity)throw Error('Local genesis or validator identity mismatch');
 const historical=historicalAddresses();
 if(new Set(binding.signers).size!==binding.signers.length||binding.signers.some(x=>historical.has(x)))throw Error('Historical or duplicate rehearsal identity');
 for(const signer of signers)if(historical.has(signer)||!binding.signers.includes(signer)||!PublicKey.isOnCurve(new PublicKey(signer).toBytes()))throw Error('Unknown/historical signer');
}
export function privateLocalPath(root:string,session:string,file:string){
 if(!/^[0-9a-f-]{36}$/.test(session)||!/^([a-z0-9-]+\.json|cli\.yml)$/.test(file))throw Error('Invalid private rehearsal path');
 const base=path.join(path.resolve(root),'.robusto-local-private');
 const result=path.join(base,session,file);
 for(const candidate of [base,path.dirname(result),result])if(fs.existsSync(candidate)&&fs.lstatSync(candidate).isSymbolicLink())throw Error('Private path symlink rejected');
 if(path.relative(base,result).startsWith('..')||result.includes('/.config/solana/'))throw Error('Global/outside key path forbidden');
 return result;
}
/** Separate exact arithmetic oracle for concentrated swaps, fixed fees only. */
export function modelSwap(liquidity:bigint,sqrt:bigint,min:bigint,max:bigint,amount:bigint,buy:boolean,partial=false){
 if(liquidity<=0n||sqrt<min||sqrt>max||amount<=0n)throw Error('Invalid model inputs');
 const fee=(v:bigint)=>(v*25n+9999n)/10000n;
 if(buy){
  let used=amount,net=amount-fee(amount),next=sqrt+((net<<128n)/liquidity);
  if(next>max){if(!partial)throw Error('Range exceeded');net=(liquidity*(max-sqrt)+(1n<<128n)-1n)>>128n;used=(net*10000n+9974n)/9975n;next=max;}
  return {used,fee:used-net,next,out:liquidity*(next-sqrt)/(next*sqrt)};
 }
 const next=(liquidity*sqrt+liquidity+amount*sqrt-1n)/(liquidity+amount*sqrt);
 if(next<min)throw Error('Range exceeded');
 const gross=(liquidity*(sqrt-next))>>128n;
 return {used:amount,fee:fee(gross),next,out:gross-fee(gross)};
}
