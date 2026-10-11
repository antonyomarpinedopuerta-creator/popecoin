import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('alternative',Path(__file__).resolve().parents[1]/'scripts/check-10b9-runtime.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class AlternativeEvidence(unittest.TestCase):
    def test_fail_closed(self):
        markers=['creation passed','swaps passed']
        module.evaluate('creation passed\nswaps passed',0,markers)
        for stdout,code in [('creation passed',0),('creation passed\nswaps passed',1),('creation passed\nswaps passed\nswaps passed',0)]:
            with self.assertRaises(ValueError):module.evaluate(stdout,code,markers)
