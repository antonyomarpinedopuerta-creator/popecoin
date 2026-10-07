/** Offline preflight and independent floating-point economic comparison. No transport/signers. */
import {TRIAL} from './robusto-local-guard';
export const REVIEWED_COMMIT='a85c926607433f23f0ea60f4ca7b1ae92f4156cb';
export const REVIEWED_BINARY='a30610058262a5c87e1b22144ef6053ff2cd8bc9f97b7e978a51e28f8ec3ea3c';
export function validateFinalPreflight(p:any,now=Date.now()){
 if(p?.status!=='PASSED_READONLY_PREFLIGHT'||p.sourceCommit!==REVIEWED_COMMIT||p.binarySha256!==REVIEWED_BINARY||p.selectedEnvironment!=='localnet'||p.publicTransactions!==0||p.verifiedSourceInputs!==129)throw Error('Reviewed source/binary local preflight required');
 const age=now-Date.parse(p.checkedAtUtc);if(!Number.isFinite(age)||age<0||age>30*60*1000)throw Error('Fresh read-only preflight required');
 const m=p.observations?.['mainnet-beta'];if(m?.status!=='VERIFIED_BYTE_MATCH_AT_OBSERVED_SLOTS'||m.exactPrefixAndZeroPaddingMatch!==true||m.artifactSha256!==REVIEWED_BINARY)throw Error('Public binary changed; stop and reassess reachability');
 return p;
}
export function concentrationCostUsd(fraction:number){
 if(!(fraction>0&&fraction<1))throw Error('Fraction must be within inventory');
 const p0=0.000788675,inventory=1000000,a=1-1/Math.sqrt(3);
 return inventory*p0*fraction/(1-a*fraction); // Net B, without fixed fees or rounding.
}
export function concentrationBaseUnitTolerance(minSqrt:bigint){
 if(minSqrt<=0n)throw Error('Positive sqrt required');
 const denominator=minSqrt*minSqrt;
 // Three quote lamports cover amount/fee ceilings, plus two output base units.
 // dA_base/dB_lamport <= Q128/minSqrt^2 throughout the approved range.
 return (3n*(1n<<128n)+denominator-1n)/denominator+2n;
}
export function continuousSwap(liquidity:bigint,sqrt:bigint,amount:bigint,buy:boolean){
 const L=Number(liquidity),s=Number(sqrt),x=Number(amount),Q=2**128,fee=TRIAL.fixedFeeBps/10000;
 const next=buy?s+x*(1-fee)*Q/L:L*s/(L+x*s);
 const out=buy?L*(next-s)/(next*s):L*(s-next)/Q*(1-fee);
 return {next,out,priceMovementPercent:(next*next/(s*s)-1)*100};
}
