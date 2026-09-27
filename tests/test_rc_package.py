import hashlib
import importlib.util
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('rc_package', Path(__file__).resolve().parents[1] / 'scripts/package-rc.py')
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)


class RcPackageTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='papa-package-test-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        for name in [*package.rc.ROOT_INPUTS, 'scripts/build-release.py', 'scripts/reproduce-release.py', *package.rc.ARTIFACTS]:
            file = self.root / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text('synthetic public content')
        self.report = {'schemaVersion': 1, 'status': 'passed', 'dirty': False, 'head': 'a' * 40,
                       'checks': [{'command': cmd, 'exitCode': 0} for cmd in package.rc.COMMANDS],
                       'sourceHashes': package.rc.source_hashes(self.root),
                       'artifacts': {name: hashlib.sha256((self.root / name).read_bytes()).hexdigest() for name in package.rc.ARTIFACTS},
                       'toolVersions': {name: 'test tool version' for name in ['rustc', 'cargo', 'sbf', 'solana', 'anchor', 'node', 'yarn', 'python']}}
        self.save()
        (self.root / 'target/reproducibility.json').write_text(json.dumps({'status': 'passed',
            'sourceHashes': {name: value for name, value in self.report['sourceHashes'].items() if name in
                ['Cargo.toml', 'Cargo.lock', 'Anchor.toml', 'rust-toolchain.toml', 'scripts/build-release.py', 'scripts/reproduce-release.py']},
            'outputHashes': {name: self.report['artifacts'][name] for name in package.reproduction.OUTPUTS}}))
        mock = patch.object(package.subprocess, 'check_output', side_effect=lambda *args, **kwargs: 'a' * 40 if kwargs.get('text') else b'')
        mock.start()
        self.addCleanup(mock.stop)

    def save(self):
        (self.root / 'target/rc-check.json').write_text(json.dumps(self.report))

    def test_dirty_failed_incomplete_or_other_revision_evidence_rejected(self):
        original = dict(self.report)
        for field, value in [('dirty', True), ('status', 'incomplete'), ('head', 'b' * 40), ('checks', []), ('artifacts', {}), ('toolVersions', {})]:
            self.report = {**original, field: value}
            self.save()
            with self.assertRaises(ValueError, msg=field):
                package.verify(self.root)

    def test_stale_sources_and_artifacts_rejected(self):
        for name in ['Cargo.toml', package.rc.ARTIFACTS[0]]:
            file = self.root / name
            original = file.read_bytes()
            file.write_text('modified')
            with self.assertRaises(ValueError):
                package.verify(self.root)
            file.write_bytes(original)

    def test_reproduction_failure_or_missing_sources_rejected(self):
        file = self.root / 'target/reproducibility.json'
        original = json.loads(file.read_text())
        for changes in [{'status': 'failed'}, {'sourceHashes': {}}, {'outputHashes': {}}]:
            file.write_text(json.dumps({**original, **changes}))
            with self.assertRaises(ValueError):
                package.verify(self.root)

    def test_bundle_is_deterministic_and_never_sweeps_deploy_directory(self):
        # Marker is not a credential; proves adjacent files are not copied/read.
        (self.root / 'target/deploy/ignored-keypair.json').write_text('DO NOT PACKAGE')
        report = package.verify(self.root)
        first = package.bundle(self.root, report)
        original = first.read_bytes()
        second = package.bundle(self.root, report)
        self.assertEqual(original, second.read_bytes())
        with tarfile.open(second) as archive:
            self.assertEqual(set(archive.getnames()), set(report['sourceHashes']) | set(report['artifacts']) | {'rc-manifest.json'})
            self.assertTrue(all(entry.isfile() and entry.mtime == 0 for entry in archive.getmembers()))

    def test_parent_symlink_artifact_is_not_followed(self):
        (self.root / 'linked').symlink_to(self.root / 'target', target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'Symlinks'):
            package.public_bytes(self.root, 'linked/rc-check.json')
