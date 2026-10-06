import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('public_backup', Path(__file__).resolve().parents[1] / 'scripts/backup-public.py')
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)


class PublicBackupTests(unittest.TestCase):
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
