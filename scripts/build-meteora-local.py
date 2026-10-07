#!/usr/bin/env python3
"""Official pinned source -> locked, twice-built SBF. No RPC, wallets or deployment."""
from pathlib import Path
import hashlib
import io
import json
import os
import subprocess
import tarfile
import urllib.request
import tomllib

ROOT = Path(__file__).resolve().parent.parent
COMMIT = 'a85c926607433f23f0ea60f4ca7b1ae92f4156cb'
ARCHIVE_SHA = 'e72439220612d03ee8a41b06a4280f660a51b31fe496548c56d81d740cb59765'
URL = f'https://codeload.github.com/MeteoraAg/cp-amm/tar.gz/{COMMIT}'
DEST = ROOT / 'target/meteora-official'
SOURCE = DEST / ('damm-v2-' + COMMIT)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build():
    DEST.mkdir(parents=True, exist_ok=True)
    archive = DEST / 'official-source.tar.gz'
    if not archive.exists():
        with urllib.request.urlopen(URL, timeout=120) as response:
            data = response.read()
        if digest(data) != ARCHIVE_SHA:
            raise ValueError('Official source archive checksum mismatch')
        archive.write_bytes(data)
    data = archive.read_bytes()
    if digest(data) != ARCHIVE_SHA:
        raise ValueError('Official source archive checksum mismatch')
    expected = {}
    with tarfile.open(fileobj=io.BytesIO(data)) as bundle:
        for member in bundle:
            parts = Path(member.name).parts
            if not member.isfile() or len(parts) < 2:
                continue
            relative = Path(*parts[1:])
            if relative.is_absolute() or '..' in relative.parts:
                raise ValueError('Unsafe official archive path')
            # Do not extract upstream fixture keys, binaries, TS tests or wallet config.
            if not (relative.as_posix() in {'Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', 'license.md'} or
                    (relative.parts[0] in {'programs', 'libs', 'rust-sdk'} and relative.suffix in {'.rs', '.toml'})):
                continue
            content = bundle.extractfile(member).read()
            destination = SOURCE / relative
            for parent in [SOURCE, *destination.parents]:
                if parent.is_symlink():
                    raise ValueError('Source symlink rejected')
                if parent == DEST:
                    break
            destination.parent.mkdir(parents=True, exist_ok=True)
            if destination.is_symlink():
                raise ValueError('Source symlink rejected')
            destination.write_bytes(content)
            expected[relative.as_posix()] = digest(content)
    if subprocess.check_output(['cargo-build-sbf', '--version'], text=True).splitlines()[:2] != ['solana-cargo-build-sbf 3.1.10', 'platform-tools v1.52']:
        raise ValueError('Expected pinned Agave 3.1.10/platform-tools v1.52')
    hashes = []
    for name in ['build', 'reproduced-build']:
        env = dict(os.environ, NO_DNA='1', CARGO_TARGET_DIR=str(DEST / ('cargo-' + name)))
        private = ROOT / '.robusto-local-private' / 'official-build'
        private.mkdir(parents=True, exist_ok=True, mode=0o700)
        private.parent.chmod(0o700)
        private.chmod(0o700)
        out = private / name
        out.mkdir(parents=True, exist_ok=True, mode=0o700)
        out.chmod(0o700)
        subprocess.run(['cargo', 'build-sbf', '--manifest-path', 'programs/cp-amm/Cargo.toml',
                        '--sbf-out-dir', str(out), '--', '--locked'], cwd=SOURCE, env=env, check=True)
        if any(digest((SOURCE / p).read_bytes()) != h for p, h in expected.items()):
            raise ValueError('Official build input changed')
        (out / 'cp_amm.so').chmod(0o600)
        binary = (out / 'cp_amm.so').read_bytes()
        hashes.append(digest(binary))
        public_out = DEST / name
        public_out.mkdir(parents=True, exist_ok=True)
        (public_out / 'cp_amm.so').write_bytes(binary)
    if hashes[0] != hashes[1]:
        raise ValueError('Official SBF reproduction mismatch')
    # Use the already locked official LiteSVM fixtures; verify the entire registry archive.
    package = next(x for x in tomllib.loads((ROOT / 'Cargo.lock').read_text())['package'] if x['name'] == 'litesvm')
    if package['version'] != '0.10.0' or package['checksum'] != '6a6d4edace08253a908d301768f291a7115e8e19e13473dd6e1ace78d6366433':
        raise ValueError('Expected pinned official LiteSVM fixture package')
    cached = next(iter((Path.home() / '.cargo/registry/cache').glob('*/litesvm-0.10.0.crate')), None)
    if cached is None:
        raise ValueError('Locked LiteSVM package missing: restore dependencies through the normal audited install')
    fixture_archive = cached.read_bytes()
    if digest(fixture_archive) != package['checksum']:
        raise ValueError('Official LiteSVM archive checksum mismatch')
    fixtures = {}
    with tarfile.open(fileobj=io.BytesIO(fixture_archive)) as bundle:
        vcs = json.loads(bundle.extractfile('litesvm-0.10.0/.cargo_vcs_info.json').read())
        for filename in ['spl_token-3.5.0.so', 'spl_token_2022-10.0.0.so', 'spl_associated_token_account-1.1.1.so']:
            content = bundle.extractfile('litesvm-0.10.0/src/programs/elf/' + filename).read()
            destination = DEST / 'spl-fixtures' / filename
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(content)
            fixtures[filename] = digest(content)
    record = {'splFixturePackage': {'name': 'litesvm', 'version': '0.10.0', 'archiveSha256': package['checksum'], 'officialGitCommit': vcs['git']['sha1'], 'binaries': fixtures}, 'programCommit': COMMIT, 'archiveUrl': URL, 'archiveSha256': ARCHIVE_SHA,
              'cargoLockSha256': expected['Cargo.lock'], 'sourceHashes': expected,
              'agave': '3.1.10', 'platformTools': 'v1.52', 'nativeRust': '1.93.0',
              'sbfRust': '1.89.0', 'binarySha256': hashes[0], 'reproduced': True,
              'rpcReads': False, 'deployments': False, 'upstreamWarningsNotSilenced': True}
    (DEST / 'build-record.json').write_text(json.dumps(record, indent=2, sort_keys=True) + '\n')
    print(json.dumps({k: v for k, v in record.items() if k != 'sourceHashes'}, indent=2))


if __name__ == '__main__':
    build()
