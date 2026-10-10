import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('offline_idl', Path(__file__).resolve().parents[1]/'scripts/verify-offline-idl.py')
idl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(idl)

def block(kind, value):
    return f'--- IDL begin {kind} ---\n{json.dumps(value)}\n--- IDL end {kind} ---\n'

def fixture():
    program = dict(address='', metadata={}, instructions=[dict(name='release', discriminator=[1])],
                   accounts=[dict(name='p::State', discriminator=[2])], types=[dict(name='p::State', type={})])
    return block('address', 'PUBLIC_FIXTURE')+block('program', program)+block('errors', [])+'test result: ok. 5 passed; 0 failed;\n'

class OfflineIdlTests(unittest.TestCase):
    def test_normalized_sections_match_without_runtime_or_network(self):
        expected = idl.decode(fixture())
        self.assertEqual(expected['types'][0]['name'], 'State')
        self.assertEqual(len(idl.verify(fixture(), expected)[1]), 64)

    def test_altered_abi_fails(self):
        expected = idl.decode(fixture())
        expected['instructions'][0]['discriminator'] = [3]
        with self.assertRaises(ValueError):
            idl.verify(fixture(), expected)

    def test_partial_duplicate_interleaved_and_failed_generation_rejected(self):
        for log in [fixture().replace('--- IDL end program ---', ''), fixture()+block('program', {}),
                    fixture().replace('--- IDL begin program ---', '--- IDL begin program ---\n--- IDL begin errors ---'),
                    fixture().replace('5 passed; 0 failed;', '0 passed; 5 failed;'), fixture()+'test result: FAILED\n']:
            with self.subTest(log=log), self.assertRaises(ValueError):
                idl.decode(log)

    def test_type_path_collision_rejected(self):
        log = fixture().replace('"types": [{"name": "p::State", "type": {}}]',
                                '"types": [{"name":"a::State"},{"name":"b::State"}]')
        with self.assertRaisesRegex(ValueError, 'Ambiguous'):
            idl.decode(log)

if __name__ == '__main__':
    unittest.main()
