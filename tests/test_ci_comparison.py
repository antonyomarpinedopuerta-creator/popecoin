import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('comparison', Path(__file__).resolve().parent.parent / 'scripts/compare-builds.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ComparisonTests(unittest.TestCase):
    def fixture(self):
        return dict(schemaVersion=1, status='passed', dirty=False, head='a'*40, sourceHashes={'source':'a'*64},
                    checks=[{'command': c, 'exitCode': 0} for c in m.rc.COMMANDS], artifacts={p:'b'*64 for p in m.rc.ARTIFACTS})

    def test_matching_reports(self):
        r = self.fixture()
        self.assertEqual(m.compare([r, copy.deepcopy(r)], r['head'], r['sourceHashes'])['status'], 'passed')

    def test_stale_incomplete_dirty_and_different_builds(self):
        r = self.fixture()
        for field, value in [('status','incomplete'), ('dirty',True), ('head','other'), ('checks',[]),
                             ('sourceHashes',{}), ('artifacts',{})]:
            bad = copy.deepcopy(r); bad[field] = value
            with self.subTest(field=field), self.assertRaises(ValueError): m.compare([r,bad],r['head'],r['sourceHashes'])
        bad = copy.deepcopy(r); bad['artifacts'][m.rc.ARTIFACTS[0]] = 'c'*64
        with self.assertRaises(ValueError): m.compare([r,bad],r['head'],r['sourceHashes'])
        with self.assertRaises(ValueError): m.compare([r],r['head'],r['sourceHashes'])
