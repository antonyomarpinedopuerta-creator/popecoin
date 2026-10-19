#!/usr/bin/env python3
"""Compare the existing TS model with native contract math; never runs an instruction."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
INPUTS = [
    'Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', 'programs/popecoin_vesting/Cargo.toml',
    'programs/popecoin_vesting/src/state.rs',
    'scripts/robusto-10b9-vesting-preparation.ts',
    'scripts/robusto-10b9-offline.ts', 'config/robusto-tokenomics-10b9-alternative.json',
    'tests/founder-vesting-parity-vectors.ts', 'tests/founder-vesting-native-parity.rs',
    'scripts/test-founder-vesting-parity.py',
]
INPUTS = sorted(set(INPUTS) | {p.relative_to(ROOT).as_posix() for p in (ROOT / 'programs/popecoin_vesting/src').rglob('*.rs')})

def sha(data):
    return hashlib.sha256(data).hexdigest()

def validate_output(stdout, vectors):
    expected = ''.join(f'PARITY_CASE {i} {v["expected"]}\n' for i, v in enumerate(vectors))
    if len(vectors) != 30 or stdout != expected:
        raise ValueError('Missing, reordered or divergent native math evidence')

def main():
    target = ROOT / 'target'
    if target.is_symlink() or not target.is_dir():
        raise ValueError('Existing nonsymlink target required')
    output = target / 'founder-vesting-native-parity-report.json'
    def save(report):
        fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o644)
        with os.fdopen(fd, 'w') as stream:
            stream.write(json.dumps(report, indent=2, sort_keys=True) + '\n')
    save({'status': 'FAILED_INCOMPLETE_EVIDENCE', 'scope': 'OFFLINE_FIXTURE_ONLY', 'authorization': False})
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    sources = {name: sha((ROOT / name).read_bytes()) for name in INPUTS}
    env = dict(os.environ, CARGO_NET_OFFLINE='true', CARGO_TARGET_DIR=str(target), NO_DNA='1')
    # Build only the program library; no dev-dependency test harness or LiteSVM constructor.
    subprocess.run(['cargo', 'build', '--offline', '--locked', '-p', 'popecoin_vesting', '--lib'], cwd=ROOT, env=env, check=True)
    vectors_raw = subprocess.check_output(['node', '--require', 'ts-node/register', 'tests/founder-vesting-parity-vectors.ts'], cwd=ROOT, env=env)
    vectors = json.loads(vectors_raw)
    library = target / 'debug/libpopecoin_vesting.rlib'
    with tempfile.TemporaryDirectory(prefix='founder-native-parity-', dir=target) as temporary:
        executable = Path(temporary) / 'parity'
        subprocess.run(['rustc', '--edition=2021', str(ROOT / 'tests/founder-vesting-native-parity.rs'),
                        '-L', f'dependency={target / "debug/deps"}', '--extern', f'popecoin_vesting={library}',
                        '-o', str(executable)], cwd=ROOT, env=env, check=True)
        data = ''.join(','.join(v[k] for k in ['start', 'cliff', 'end', 'now', 'expected']) + '\n' for v in vectors)
        run = subprocess.run([str(executable)], input=data, text=True, capture_output=True, check=True, cwd=ROOT, env=env)
        validate_output(run.stdout, vectors)
        executable_hash = sha(executable.read_bytes())
    if sources != {name: sha((ROOT / name).read_bytes()) for name in INPUTS} or head != subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip():
        raise ValueError('Inputs changed during native parity check')
    report = {'status': 'passed', 'scope': 'OFFLINE_FIXTURE_ONLY', 'mainnetStatus': 'NOT_AUTHORIZED_FOR_MAINNET',
              'mainnetDisabled': True, 'authorization': False, 'head': head,
              'worktreeClean': not subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT).strip(),
              'level': 'NATIVE_HOST_MATH_NOT_SBF', 'cases': len(vectors), 'sourceHashes': sources,
              'vectorsSha256': sha(vectors_raw), 'stdoutSha256': sha(run.stdout.encode()),
              'librarySha256': sha(library.read_bytes()), 'executableSha256': executable_hash,
              'toolchains': {name: subprocess.check_output([name, '--version'], cwd=ROOT, env=env, text=True).strip()
                             for name in ['rustc', 'cargo', 'node']},
              'beneficiary': None, 'baseUnixSeconds': None, 'nativeAtomicityVerified': False,
              'limitations': ['No Solana instruction execution or signer compatibility proof', 'Boundary origins are arithmetic inputs, not selected launch dates']}
    save(report)
    print(json.dumps({'status': report['status'], 'cases': report['cases'], 'head': head, 'report': str(output), 'reportSha256': sha(output.read_bytes())}, indent=2))

if __name__ == '__main__':
    main()
