#!/usr/bin/env python3
"""Pure integer model: no Solana SDK, RPC, keys, signatures or transactions."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
U64 = 2**64 - 1

def simulate(p):
    if (p.get('status') != 'PROPOSED_NOT_APPROVED' or p.get('scope') != 'OFFLINE_FIXTURE_ONLY'
            or p.get('mainnetStatus') != 'NOT_AUTHORIZED_FOR_MAINNET'
            or p.get('mainnetDisabled') is not True or p.get('operationsAuthorized') is not False):
        raise ValueError('Only unauthorized offline proposals accepted')
    def integer(value):
        if not isinstance(value, str) or not value.isascii() or not value.isdecimal() or str(int(value)) != value:
            raise ValueError('Canonical nonnegative integer required')
        return int(value)
    if (type(p.get('decimalsAssumption')) is not int or p.get('decimalsAssumption') != 6 or p.get('fixedSupplyProposed') is not True
            or p.get('additionalIssuanceProposed') is not False or p.get('founderPersonalFunding') != '0'):
        raise ValueError('Model assumptions changed')
    supply = integer(p['supplyTokens'])
    scale = 10**p['decimalsAssumption']
    raw = integer(p['supplyBaseUnits'])
    if supply != 10_000_000_000 or raw != supply * scale or raw > U64:
        raise ValueError('Supply/base units mismatch')
    expected = {'liquidity_market':4_000_000_000, 'community':3_000_000_000,
                'strategic_reserve':1_500_000_000, 'development_operations':1_499_000_000,
                'founder':1_000_000}
    rows = p['allocations']
    if len(rows) != len(expected) or len({r['label'] for r in rows}) != len(rows):
        raise ValueError('Missing or duplicate allocation')
    for row in rows:
        amount = integer(row['tokens'])
        bps = row['basisPoints']
        if (expected.get(row['label']) != amount or type(bps) is not int
                or amount * 10000 != supply * bps):
            raise ValueError('Allocation/percentage mismatch')
    if sum(integer(r['tokens']) for r in rows) != supply or sum(r['basisPoints'] for r in rows) != 10000:
        raise ValueError('Conservation failed')
    v = p['founderVesting']
    if (v.get('requestedLockMonths') != 12 or v.get('requestedLinearMonths') != 24
            or v.get('model') != 'FIXED_DAYS_ILLUSTRATION_NOT_CALENDAR_MONTHS'
            or v.get('lockDaysAssumption') != 365 or v.get('linearDaysAssumption') != 730
            or v.get('accrualDuringLock') is not False or v.get('beneficiary') is not None
            or v.get('baseUtc') is not None):
        raise ValueError('Unsupported or approved schedule')
    if any(p.get(k) is not None for k in ['initialCirculationTokens','otherBucketSchedules','price','quoteLiquidity']):
        raise ValueError('Effective economic decisions must remain pending')
    founder = expected['founder'] * scale
    releases = [{'dayFromFictionalBase':365+d,'cumulativeVestedBaseUnits':str(founder*d//730)}
                for d in [0,182,365,547,730]]
    return {'status':'SIMULATED_NOT_APPROVED','scope':p['scope'],'operationsAuthorized':False,
            'mainnetStatus':'NOT_AUTHORIZED_FOR_MAINNET','mainnetDisabled':True,
            'sumTokens':str(supply),'sumBaseUnits':str(raw),'founderBasisPoints':1,
            'founderVestingIllustration':releases,
            'initialCirculation':'UNKNOWN_NOT_APPROVED',
            'initialScenarios':[{'label':'NO_LAUNCH','tokens':'0','basisPoints':0},
                                {'label':'ILLUSTRATIVE_ONLY','tokens':'5000000','basisPoints':5}],
            'futureCirculation':'UNKNOWN: vested is not necessarily released or circulating',
            'otherBuckets':'NO_SCHEDULE_APPROVED; do not count as technically locked'}

if __name__ == '__main__':
    print(json.dumps(simulate(json.loads((ROOT/'config/robusto-tokenomics-10b-simulation.json').read_text())),indent=2))
