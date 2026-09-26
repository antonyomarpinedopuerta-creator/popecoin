#!/usr/bin/env python3
"""Compile the local release identity and IDL without reading deployment keys."""
from pathlib import Path
import hashlib
import json
import os
import subprocess

root = Path(__file__).resolve().parent.parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


inputs = [root / name for name in [
    'Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', 'Anchor.toml',
    'programs/popecoin_vesting/Cargo.toml', 'scripts/build-release.py',
]] + sorted((root / 'programs/popecoin_vesting/src').rglob('*.rs'))
hashes = {str(p.relative_to(root)): digest(p) for p in inputs}
env = dict(os.environ, NO_DNA='1', CARGO_TARGET_DIR=str(root / 'target'))
# Explicit manifest and destination prevent stale/cross-identity build outputs.
subprocess.run(['cargo', 'build-sbf', '--manifest-path', str(root / 'programs/popecoin_vesting/Cargo.toml'),
                '--sbf-out-dir', str(root / 'target/deploy'), '--', '--locked'], cwd=root, env=env, check=True)
(root / 'target/idl').mkdir(parents=True, exist_ok=True)
(root / 'target/types').mkdir(parents=True, exist_ok=True)
subprocess.run(['anchor', 'idl', 'build', '-o', 'target/idl/popecoin_vesting.json',
                '-t', 'target/types/popecoin_vesting.ts', '--', '--locked'], cwd=root, env=env, check=True)
if any(digest(root / p) != expected for p, expected in hashes.items()):
    raise SystemExit('Build inputs changed during compilation; repeat the build')
outputs = ['target/deploy/popecoin_vesting.so', 'target/idl/popecoin_vesting.json',
           'target/types/popecoin_vesting.ts']
record = {'sourceHashes': hashes, 'outputHashes': {p: digest(root / p) for p in outputs},
          'validation': 'Local locked SBF + IDL build only; tests and independent review still required'}
(root / 'target/release-build-record.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record['outputHashes'], indent=2))
