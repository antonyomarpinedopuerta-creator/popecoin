import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('runtime_gate',ROOT/'scripts/check-unsigned-runtime.py')
gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)
class RuntimeEvidenceTests(unittest.TestCase):
    def setUp(self):self.records=json.loads((ROOT/'tests/fixtures/unsigned-runtime-receipts.json').read_text())['records']
    def stdout(self,records=None):return '\n'.join(gate.MARKERS+[f'RUNTIME_EVIDENCE {json.dumps(r)}' for r in (self.records if records is None else records)])
    def test_complete_real_reference_records_accepted(self):self.assertEqual(gate.evaluate(self.stdout(),0),self.records)
    def test_failed_incomplete_or_duplicate_suite_rejected(self):
        for output,code in [(self.stdout(),1),(self.stdout().replace(gate.MARKERS[0],''),0),(self.stdout()+gate.MARKERS[0],0),(self.stdout(self.records[:-1]),0)]:
            with self.assertRaises(ValueError):gate.evaluate(output,code)
    def test_authorization_inconsistent_commit_and_invalid_digests_rejected(self):
        for index,change in [(0,{'authorization':True}),(0,{'nativeAtomicityVerified':True}),(0,{'messageSha256':'x'*64}),
                             (0,{'executedInstructions':False}),(0,{'executedInstructions':999}),(0,{'stagedSha256':'0'*64}),
                             (1,{'committedSha256':'0'*64}),(3,{'committedSha256':'0'*64})]:
            data=copy.deepcopy(self.records);data[index].update(change)
            with self.assertRaises(ValueError):gate.evaluate(self.stdout(data),0)
if __name__=='__main__':unittest.main()
