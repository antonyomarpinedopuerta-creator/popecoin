import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('public_backup', Path(__file__).resolve().parents[1] / 'scripts/backup-public.py')
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)


class PublicBackupTests(unittest.TestCase):
    def test_private_local_scan_allows_internal_log_alias_without_reading_identity_bytes(self):
        scanner = backup.load('security-scan')
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            ledger = root / '.robusto-local-private/session/ledger'
            ledger.mkdir(parents=True, mode=0o700)
            for folder in [ledger.parent.parent, ledger.parent, ledger]:
                folder.chmod(0o700)
            log = ledger / 'validator-actual.log'
            log.write_text('not read')
            log.chmod(0o600)
            (ledger / 'validator.log').symlink_to(log.name)
            identity = ledger.parent / 'payer-keypair.json'
            identity.write_text('not read')
            identity.chmod(0o600)
            def git_output(args, **kwargs):
                return 'a' * 40 if args[1] == 'rev-parse' else ('' if args[1] == 'log' else b'')
            with patch.object(scanner.public, 'check'), patch.object(scanner.subprocess, 'check_output', side_effect=git_output), patch.object(scanner.subprocess, 'run', return_value=SimpleNamespace(returncode=0)), patch.object(Path, 'read_bytes', side_effect=AssertionError('Private bytes must never be read')):
                self.assertEqual(scanner.scan(root)['status'], 'passed')
                (ledger / 'validator.log').unlink()
                outside = root / 'outside.log'
                outside.write_text('not read')
                (ledger / 'validator.log').symlink_to(outside)
                with self.assertRaisesRegex(ValueError, 'escaped'):
                    scanner.scan(root)

    def test_private_local_scan_rejects_key_alias_even_when_log_alias_is_allowed(self):
        scanner = backup.load('security-scan')
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            ledger = root / '.robusto-local-private/session/ledger'
            ledger.mkdir(parents=True, mode=0o700)
            for folder in [ledger.parent.parent, ledger.parent, ledger]:
                folder.chmod(0o700)
            (ledger / 'payer-keypair.json').symlink_to('missing.json')
            def git_output(args, **kwargs):
                return 'a' * 40 if args[1] == 'rev-parse' else ('' if args[1] == 'log' else b'')
            with patch.object(scanner.public, 'check'), patch.object(scanner.subprocess, 'check_output', side_effect=git_output):
                with self.assertRaisesRegex(ValueError, 'regular file'):
                    scanner.scan(root)

    def test_backup_rejects_failed_dirty_or_stale_dependency_audit(self):
        report = {'head': 'a' * 40, 'sourceHashes': {'README.md': 'b' * 64}}
        audit = {**report, 'status': 'reviewed-findings-only', 'dirty': False}
        backup.validate_audit(audit, report)
        for change in [{'status': 'failed'}, {'dirty': True}, {'head': 'c' * 40}, {'sourceHashes': {}}, {'sourceHashes': None}]:
            with self.assertRaisesRegex(ValueError, 'exact clean'):
                backup.validate_audit({**audit, **change}, report)

    def archive(self, folder, content=b'public source', corrupt=False, duplicate=False, symlink=False):
        out = io.BytesIO()
        manifest = {'files': {'README.md': hashlib.sha256(b'public source').hexdigest()}}
        with tarfile.open(fileobj=out, mode='w:gz') as archive:
            rows = [('README.md', content), ('backup-manifest.json', json.dumps(manifest).encode())]
            if duplicate:
                rows.append(('README.md', content))
            for name, data in rows:
                item = tarfile.TarInfo(name)
                item.size = len(data)
                archive.addfile(item, io.BytesIO(data))
            if symlink:
                item = tarfile.TarInfo('linked')
                item.type = tarfile.SYMTYPE
                item.linkname = '/etc/passwd'
                archive.addfile(item)
        path = Path(folder) / 'backup.tar.gz'
        path.write_bytes(out.getvalue())
        path.with_suffix('.sha256').write_text(f'{hashlib.sha256(out.getvalue()).hexdigest()}  {path.name}\n' if not corrupt else 'invalid\n')
        return path

    def test_inventory_and_sidecar(self):
        with tempfile.TemporaryDirectory() as temp:
            path = self.archive(temp)
            self.assertIn('README.md', backup.verify_backup(path)['files'])
            for patch in [dict(content=b'changed'), dict(corrupt=True), dict(duplicate=True), dict(symlink=True)]:
                with self.assertRaises(ValueError):
                    backup.verify_backup(self.archive(temp, **patch))

    def test_redacted_inline_secret_heuristic(self):
        scanner = backup.load('security-scan')
        data = json.dumps({'private': list(range(64))}).encode()
        self.assertTrue(scanner.suspect(data))
        self.assertFalse(scanner.suspect(b'public source only'))

    def test_failed_scan_invalidates_previous_success(self):
        scanner = backup.load('security-scan')
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / 'target/security-scan.json'
            output.parent.mkdir()
            output.write_text('{"status":"passed"}')
            with patch.object(scanner, 'scan', side_effect=ValueError('synthetic failure')):
                with self.assertRaises(ValueError):
                    scanner.write_scan(root)
            self.assertEqual(json.loads(output.read_text())['status'], 'failed')


if __name__ == '__main__':
    unittest.main()
