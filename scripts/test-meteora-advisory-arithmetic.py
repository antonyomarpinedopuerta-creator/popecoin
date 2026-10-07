#!/usr/bin/env python3
"""Isolated offline arithmetic tests; never changes the upstream protocol/lock."""
from pathlib import Path
import hashlib
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent

def main():
    source = ROOT / 'target/meteora-official/damm-v2-a85c926607433f23f0ea60f4ca7b1ae92f4156cb'
    if hashlib.sha256((source / 'Cargo.lock').read_bytes()).hexdigest() != 'b5ec7c2a5793afc7f8c46169b23cb370bd90f13a86e753beec7bc01f5c42e1d0':
        raise ValueError('Pinned official lock changed')
    base = ROOT / 'target/meteora-advisory-tests'
    base.mkdir(parents=True, exist_ok=True)
    workspace = Path(tempfile.mkdtemp(prefix='arithmetic-', dir=base))
    (workspace / 'Cargo.toml').write_text('[workspace]\n[package]\nname="meteora-advisory-arithmetic"\nversion="0.0.0"\nedition="2021"\n[dependencies]\nruint="=1.14.0"\n[profile.release]\noverflow-checks=true\n')
    (workspace / 'src').mkdir()
    (workspace / 'src/lib.rs').write_bytes((ROOT / 'tests/meteora_advisory_arithmetic.rs').read_bytes())
    subprocess.run(['cargo', 'generate-lockfile', '--offline'], cwd=workspace, check=True)
    for mode in [[], ['--release']]:
        subprocess.run(['cargo', 'test', '--locked', '--offline', *mode], cwd=workspace, check=True)

if __name__ == '__main__':
    main()
