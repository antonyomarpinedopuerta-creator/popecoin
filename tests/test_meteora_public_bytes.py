import base64
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('public_meteora_bytes', Path(__file__).resolve().parents[1] / 'scripts/verify-meteora-public-bytes.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class PublicByteVerification(unittest.TestCase):
    def response(self, data, executable=False):
        return {'result': {'context': {'slot': 100}, 'value': {'owner': module.LOADER,
                'executable': executable, 'data': [base64.b64encode(data).decode(), 'base64']}}}

    def inputs(self):
        address = bytes(range(32))
        return (self.response((2).to_bytes(4, 'little') + address, True),
                self.response((3).to_bytes(4, 'little') + (90).to_bytes(8, 'little') + b'\x01' + bytes(32) + b'ELF' + bytes(20)),
                module.b58(address), b'ELF')

    def test_padding_allowed_but_code_or_nonzero_padding_rejected(self):
        args = self.inputs()
        with patch.object(module, 'EXPECTED_BINARY', module.hashlib.sha256(b'ELF').hexdigest()):
            self.assertTrue(module.verify(*args)['exactPrefixAndZeroPaddingMatch'])
            for replacement in [b'ELX' + bytes(20), b'ELF' + bytes(19) + b'X', b'EL']:
                mutated = list(args)
                raw = base64.b64decode(args[1]['result']['value']['data'][0])[:45] + replacement
                mutated[1] = self.response(raw)
                self.assertEqual(module.verify(*mutated)['status'], 'NOT_VERIFIED')

    def test_address_loader_and_artifact_mismatch_fail_closed(self):
        args = list(self.inputs())
        with self.assertRaises(ValueError):
            module.verify(*args)
        with patch.object(module, 'EXPECTED_BINARY', module.hashlib.sha256(b'ELF').hexdigest()):
            args[2] = 'incorrect-address'
            with self.assertRaises(ValueError):
                module.verify(*args)
            args = list(self.inputs())
            args[1]['result']['value']['owner'] = 'wrong-loader'
            with self.assertRaises(ValueError):
                module.verify(*args)

    def test_missing_error_response_rejected(self):
        for response in [{'error': {'code': -1}}, {'result': {'value': None}}]:
            with self.assertRaises(ValueError):
                module.account(response)

if __name__ == '__main__':
    unittest.main()
