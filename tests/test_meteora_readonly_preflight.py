import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import base64
import contextlib
import hashlib
import io
import json
import tempfile
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location('meteora_preflight', Path(__file__).resolve().parents[1] / 'scripts/robusto-meteora-readonly-preflight.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ReadOnlyPreflight(unittest.TestCase):
    def test_non_readonly_methods_and_other_endpoints_never_reach_network(self):
        with patch.object(module.urllib.request, 'urlopen') as network:
            for method in ['sendTransaction', 'requestAirdrop', 'simulateTransaction']:
                with self.assertRaises(ValueError):
                    module.request('https://api.mainnet-beta.solana.com', {'method': method, 'params': [module.PROGRAM]})
            with self.assertRaises(ValueError):
                module.request('https://example.invalid')
            with self.assertRaises(ValueError):
                module.request('https://api.mainnet-beta.solana.com', {'method': 'getAccountInfo', 'params': ['arbitrary-wallet']})
            network.assert_not_called()

    def test_report_and_three_program_files_are_separate_and_not_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / 'target/meteora-official'
            (target / 'build').mkdir(parents=True)
            source = target / ('damm-v2-' + module.COMMIT)
            source.mkdir()
            code = b'\x7fELF-test-public-bytecode'
            (target / 'build/cp_amm.so').write_bytes(code)
            (source / 'dummy.rs').write_bytes(b'public-source')
            (target / 'build-record.json').write_text(json.dumps({'sourceHashes': {'dummy.rs': hashlib.sha256(b'public-source').hexdigest()}}))
            fake = SimpleNamespace(LOADER='upgradeable', verify=lambda *args: {'exactPrefixAndZeroPaddingMatch': True})
            def response(url, payload=None):
                if payload is None:
                    return {'sha': module.COMMIT}
                return {'result': {'context': {'slot': 1}, 'value': {'owner': 'BPFLoader2111111111111111111111111111111111',
                        'executable': True, 'data': [base64.b64encode(code).decode(), 'base64']}}}
            with patch.object(module, 'ROOT', root), patch.object(module, 'load_verifier', return_value=fake), patch.object(module, 'request', side_effect=response), contextlib.redirect_stdout(io.StringIO()):
                module.main()
            report = json.loads((root / 'target/robusto-final-preflight.json').read_text())
            self.assertEqual(report['status'], 'PASSED_READONLY_PREFLIGHT')
            self.assertEqual(len(report['publicSplPrograms']), 3)
            for entry in report['publicSplPrograms'].values():
                self.assertEqual((root / entry['path']).read_bytes(), code)

if __name__ == '__main__':
    unittest.main()
