"""Fault injection for the RC runner; only synthetic public files are used."""
import fcntl
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('rc_runner', Path(__file__).resolve().parents[1] / 'scripts/check-rc.py')
rc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rc)


class RcEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='papa-rc-test-')
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        for name in rc.ROOT_INPUTS:
            (self.root / name).write_text('public source')
        for name in rc.ARTIFACTS:
            artifact = self.root / name
            artifact.parent.mkdir(parents=True, exist_ok=True)
            artifact.write_text('public artifact')
        self.report = self.root / 'target/rc-check.json'
        self.report.write_text('{"status":"passed"}')
        self.calls = []
        mock = patch.object(rc.subprocess, 'check_output', side_effect=lambda *args, **kwargs: 'fixture' if kwargs.get('text') else b'')
        mock.start()
        self.addCleanup(mock.stop)

    def result(self):
        return json.loads(self.report.read_text())

    def execute(self, command, root):
        self.assertEqual(self.result()['status'], 'incomplete')
        self.calls.append(command)
        return 0

    def test_failure_at_each_gate_stops_and_invalidates_previous_success(self):
        for failed in range(len(rc.COMMANDS)):
            self.calls = []
            def execute(command, root):
                self.execute(command, root)
                return 9 if len(self.calls) == failed + 1 else 0
            with self.assertRaisesRegex(RuntimeError, 'exit code 9'):
                rc.run_checks(self.root, execute=execute)
            self.assertEqual(len(self.calls), failed + 1)
            self.assertEqual(self.result()['status'], 'failed')
            self.assertNotIn('artifacts', self.result())

    def test_interrupt_at_each_gate_is_never_success(self):
        for interrupted in range(len(rc.COMMANDS)):
            self.calls = []
            def execute(command, root):
                self.execute(command, root)
                if len(self.calls) == interrupted + 1:
                    raise KeyboardInterrupt()
                return 0
            with self.assertRaises(KeyboardInterrupt):
                rc.run_checks(self.root, execute=execute)
            self.assertEqual(self.result()['status'], 'interrupted')
            self.assertEqual(len(self.calls), interrupted + 1)

    def test_success_records_all_checks_and_only_public_artifacts(self):
        report = rc.run_checks(self.root, execute=self.execute)
        self.assertEqual(report['status'], 'passed')
        self.assertEqual(len(self.calls), len(rc.COMMANDS))
        self.assertEqual(set(report['artifacts']), set(rc.ARTIFACTS))
        self.assertEqual(set(report['sourceHashes']), set(rc.ROOT_INPUTS))

    def test_missing_tool_or_git_failure_invalidates_old_success(self):
        with patch.object(rc.subprocess, 'check_output', side_effect=FileNotFoundError()):
            with self.assertRaises(FileNotFoundError):
                rc.run_checks(self.root, execute=self.execute)
        self.assertEqual(self.result()['status'], 'failed')
        self.assertEqual(self.calls, [])

    def test_input_changed_or_added_during_checks_is_rejected(self):
        for new in [False, True]:
            def execute(command, root):
                self.execute(command, root)
                if new:
                    (root / 'scripts').mkdir(exist_ok=True)
                    (root / 'scripts/new.py').write_text('new public input')
                else:
                    (root / 'Cargo.toml').write_text('changed')
                return 0
            with self.assertRaisesRegex(RuntimeError, 'inputs changed'):
                rc.run_checks(self.root, execute=execute)
            self.assertEqual(self.result()['status'], 'failed')

    def test_missing_artifact_rejects_success(self):
        (self.root / rc.ARTIFACTS[-1]).unlink()
        with self.assertRaises(FileNotFoundError):
            rc.run_checks(self.root, execute=self.execute)
        self.assertEqual(self.result()['status'], 'failed')
        self.assertNotIn('artifacts', self.result())

    def test_concurrent_run_cannot_replace_active_evidence(self):
        with (self.root / 'target/rc-check.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaisesRegex(RuntimeError, 'Another RC run'):
                rc.run_checks(self.root, execute=self.execute)
        self.assertEqual(self.result(), {'status': 'passed'})
        self.assertEqual(self.calls, [])

    def test_symlink_input_rejected_without_reading_target(self):
        (self.root / 'scripts').mkdir()
        (self.root / 'scripts/linked').symlink_to('/does-not-exist')
        # Broken links must be rejected too.
        with self.assertRaisesRegex(ValueError, 'symlink'):
            rc.run_checks(self.root, execute=self.execute)

    def exercise_real_signal(self, abrupt=False):
        import os
        import signal
        import subprocess
        import sys
        import time
        marker = self.root / 'target/child.pid'
        child_code = f"import os,time; from pathlib import Path; Path({str(marker)!r}).write_text(str(os.getpid())); time.sleep(60)"
        driver = f'''import importlib.util, signal
from pathlib import Path
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('rc', {str(Path(rc.__file__).resolve())!r})
rc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rc)
def stop(signum, frame):
    raise KeyboardInterrupt()
signal.signal(signal.SIGTERM, stop)
with patch.object(rc.subprocess, 'check_output', side_effect=lambda *a, **k: 'fixture' if k.get('text') else b''):
    try:
        rc.run_checks(Path({str(self.root)!r}), commands=[[{sys.executable!r}, '-c', {child_code!r}]])
    except KeyboardInterrupt:
        raise SystemExit(130)
'''
        process = subprocess.Popen([sys.executable, '-c', driver], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            deadline = time.monotonic() + 10
            while not marker.exists() and time.monotonic() < deadline and process.poll() is None:
                time.sleep(0.02)
            self.assertTrue(marker.exists(), 'RC child did not start')
            pid = int(marker.read_text())
            process.send_signal(signal.SIGKILL if abrupt else signal.SIGTERM)
            if abrupt:
                process.wait(timeout=10)
                self.assertEqual(self.result()['status'], 'incomplete')
                # SIGKILL cannot run cleanup; reap the synthetic child explicitly.
                os.killpg(pid, signal.SIGKILL)
            output, error = process.communicate(timeout=10)
            self.assertEqual(process.returncode, -signal.SIGKILL if abrupt else 130, error.decode())
            self.assertEqual(self.result()['status'], 'incomplete' if abrupt else 'interrupted')
            if not abrupt:
                with self.assertRaises(ProcessLookupError):
                    os.kill(pid, 0)
        finally:
            if process.poll() is None:
                process.kill()
            if marker.exists():
                try:
                    os.killpg(int(marker.read_text()), signal.SIGKILL)
                except ProcessLookupError:
                    pass
            process.communicate(timeout=10)

    def test_real_sigterm_stops_child_and_records_interruption(self):
        self.exercise_real_signal()

    def test_real_sigkill_cannot_leave_success(self):
        self.exercise_real_signal(abrupt=True)

    def test_missing_required_root_files_fail_before_any_gate(self):
        for name in rc.ROOT_INPUTS:
            file = self.root / name
            original = file.read_bytes()
            file.unlink()
            with self.assertRaisesRegex(ValueError, 'Missing required public input'):
                rc.run_checks(self.root, execute=self.execute)
            self.assertEqual(self.result()['status'], 'failed')
            self.assertEqual(self.calls, [])
            file.write_bytes(original)
