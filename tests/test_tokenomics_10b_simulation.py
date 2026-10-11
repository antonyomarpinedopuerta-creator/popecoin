import copy
import importlib.util
import json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('simulation',ROOT/'scripts/simulate-robusto-tokenomics.py')
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
class TokenomicsSimulation(unittest.TestCase):
    def setUp(self):self.p=json.loads((ROOT/'config/robusto-tokenomics-10b-simulation.json').read_text())
    def test_conservation_and_no_cliff_accrual(self):
        r=m.simulate(self.p)
        self.assertEqual(r['sumBaseUnits'],'10000000000000000')
        amounts=[int(x['cumulativeVestedBaseUnits']) for x in r['founderVestingIllustration']]
        self.assertEqual(amounts[0],0)
        self.assertEqual(amounts[2],500_000_000_000)
        self.assertEqual(amounts[-1],1_000_000_000_000)
        self.assertEqual(amounts,sorted(amounts))
        self.assertFalse(r['operationsAuthorized'])
    def test_rejects_changed_conservation_identity_and_precision(self):
        for change in ['duplicate','founder','rounding','raw','floatDecimals']:
            p=copy.deepcopy(self.p)
            if change=='duplicate':p['allocations'][0]['label']='community'
            if change=='founder':p['allocations'][-1]['tokens']='1000001'
            if change=='rounding':p['allocations'][-1]['basisPoints']=True
            if change=='floatDecimals':p['decimalsAssumption']=6.0
            if change=='raw':p['supplyBaseUnits']='10000000000000001'
            with self.assertRaises(ValueError):m.simulate(p)
    def test_no_approval_or_implicit_adoption(self):
        for key,value in [('operationsAuthorized',True),('mainnetDisabled',False),('initialCirculationTokens','5000000'),('quoteLiquidity','1')]:
            p=copy.deepcopy(self.p);p[key]=value
            with self.assertRaises(ValueError):m.simulate(p)
    def test_calendar_months_not_silently_assumed(self):
        p=copy.deepcopy(self.p);p['founderVesting']['model']='CALENDAR_MONTHS'
        with self.assertRaises(ValueError):m.simulate(p)
