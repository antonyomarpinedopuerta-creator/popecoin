import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('public_gate', Path(__file__).resolve().parents[1] / 'scripts/check-public.py')
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class PublicFilesTests(unittest.TestCase):
    def test_sensitive_names_are_rejected_but_public_policy_docs_are_allowed(self):
        for name in ['.env', '.env.local', 'keys.json', 'sub/id.json', 'sub/vesting-keypair.json', 'wallet.json', 'seed.json', 'a.pem', '../outside']:
            self.assertTrue(gate.sensitive_name(name), name)
        for name in ['docs/PRODUCTION_WALLET_POLICY.md', 'config/production-plan.json', 'package.json']:
            self.assertFalse(gate.sensitive_name(name), name)

    def test_patterns_redact_synthetic_markers_and_key_arrays(self):
        # Construct markers so the test source never contains credential-like literals.
        for data in [b'-----BEGIN ' + b'PRIVATE KEY-----', b'ghp_' + b'x' * 25,
                     b'AKIA' + b'X' * 16, ('[' + ','.join(['0'] * 64) + ']').encode()]:
            self.assertTrue(gate.scan_bytes(data))
        self.assertFalse(gate.scan_bytes(b'{"mint":null,"startUtc":null}'))

    def test_sensitive_filename_is_never_opened(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.object(gate.subprocess, 'check_output', side_effect=[b'wallet.json\0', '']), patch.object(Path, 'read_bytes', side_effect=AssertionError('Must not read')):
                with self.assertRaisesRegex(ValueError, 'without opening'):
                    gate.check(root)
