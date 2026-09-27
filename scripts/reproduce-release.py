#!/usr/bin/env python3
"""Rebuild public release inputs in a fresh workspace and compare exact artifacts."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import tempfile

OUTPUTS = ['target/deploy/popecoin_vesting.so', 'target/idl/popecoin_vesting.json',
           'target/types/popecoin_vesting.ts']


def hashes(root, paths):
    result = {}
    for name in paths:
        file = root / name
        if file.is_symlink():
            raise ValueError('Symlinks are not release artifacts')
        result[name] = hashlib.sha256(file.read_bytes()).hexdigest()
    return result


def compare(expected, actual):
    if set(expected) != set(OUTPUTS) or set(actual) != set(OUTPUTS):
        raise ValueError('Incomplete reproducibility artifact set')
    if expected != actual:
        raise ValueError('Fresh build artifacts differ from the validated release')


def main():
    root = Path(__file__).resolve().parent.parent
    report = root / 'target/reproducibility.json'
    report.parent.mkdir(parents=True, exist_ok=True)
    evidence = {'status': 'incomplete', 'scope': 'Same-machine fresh-cache rebuild; not independent attestation'}

    def save():
        temporary = report.with_suffix('.tmp')
        temporary.write_text(json.dumps(evidence, indent=2) + '\n')
        temporary.replace(report)

    save()
    try:
        subprocess.run(['npm', 'run', 'verify:release'], cwd=root, check=True)
        original = hashes(root, OUTPUTS)
        # Never copy target, home, node_modules, wallet files or the Git database.
        inputs = [root / name for name in ['Cargo.toml', 'Cargo.lock', 'Anchor.toml',
                  'rust-toolchain.toml', 'scripts/build-release.py', 'scripts/reproduce-release.py']]
        inputs += sorted((root / 'programs').rglob('*.rs'))
        inputs += sorted((root / 'programs').rglob('Cargo.toml'))
        paths = [file.relative_to(root).as_posix() for file in inputs]
        evidence['sourceHashes'] = hashes(root, paths)
        workspace = Path(tempfile.mkdtemp(prefix='reproduce-', dir=root / 'target'))
        evidence['workspace'] = workspace.relative_to(root).as_posix()
        save()
        for name in paths:
            destination = workspace / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes((root / name).read_bytes())
        env = dict(os.environ, NO_DNA='1', CARGO_TARGET_DIR=str(workspace / 'target'))
        subprocess.run(['python3', 'scripts/build-release.py'], cwd=workspace, env=env, check=True)
        compare(original, hashes(workspace, OUTPUTS))
        if hashes(root, paths) != evidence['sourceHashes'] or hashes(root, OUTPUTS) != original:
            raise ValueError('Original release changed during reproduction')
        subprocess.run(['cargo', 'test', '--locked'], cwd=workspace, env=env, check=True)
        if hashes(root, paths) != evidence['sourceHashes'] or hashes(root, OUTPUTS) != original:
            raise ValueError('Original release changed during reproduced tests')
        compare(original, hashes(workspace, OUTPUTS))
        evidence['outputHashes'] = original
        evidence['status'] = 'passed'
        save()
        print(f'Reproduced and tested exact SBF/IDL/TypeScript bytes: {report.relative_to(root)}')
    except BaseException:
        evidence['status'] = 'failed'
        save()
        raise


if __name__ == '__main__':
    main()
