import contextlib
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parent.parent / 'scripts/build-devnet.py'


class DevnetRecordTests(unittest.TestCase):
    def build(self, root, reverse):
        files = {'Cargo.toml': '', 'Cargo.lock': '', 'rust-toolchain.toml': '',
                 'programs/p/Cargo.toml': '',
                 'programs/popecoin_vesting/src/lib.rs': 'declare_id!("AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn");',
                 'programs/p/src/a.rs': 'a', 'programs/p/src/z.rs': 'z'}
        for name in sorted(files, reverse=reverse):
            p = root / name; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(files[name])
        output = root / 'target/devnet-workspace/target/deploy/popecoin_vesting.so'
        output.parent.mkdir(parents=True); output.write_bytes(b'identical-binary')
        with patch('subprocess.run') as run, contextlib.redirect_stdout(io.StringIO()):
            exec(compile(SCRIPT.read_text(), str(SCRIPT), 'exec'), {'__file__': str(root / 'scripts/build-devnet.py')})
        self.assertEqual(run.call_count, 2)
        return (root / 'target/devnet-workspace/build-record.json').read_bytes()

    def test_record_bytes_ignore_source_creation_order(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.assertEqual(self.build(root / 'one', False), self.build(root / 'two', True))
