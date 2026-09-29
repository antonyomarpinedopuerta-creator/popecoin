import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parent.parent / 'scripts/build-rehearsal.py'
spec = importlib.util.spec_from_file_location('rehearsal_build', SCRIPT)
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)
# Fixed public byte fixture, not a signer or an approved deployment identity.
PROGRAM = 'YMN9Qj5jPNp7j14VPcML1B6xGgcPWVZUGLFU3Mnyfaf'


class RehearsalBuildTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        files = {'Cargo.toml': b'workspace', 'Cargo.lock': b'lock', 'rust-toolchain.toml': b'toolchain',
                 'programs/popecoin_vesting/Cargo.toml': b'program',
                 b.LIB: f'declare_id!("{b.RELEASE}");'.encode(), b.IDL: json.dumps({'address': b.RELEASE}).encode()}
        for name, content in files.items():
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        (self.root / 'target/release-build-record.json').write_text(json.dumps({
            'sourceHashes': {n: b.sha(v) for n, v in files.items() if n != b.IDL},
            'outputHashes': {b.IDL: b.sha(files[b.IDL])}}))

    def fake_compile(self, workspace, manifest, fail=False):
        tools = self.root / 'tools'
        for name in ['rust/bin/cargo', 'rust/bin/rustc', 'llvm/bin/clang', 'llvm/bin/llvm-ar', 'llvm/bin/llvm-objcopy']:
            p = tools / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(b'fake tool')
        def run(command, **kwargs):
            self.assertNotIn('build-sbf', command)
            self.assertNotIn('PAPA_DEVNET_PAYER_KEYPAIR', kwargs['env'])
            if fail:
                raise subprocess.CalledProcessError(1, command)
            if '--strip-all' in command:
                (workspace / 'program.so').write_bytes(b'\x7fELF' + b.program_bytes(PROGRAM))
        with patch.object(b.subprocess, 'run', side_effect=run) as mocked:
            b.compile_program(self.root, workspace, manifest, tools)
        self.assertEqual(mocked.call_count, 2)

    def test_explicit_id_required_before_filesystem_or_process(self):
        for value in [None, '', b.RELEASE, b.HISTORICAL, b.MINT, '1' * 32, '../keys', 'z' * 44, '1' + PROGRAM]:
            with self.subTest(value=value), patch.object(b, 'inputs') as read, self.assertRaises(ValueError):
                b.prepare(self.root, value)
            read.assert_not_called()

    def test_fresh_copy_and_manifest_no_wallet_or_anchor_config(self):
        workspace, manifest = b.prepare(self.root, PROGRAM)
        other, _ = b.prepare(self.root, PROGRAM)
        self.assertNotEqual(workspace, other)
        self.assertEqual(manifest['status'], 'prepared-not-built')
        self.assertIn(PROGRAM, (workspace / b.LIB).read_text())
        self.assertIn(b.RELEASE, (self.root / b.LIB).read_text())
        self.assertEqual(json.loads((workspace / 'idl.json').read_text())['address'], PROGRAM)
        self.assertFalse((workspace / 'Anchor.toml').exists())
        with self.assertRaises(ValueError): b.verify(self.root, workspace, PROGRAM)

    def test_build_and_verify_reject_tampering(self):
        workspace, manifest = b.prepare(self.root, PROGRAM)
        self.fake_compile(workspace, manifest)
        b.verify(self.root, workspace, PROGRAM)
        (workspace / 'program.so').write_bytes(b'changed')
        with self.assertRaises(ValueError): b.verify(self.root, workspace, PROGRAM)

    def test_failed_compile_never_reports_success(self):
        workspace, manifest = b.prepare(self.root, PROGRAM)
        with self.assertRaises(subprocess.CalledProcessError): self.fake_compile(workspace, manifest, True)
        self.assertEqual(json.loads((workspace / 'manifest.json').read_text())['status'], 'failed')
        with self.assertRaises(ValueError): b.verify(self.root, workspace, PROGRAM)

    def test_stale_idl_and_symlink_fail_closed(self):
        (self.root / b.IDL).write_bytes(b'{}')
        with self.assertRaises(ValueError): b.prepare(self.root, PROGRAM)
        (self.root / b.LIB).unlink()
        (self.root / b.LIB).symlink_to(self.root / 'missing')
        with self.assertRaises(ValueError): b.prepare(self.root, PROGRAM)

    def test_copied_sources_and_manifest_identity_must_match(self):
        workspace, manifest = b.prepare(self.root, PROGRAM)
        self.fake_compile(workspace, manifest)
        original = (workspace / b.LIB).read_bytes()
        (workspace / b.LIB).write_bytes(b'changed')
        with self.assertRaises(ValueError): b.verify(self.root, workspace, PROGRAM)
        (workspace / b.LIB).write_bytes(original)
        manifest['programId'] = b.HISTORICAL
        b.save(workspace, manifest)
        with self.assertRaises(ValueError): b.verify(self.root, workspace, PROGRAM)

    def test_missing_cli_id_does_not_prepare_a_workspace(self):
        result = subprocess.run(['python3', str(SCRIPT)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('--program-id', result.stderr)

    def test_all_historical_mutators_use_guard_before_work(self):
        root = SCRIPT.parent
        names = ['initialize', 'deposit', 'release', 'founder-vesting', 'founder-deposit', 'reserve-vesting', 'reserve-deposit']
        for name in names:
            text = (root / f'devnet-{name}.ts').read_text()
            with self.subTest(name=name):
                self.assertIn('async function main() {\n  await assertHistoricalDevnet(connection, program.programId, mint);', text)
                self.assertIn('loadDevnetKeypair("PAYER")', text)
                self.assertIn('devnetIdl(idl)', text)

    def test_binary_without_requested_identity_is_not_certified(self):
        workspace, manifest = b.prepare(self.root, PROGRAM)
        read = b.public_read
        def corrupt(root, name):
            return b'\x7fELFwrong-program' if name == 'program.so' else read(root, name)
        with patch.object(b, 'public_read', side_effect=corrupt), self.assertRaises(ValueError):
            self.fake_compile(workspace, manifest)
        self.assertEqual(manifest['status'], 'failed')

    def test_output_symlink_and_changed_inputs_are_rejected(self):
        base = self.root / 'target/rehearsal-builds'
        base.symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(ValueError): b.prepare(self.root, PROGRAM)
        base.unlink()
        workspace, manifest = b.prepare(self.root, PROGRAM)
        (workspace / b.LIB).write_bytes(b'changed-before-build')
        with self.assertRaises(ValueError): self.fake_compile(workspace, manifest)
        self.assertEqual(manifest['status'], 'failed')
