/** Public deterministic fixture export. No RPC, wallets, signatures or transport. */
import '../tests/offline-safety';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {localPublicFixture,prepareMeteoraLocal} from './robusto-meteora-local';
import {BN,BorshInstructionCoder,Idl} from '@coral-xyz/anchor';
import idl from './meteora-local-idl.json';
export function runtimeFixture(){
const input=localPublicFixture('100'); // explicit synthetic quote, never market data
const prepared=prepareMeteoraLocal(input);
const coder=new BorshInstructionCoder(idl as Idl);
const variants=Object.entries({zeroLiquidity:(p:any)=>{p.liquidity=new BN(0);},maxLiquidity:(p:any)=>{p.liquidity=new BN((2n**128n-1n).toString());},invalidRange:(p:any)=>{p.sqrt_min_price=p.sqrt_max_price;},invalidActivation:(p:any)=>{p.activation_type=255;},invalidFeeMode:(p:any)=>{p.collect_fee_mode=255;}}).map(([name,mutate])=>{const p=(coder.decode(Buffer.from(prepared.instruction.dataBase64,'base64'))!.data as any).params;mutate(p);return {name,dataBase64:coder.encode('initialize_customizable_pool',{params:p}).toString('base64')};});
return {schemaVersion:1,scope:'OFFLINE_FIXTURE_ONLY',authorization:false,
 mainnetStatus:'NOT_AUTHORIZED_FOR_MAINNET',mainnetDisabled:true,
 idlSha256:crypto.createHash('sha256').update(fs.readFileSync('scripts/meteora-local-idl.json')).digest('hex'),
 input,variants,parameters:prepared.parameters,instruction:{...prepared.instruction,
 accounts:prepared.instruction.accounts.map((a,i)=>({...a,name:idl.instructions[0].accounts[i].name}))}};
}
if(require.main===module)console.log(JSON.stringify(runtimeFixture(),null,2));
