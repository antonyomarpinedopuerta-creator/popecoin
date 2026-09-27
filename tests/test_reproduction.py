import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('reproduce', Path(__file__).resolve().parents[1] / 'scripts/reproduce-release.py')
reproduce = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reproduce)


class ReproductionTests(unittest.TestCase):
    def test_each_missing_extra_or_different_artifact_fails(self):
        original = {name: 'a' * 64 for name in reproduce.OUTPUTS}
        reproduce.compare(original, dict(original))
        for name in reproduce.OUTPUTS:
            missing = dict(original)
            del missing[name]
            with self.assertRaisesRegex(ValueError, 'Incomplete'):
                reproduce.compare(original, missing)
            changed = dict(original)
            changed[name] = 'b' * 64
            with self.assertRaisesRegex(ValueError, 'differ'):
                reproduce.compare(original, changed)
        with self.assertRaisesRegex(ValueError, 'Incomplete'):
            reproduce.compare(original, {**original, 'wallet.json': 'c' * 64})
