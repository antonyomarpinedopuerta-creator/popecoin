#!/usr/bin/env python3
"""Local RC gates with exclusive execution and fail-closed evidence."""
from pathlib import Path
import fcntl
import hashlib
import json
import os
import signal
import subprocess
import sys

ROOT_INPUTS = ['Cargo.toml', 'Cargo.lock', 'Anchor.toml', 'rust-toolchain.toml',
               'package.json', 'yarn.lock', 'tsconfig.json', '.gitignore',
               'README.md', 'PAPA_WORK_HANDOFF.md']

COMMANDS = [
    ['python3', 'scripts/check-public.py'],
    ['python3', '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py'],
    ['npm', 'run', 'check'],
    ['cargo', 'clippy', '--locked', '--all-targets', '--', '-D', 'warnings'],
    ['npm', 'run', 'build:devnet'],
    ['npm', 'run', 'verify:release'],
    ['git', 'diff', '--check'],
]
ARTIFACTS = [
    'target/deploy/popecoin_vesting.so', 'target/idl/popecoin_vesting.json',
    'target/types/popecoin_vesting.ts', 'target/release-build-record.json',
    'target/devnet-workspace/target/deploy/popecoin_vesting.so',
    'target/devnet-workspace/build-record.json',
]


def source_hashes(root):
    # Public project inputs only; do not walk .git, node_modules, target or home.
    files = [root / name for name in ROOT_INPUTS]
    for file in files:
        if file.is_symlink() or not file.is_file():
            raise ValueError('Missing required public input or unexpected symlink')
    for directory in ['programs', 'scripts', 'tests', 'app', 'vendor', 'metadata', 'config', '.github', 'docs']:
        base = root / directory
        if base.is_symlink():
            raise ValueError('Unexpected symlink in public input tree')
        if not base.exists():
            continue
        for current, directories, names in os.walk(base, followlinks=False):
            for name in directories[:]:
                entry = Path(current) / name
                if entry.is_symlink():
                    raise ValueError('Symlink in public input tree')
                if name in ['__pycache__', 'node_modules', 'target']:
                    directories.remove(name)
            files.extend(Path(current) / name for name in names if not name.endswith('.pyc'))
    hashes = {}
    for file in sorted(files):
        if file.is_symlink():
            raise ValueError('Unexpected symlink in public input tree')
        if not file.exists():
            continue
        name = file.name.lower()
        if file.is_symlink() or name.startswith('.env') or name.endswith(('.pem', '.key')) or (
                name.endswith('.json') and (name == 'id.json' or any(word in name for word in ['keypair', 'wallet', 'seed', 'secret']))):
            raise ValueError('Unexpected sensitive filename or symlink in public input tree')
        hashes[file.relative_to(root).as_posix()] = hashlib.sha256(file.read_bytes()).hexdigest()
    return hashes


def run_command(command, root):
    # Own the child group so interrupting this runner also stops its build/tests.
    with subprocess.Popen(command, cwd=root, env=dict(os.environ, NO_DNA='1'), start_new_session=True) as child:
        try:
            return child.wait()
        except BaseException:
            try:
                os.killpg(child.pid, signal.SIGTERM)
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()
            except ProcessLookupError:
                pass
            raise


def run_checks(root, commands=None, execute=run_command):
    report = root / 'target/rc-check.json'
    report.parent.mkdir(parents=True, exist_ok=True)
    # flock releases on process death; never unlink this file while holding it.
    with (report.parent / 'rc-check.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError('Another RC run owns this workspace')
        evidence = {'schemaVersion': 1, 'status': 'incomplete',
                    'scope': 'Local checks only; no deployment or production authorization', 'checks': []}

        def save():
            temporary = report.with_suffix('.tmp')
            with temporary.open('w') as output:
                json.dump(evidence, output, indent=2)
                output.write('\n')
                output.flush()
                os.fsync(output.fileno())
            temporary.replace(report)

        # Invalidate previous success BEFORE git, hashing, tools or tests can fail.
        save()
        try:
            evidence['head'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
            evidence['dirty'] = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=root))
            evidence['toolVersions'] = {}
            for tool, command in {
                'rustc': ['rustc', '--version'], 'cargo': ['cargo', '--version'],
                'sbf': ['cargo', 'build-sbf', '--version'], 'solana': ['solana', '--version'],
                'anchor': ['anchor', '--version'], 'node': ['node', '--version'],
                'yarn': ['yarn', '--version'], 'python': ['python3', '--version'],
            }.items():
                evidence['toolVersions'][tool] = subprocess.check_output(
                    command, cwd=root, text=True, env=dict(os.environ, NO_DNA='1')).strip()
            evidence['sourceHashes'] = source_hashes(root)
            save()
            for command in commands if commands is not None else COMMANDS:
                code = execute(command, root)
                evidence['checks'].append({'command': command, 'exitCode': code})
                save()
                if code:
                    raise RuntimeError(f'RC gate failed with exit code {code}')
            if source_hashes(root) != evidence['sourceHashes']:
                raise RuntimeError('Public inputs changed during RC checks; repeat the run')
            head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
            if head != evidence['head']:
                raise RuntimeError('Git HEAD changed during RC checks; repeat the run')
            evidence['artifacts'] = {}
            for name in ARTIFACTS:
                file = root / name
                if file.is_symlink():
                    raise RuntimeError('Artifact must not be a symlink')
                evidence['artifacts'][name] = hashlib.sha256(file.read_bytes()).hexdigest()
            evidence['status'] = 'passed'
            save()
        except BaseException as error:
            evidence['status'] = 'interrupted' if isinstance(error, KeyboardInterrupt) else 'failed'
            evidence.pop('artifacts', None)
            save()
            raise
    print(f'Local RC evidence: {report.relative_to(root)}')
    return evidence


def main():
    def terminate(signum, frame):
        raise KeyboardInterrupt()
    signal.signal(signal.SIGTERM, terminate)
    try:
        run_checks(Path(__file__).resolve().parent.parent)
    except KeyboardInterrupt:
        print('RC interrupted; evidence is not valid', file=sys.stderr)
        return 130
    except Exception as error:
        print(f'RC failed: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
