/** Offline approved-policy validation and unapproved date arithmetic only. No RPC/signers. */
import fs from 'node:fs';
import {integer,SUPPLY,validateApprovedEconomics} from './robusto-production';
const DAY=86400n;
export function validateLaunchPolicy(p:any,economics:any){
 validateApprovedEconomics(economics);
 if(p?.status!=='APPROVED_PREPARATION_POLICY_ONLY'||p.mainnetStatus!=='NOT_AUTHORIZED_FOR_MAINNET'||p.economicsApprovalPath!=='config/robusto-economics-approved.json')throw Error('Limited preparation policy required');
 for(const k of ['mainnetAuthorized','mintAuthorized','transfersAuthorized','publicationAuthorized','paymentsAuthorized','signingAuthorized','authorityRevocationAuthorized'])if(p[k]!==false)throw Error('Preparation policy cannot authorize operations');
 const c=p.initialCirculation;
 const expected={maximumTokens:'5000000',maximumBaseUnits:'5000000000000',basisPoints:50,marketMaximumTokens:'3000000',marketMaximumBaseUnits:'3000000000000',communityMaximumTokens:'2000000',communityMaximumBaseUnits:'2000000000000',reserveMaximumTokens:'0',teamMaximumTokens:'0',automaticTransfers:false,effectiveMarketTokens:null,effectiveCommunityTokens:null};
 if(!c||Object.entries(expected).some(([k,v])=>c[k]!==v))throw Error('Approved caps or pending effective amounts mismatch');
 const cap=integer(c.maximumTokens),market=integer(c.marketMaximumTokens),community=integer(c.communityMaximumTokens);
 if(market+community!==cap||cap*1000000n!==integer(c.maximumBaseUnits)||integer(c.maximumBaseUnits)*10000n!==SUPPLY*BigInt(c.basisPoints))throw Error('Initial cap arithmetic mismatch');
 const rows=new Map<string,any>(economics.buckets.map((r:any)=>[r.label,r]));
 for(const [key,label,wait,linear,tokens] of [['teamVesting','team_founder',365,730,'50000000'],['reserveVesting','reserve',180,1095,'300000000']] as const){
  const v=p[key];if(!v||v.totalTokens!==tokens||v.totalBaseUnits!==rows.get(label).baseUnits||integer(v.totalTokens)*1000000n!==integer(v.totalBaseUnits)||v.waitDays!==wait||v.linearDays!==linear||v.accrualDuringWait!==false||v.baseUtc!==null||v.beneficiary!==null)throw Error('Approved vesting terms or pending date/beneficiary mismatch');
 }
 if(p.reserveVesting.technicalLockRequired!==true)throw Error('Reserve requires technical lock');
 const comm=p.community;
 if(!comm||comm.initialMaximumTokens!==c.communityMaximumTokens||comm.outsideInitialCirculationTokens!=='148000000'||comm.outsideInitialCirculationBaseUnits!=='148000000000000'||integer(comm.outsideInitialCirculationTokens)+community!==integer(rows.get('community_marketing').tokens)||integer(comm.outsideInitialCirculationTokens)*1000000n!==integer(comm.outsideInitialCirculationBaseUnits)||comm.automaticFutureDisbursements!==false||comm.separateCampaignDecisionRequired!==true)throw Error('Community campaign approval or arithmetic mismatch');
 const wallets=p.custody?.wallets,roles=['market','community','reserve','team','payer','mintAuthority','metadataUpdateAuthority','upgradeAuthority'];
 if(p.custody?.rolesSeparate!==true||p.custody.definitiveIdentityCreationAuthorized!==false||!wallets||Object.keys(wallets).length!==roles.length||roles.some(r=>wallets[r]!==null))throw Error('Separate custody roles must remain pending without key creation');
 if(p.mintAuthorityPolicy!=='ISSUE_EXACT_TOTAL_RECONCILE_THEN_SEPARATE_REVOCATION_DECISION'||p.metadataMutable!==true||p.retainMetadataUpdateAuthority!==true)throw Error('Authority policy mismatch');
 return {status:p.status,mainnetStatus:p.mainnetStatus,initialMaximumTokens:cap.toString(),initialMaximumBaseUnits:c.maximumBaseUnits,outsideInitialStageMinimumTokens:(SUPPLY/1000000n-cap).toString(),marketTreasuryMinimumTokens:(integer(rows.get('market_ecosystem_launch').tokens)-market).toString(),communityTreasuryMinimumTokens:comm.outsideInitialCirculationTokens,teamWaitDays:365,teamLinearDays:730,reserveWaitDays:180,reserveLinearDays:1095,operationsAuthorized:false,effectiveAmountsAndDates:'PENDING_OWNER_DECISION'};
}
export function proposedVestingSchedules(p:any,economics:any,baseUtc:string){
 validateLaunchPolicy(p,economics);
 if(typeof baseUtc!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(baseUtc))throw Error('Canonical whole-second UTC base required');
 const ms=Date.parse(baseUtc);
 if(!Number.isSafeInteger(ms)||ms<0||new Date(ms).toISOString().replace('.000Z','Z')!==baseUtc)throw Error('Invalid UTC base');
 const base=BigInt(ms/1000),schedules:Record<string,any>={};
 for(const role of ['teamVesting','reserveVesting']){
  const v=p[role],start=base+BigInt(v.waitDays)*DAY,end=start+BigInt(v.linearDays)*DAY;
  const utc=(n:bigint)=>{const ms=n*1000n;if(ms>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Date out of range');return new Date(Number(ms)).toISOString().replace('.000Z','Z');};
  schedules[role]={totalBaseUnits:v.totalBaseUnits,start:start.toString(),cliff:start.toString(),end:end.toString(),startUtc:utc(start),cliffUtc:utc(start),endUtc:utc(end)};
 }
 return {status:'PROPOSED_DATES_NOT_APPROVED',baseUtc,schedules,note:'Pure date calculation, not a config update. No RPC, blockhash, signing, identities or submission.'};
}
if(require.main===module){try{
 const [mode='validate',base,...extra]=process.argv.slice(2);
 const p=JSON.parse(fs.readFileSync('config/robusto-launch-policy-approved.json','utf8')),e=JSON.parse(fs.readFileSync('config/robusto-economics-approved.json','utf8'));
 if(extra.length||!['validate','dates'].includes(mode)||(mode==='validate'&&base!==undefined)||(mode==='dates'&&base===undefined))throw Error('Use validate or dates YYYY-MM-DDTHH:MM:SSZ');
 console.log(JSON.stringify(mode==='dates'?proposedVestingSchedules(p,e,base!):validateLaunchPolicy(p,e),null,2));
}catch(error){console.error((error as Error).message);process.exitCode=1;}}
