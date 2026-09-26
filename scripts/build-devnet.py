#!/usr/bin/env python3
"""Build/test a Devnet-identity copy; never edit release source or deploy."""
from pathlib import Path
import hashlib
import json
import os
import subprocess

root = Path(__file__).resolve().parent.parent
workspace = root / 'target' / 'devnet-workspace'
workspace.mkdir(parents=True, exist_ok=True)
release_id = 'AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn'
devnet_id = 'BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc'
files = [root / name for name in ['Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml']]
files += list((root / 'programs').rglob('*.rs')) + list((root / 'programs').rglob('Cargo.toml'))
source_hashes = {}
for source in files:
    relative = source.relative_to(root)
    content = source.read_bytes()
    source_hashes[str(relative)] = hashlib.sha256(content).hexdigest()
    if relative == Path('programs/popecoin_vesting/src/lib.rs'):
        declaration = f'declare_id!("{release_id}");'.encode()
        if content.count(declaration) != 1:
            raise SystemExit('Unexpected release identity; refusing to rewrite isolated copy')
        content = content.replace(declaration, f'declare_id!("{devnet_id}");'.encode())
    destination = workspace / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
output = workspace / 'target' / 'deploy'
output.mkdir(parents=True, exist_ok=True)
env = dict(os.environ, NO_DNA='1', CARGO_TARGET_DIR=str(root / 'target'))
subprocess.run(['cargo', 'build-sbf', '--manifest-path', str(workspace / 'programs/popecoin_vesting/Cargo.toml'),
                '--sbf-out-dir', str(output), '--', '--locked'], cwd=workspace, env=env, check=True)
subprocess.run(['cargo', 'test', '--locked'], cwd=workspace, env=env, check=True)
for relative, expected in source_hashes.items():
    if hashlib.sha256((root / relative).read_bytes()).hexdigest() != expected:
        raise SystemExit('Source changed during build; discard candidate and repeat')
binary = output / 'popecoin_vesting.so'
record = {'cluster': 'devnet', 'programId': devnet_id, 'binary': str(binary.relative_to(root)),
          'sha256': hashlib.sha256(binary.read_bytes()).hexdigest(), 'sourceHashes': source_hashes,
          'validation': 'cargo build-sbf --locked and cargo test --locked passed; not deployed'}
(workspace / 'build-record.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({k:v for k,v in record.items() if k != 'sourceHashes'}, indent=2))
