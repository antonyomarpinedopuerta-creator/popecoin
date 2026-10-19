import importlib.util
import hashlib
import json
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location('parity', Path(__file__).resolve().parents[1] / 'scripts/test-founder-vesting-parity.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

class NativeParityEvidenceTests(unittest.TestCase):
    def test_exact_complete_output_accepted(self):
        vectors = [{'expected': str(i)} for i in range(30)]
        MODULE.validate_output(''.join(f'PARITY_CASE {i} {i}\n' for i in range(30)), vectors)

    def test_missing_duplicate_wrong_or_extra_results_rejected(self):
        vectors = [{'expected': str(i)} for i in range(30)]
        lines = [f'PARITY_CASE {i} {i}\n' for i in range(30)]
        for output in [''.join(lines[:-1]), ''.join(reversed(lines)), ''.join(lines + [lines[-1]]), ''.join(lines).replace('CASE 2 2\n', 'CASE 2 3\n')]:
            with self.assertRaises(ValueError):
                MODULE.validate_output(output, vectors)

    def test_short_vector_set_rejected_even_if_output_matches(self):
        with self.assertRaises(ValueError):
            MODULE.validate_output('PARITY_CASE 0 0\n', [{'expected': '0'}])

    def test_static_signer_evidence_binds_exact_local_sources(self):
        root = Path(__file__).resolve().parents[1]
        evidence = json.loads((root / 'docs/evidence/robusto/custody-signer-source-hashes.json').read_text())
        self.assertFalse(evidence['signaturesVerified'])
        self.assertEqual(len(evidence['sourceHashes']), 12)
        sources = {}
        for name, expected in evidence['sourceHashes'].items():
            if name.startswith('cargo:'):
                matches = list((Path.home() / '.cargo/registry/src').glob('*/' + name[len('cargo:'):]))
                self.assertEqual(len(matches), 1, name)
                path = matches[0]
            else:
                path = root / name
            raw = path.read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), expected, name)
            sources[name] = raw.decode()
        signer = sources['cargo:anchor-lang-1.2.0/src/accounts/signer.rs']
        self.assertIn('if !info.is_signer', signer)
        self.assertIn('ErrorCode::AccountNotSigner', signer)
        loader = sources['cargo:solana-loader-v3-interface-6.1.1/src/instruction.rs']
        self.assertIn('AccountMeta::new_readonly(*authority_address, true)', loader)
        token = sources['cargo:spl-token-interface-2.0.0/src/instruction.rs']
        self.assertIn('signer_pubkeys.is_empty()', token)
        self.assertIn('for signer_pubkey in signer_pubkeys.iter()', token)

if __name__ == '__main__':
    unittest.main()
