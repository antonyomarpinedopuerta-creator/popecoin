/** Reconcile local instruction receipts ONLY. No authorization, network confirmation or retry. */
import {FixtureOutcome,reconcileFixtureOutcome} from './robusto-fixture-reconciliation';
export type RuntimeFixtureReceipt={schemaVersion:1;scope:'OFFLINE_FIXTURE_ONLY';authorization:false;
 mainnetDisabled:true;nativeAtomicityVerified:false;syntheticSignerPermissions:true;retryAllowed:false;
 messageSha256:string;beforeSha256:string;committedSha256:string;stagedSha256:string;
 status:'COMPLETE'|'FAILED'|'INTERRUPTED'|'INVALID_FIXTURE';plannedInstructions:number;executedInstructions:number;computeUnits:number};
export type RuntimeExpectation=Omit<FixtureOutcome,'observation'> & {observation:{slot:number;atMs:number;fee:string;maxFee:string}};
export function reconcileRuntimeFixture(directory:string,receipt:RuntimeFixtureReceipt,expected:RuntimeExpectation){
 const sha=(s:unknown)=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
 const count=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0;
 if(!receipt||receipt.schemaVersion!==1||receipt.scope!=='OFFLINE_FIXTURE_ONLY'||receipt.authorization!==false||
    receipt.mainnetDisabled!==true||receipt.nativeAtomicityVerified!==false||receipt.syntheticSignerPermissions!==true||receipt.retryAllowed!==false||
    ![receipt.messageSha256,receipt.beforeSha256,receipt.committedSha256,receipt.stagedSha256].every(sha)||
    ![receipt.plannedInstructions,receipt.executedInstructions,receipt.computeUnits].every(count)||
    receipt.executedInstructions>receipt.plannedInstructions||!['COMPLETE','FAILED','INTERRUPTED','INVALID_FIXTURE'].includes(receipt.status))
  throw Error('Incomplete or non-fixture runtime receipt');
 const matches=receipt.messageSha256===expected.messageSha256&&receipt.beforeSha256===expected.beforeSha256;
 const complete=receipt.status==='COMPLETE'&&receipt.plannedInstructions>0&&receipt.executedInstructions===receipt.plannedInstructions&&
   receipt.committedSha256===receipt.stagedSha256&&receipt.computeUnits>0;
 const failed=receipt.status==='FAILED'&&receipt.executedInstructions>0&&receipt.committedSha256===receipt.beforeSha256&&receipt.computeUnits>0;
 const status=matches&&complete?'CONFIRMED':matches&&failed?'FAILED':'UNKNOWN';
 const result=reconcileFixtureOutcome(directory,{...expected,observation:{...expected.observation,
  messageSha256:receipt.messageSha256,stateSha256:receipt.committedSha256,status}});
 return Object.freeze({...result,nativeAtomicityVerified:false as const,
  rawEffectsDiscarded:receipt.committedSha256!==receipt.stagedSha256,
  evidence:'SELF_REPORTED_LOCAL_RUNTIME_FIXTURE_NOT_NETWORK_CONFIRMATION' as const});
}
