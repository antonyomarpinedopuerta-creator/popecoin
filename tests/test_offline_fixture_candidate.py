import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]

def load(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

candidate = load('fixture_candidate', ROOT/'scripts/offline-fixture-candidate.py')
helpers = load('fixture_build_helpers', ROOT/'tests/test_rehearsal_build.py')

class OfflineCandidateTests(unittest.TestCase):
    def setUp(self):
        self.helper = helpers.RehearsalBuildTests(methodName='runTest')
        self.helper.setUp()
        self.addCleanup(self.helper.doCleanups)
        self.root = self.helper.root
        self.paths = []
        for _ in range(2):
            workspace, manifest = helpers.b.prepare(self.root, helpers.PROGRAM)
            self.helper.fake_compile(workspace, manifest)
            self.paths.append(workspace)
        for name in ['CONTENT_APPROVAL.json', 'metadata.template.json', 'robusto-logo.png']:
            file = self.root/'metadata/robusto'/name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(b'public test fixture')

    def git(self, args, **kwargs):
        return b'' if args[1]=='status' else 'a'*40+'\n'

    def test_twice_built_package_is_deterministic_and_verifiable_without_extraction(self):
        with patch.object(candidate.subprocess, 'check_output', side_effect=self.git):
            a = candidate.package(self.root, *self.paths, helpers.PROGRAM)
            b = candidate.package(self.root, *self.paths, helpers.PROGRAM)
        self.assertEqual(a.read_bytes(), b.read_bytes())
        report = candidate.load('backup-public').verify_backup(a)
        self.assertFalse(report['authorization'])
        self.assertEqual(report['scope'], 'OFFLINE_FIXTURE_CANDIDATE_NOT_PRODUCTION')
        self.assertIn('program.so', report['files'])

    def test_same_workspace_tool_mismatch_and_binary_tampering_rejected(self):
        with self.assertRaises(ValueError):
            candidate.compare(self.root, self.paths[0], self.paths[0], helpers.PROGRAM)
        manifest = self.paths[1]/'manifest.json'
        data = json.loads(manifest.read_text())
        data['toolHashes']['cargo'] = '0'*64
        manifest.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'toolHashes'):
            candidate.compare(self.root, *self.paths, helpers.PROGRAM)
        (self.paths[0]/'program.so').write_bytes(b'corrupt')
        with self.assertRaises(ValueError):
            candidate.compare(self.root, *self.paths, helpers.PROGRAM)

    def test_dirty_sources_fail_before_packaging(self):
        with patch.object(candidate.subprocess, 'check_output', return_value=b'M dirty'), self.assertRaisesRegex(ValueError, 'Clean'):
            candidate.package(self.root, *self.paths, helpers.PROGRAM)

    def test_metadata_change_during_packaging_rejected(self):
        original = candidate.compare
        count = 0
        def changed(*args):
            nonlocal count
            count += 1
            if count == 2:
                (self.root/'metadata/robusto/robusto-logo.png').write_bytes(b'changed')
            return original(*args)
        with patch.object(candidate.subprocess, 'check_output', side_effect=self.git), patch.object(candidate, 'compare', side_effect=changed):
            with self.assertRaisesRegex(ValueError, 'changed'):
                candidate.package(self.root, *self.paths, helpers.PROGRAM)

if __name__ == '__main__':
    unittest.main()
