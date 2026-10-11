import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('package',Path(__file__).resolve().parents[1]/'scripts/package-external-audit.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class AuditPackage(unittest.TestCase):
    def test_deterministic_order(self):
        a={'code.rs':b'public code','docs/notes.md':b'offline'}
        self.assertEqual(m.archive_bytes(a,'a'*40),m.archive_bytes(dict(reversed(list(a.items()))),'a'*40))
    def test_reject_secret_names_and_content(self):
        for data in [{'wallet.json':b'{}'},{'code.rs':b'-----BEGIN '+b'PRIVATE KEY-----'}]:
            with self.assertRaises(ValueError):m.archive_bytes(data,'a'*40)
    def test_stale_and_false_claims_rejected(self):
        report=dict(custodyCases=7,status='passed',head='a'*40,sourceHashes={},scope='OFFLINE_FIXTURE_ONLY',authorization=False,mainnetDisabled=True,mainnetStatus='NOT_AUTHORIZED_FOR_MAINNET',nativeAtomicityVerified=False,productionExecutionVerified=False,profile='PROPOSED_NOT_APPROVED_10B9_USDC6',legacySuites={'baselineInstructions':24,'boundedSequences':8,'meteora':20,'meteoraLiquidity':13,'meteoraSwaps':12,'adversarialScenarios':15},suites={'supplyVesting':{'cases':11},'meteora9USDC6':{'cases':47}})
        m.validate_report(report,'a'*40,{})
        for key,value in [('head','b'*40),('authorization',True),('nativeAtomicityVerified',True),('productionExecutionVerified',True),('suites',{}),('custodyCases',0)]:
            with self.assertRaises(ValueError):m.validate_report(dict(report,**{key:value}),'a'*40,{})
