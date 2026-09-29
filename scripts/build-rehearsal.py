#!/usr/bin/env python3
"""Offline rehearsal compiler. Never invokes build-sbf, Anchor deploy or a wallet."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

RELEASE = 'AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn'
HISTORICAL = 'BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc'
MINT = 'ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw'
LIB = 'programs/popecoin_vesting/src/lib.rs'
IDL = 'target/idl/popecoin_vesting.json'
TARGET = 'sbpf-solana-solana'
ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'


def program_bytes(value):
    if not isinstance(value, str) or not 32 <= len(value) <= 44 or any(c not in ALPHABET for c in value):
        raise ValueError('An explicit canonical public rehearsal Program ID is required')
    n = 0
    for c in value:
        n = n * 58 + ALPHABET.index(c)
    raw = b'\0' * (len(value) - len(value.lstrip('1'))) + n.to_bytes((n.bit_length() + 7) // 8, 'big')
    if len(raw) != 32 or not any(raw) or value in (RELEASE, HISTORICAL, MINT):
        raise ValueError('Protected or invalid rehearsal Program ID')
    return raw


def sha(data):
    return hashlib.sha256(data).hexdigest()


def public_read(root, name):
    path = root / name
    if Path(name).is_absolute() or '..' in Path(name).parts:
        raise ValueError('Unsafe public input path')
    if any(p.is_symlink() for p in [path, *path.parents] if p != root.parent):
        raise ValueError('Symlink in public input path')
    return path.read_bytes()


def inputs(root):
    names = ['Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', 'programs/popecoin_vesting/Cargo.toml']
    source = root / 'programs/popecoin_vesting/src'
    if source.is_symlink():
        raise ValueError('Symlink in source tree')
    for current, directories, files in os.walk(source, followlinks=False):
        if any((Path(current) / d).is_symlink() for d in directories):
            raise ValueError('Symlink in source tree')
        names += [str((Path(current) / f).relative_to(root)) for f in files if f.endswith('.rs')]
    data = {name: public_read(root, name) for name in sorted(names)}
    if data[LIB].count(f'declare_id!("{RELEASE}");'.encode()) != 1:
        raise ValueError('Unexpected release declaration')
    # Bind the adapted IDL to the same release sources and original IDL artifact.
    record = json.loads(public_read(root, 'target/release-build-record.json'))
    for name, content in data.items():
        if record['sourceHashes'].get(name) != sha(content):
            raise ValueError('Release IDL build record is stale; refresh offline release evidence first')
    idl_bytes = public_read(root, IDL)
    if record['outputHashes'].get(IDL) != sha(idl_bytes):
        raise ValueError('Release IDL hash mismatch')
    if json.loads(idl_bytes)['address'] != RELEASE:
        raise ValueError('Unexpected release IDL identity')
    return data, idl_bytes


def prepare(root, program):
    program_bytes(program)  # Must precede every read/write/subprocess.
    data, idl_bytes = inputs(root)
    base = root / 'target/rehearsal-builds'
    if (root / 'target').is_symlink() or base.is_symlink():
        raise ValueError('Symlink in output path')
    base.mkdir(parents=True, exist_ok=True)
    workspace = Path(tempfile.mkdtemp(prefix=program + '-', dir=base))
    copied = dict(data)
    copied[LIB] = copied[LIB].replace(f'declare_id!("{RELEASE}");'.encode(), f'declare_id!("{program}");'.encode())
    idl = json.loads(idl_bytes)
    idl['address'] = program
    copied['idl.json'] = (json.dumps(idl, indent=2, sort_keys=True) + '\n').encode()
    for name, content in copied.items():
        path = workspace / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
    manifest = dict(schemaVersion=1, status='prepared-not-built', cluster='devnet', programId=program,
                    sourceHashes={n: sha(b) for n, b in data.items()}, releaseIdlSha256=sha(idl_bytes),
                    preparedHashes={n: sha(b) for n, b in copied.items()},
                    idlOrigin='Release ABI adapted to explicit ID; not independently generated',
                    builderSha256=sha(Path(__file__).read_bytes()),
                    validation='No deployment, simulation, signature or runtime lifecycle validation')
    save(workspace, manifest)
    return workspace, manifest


def save(workspace, manifest):
    (workspace / 'manifest.json').write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n')


def compile_program(root, workspace, manifest, platform_tools):
    # Explicit installed tool directory only; never install/link toolchains automatically.
    tools = Path(platform_tools).resolve()
    bins = {n: tools / rel for n, rel in {'cargo':'rust/bin/cargo', 'rustc':'rust/bin/rustc',
        'clang':'llvm/bin/clang', 'ar':'llvm/bin/llvm-ar', 'objcopy':'llvm/bin/llvm-objcopy'}.items()}
    if not all(p.is_file() for p in bins.values()):
        raise ValueError('An installed platform-tools directory is required')
    # No inherited wallet credentials, Cargo wrappers, flags or target directories.
    env = {k: os.environ[k] for k in ('PATH', 'HOME', 'TMPDIR', 'SYSTEMROOT') if k in os.environ}
    env.update(NO_DNA='1', CARGO_TARGET_DIR=str(workspace / 'target'), CARGO_NET_OFFLINE='true',
               RUSTC=str(bins['rustc']), CC=str(bins['clang']), AR=str(bins['ar']),
               CARGO_TARGET_SBPF_SOLANA_SOLANA_RUSTFLAGS='-Zremap-cwd-prefix=')
    commands = [[str(bins['cargo']), 'build', '--release', '--target', TARGET, '--lib', '--frozen',
                 '--manifest-path', str(workspace / 'programs/popecoin_vesting/Cargo.toml')],
                [str(bins['objcopy']), '--strip-all', str(workspace / f'target/{TARGET}/release/popecoin_vesting.so'),
                 str(workspace / 'program.so')]]
    manifest.update(status='building', commands=commands,
                    toolHashes={n: sha(p.read_bytes()) for n, p in bins.items()})
    save(workspace, manifest)
    try:
        for command in commands:
            subprocess.run(command, cwd=workspace, env=env, check=True)
        data, idl_bytes = inputs(root)
        if manifest['sourceHashes'] != {n: sha(b) for n, b in data.items()} or manifest['releaseIdlSha256'] != sha(idl_bytes):
            raise ValueError('Public build inputs changed')
        for name, expected in manifest['preparedHashes'].items():
            if sha(public_read(workspace, name)) != expected:
                raise ValueError('Prepared inputs changed')
        binary = public_read(workspace, 'program.so')
        if not binary.startswith(b'\x7fELF') or program_bytes(manifest['programId']) not in binary:
            raise ValueError('ELF or embedded public ID check failed')
        manifest.update(status='built-not-runtime-verified', binarySha256=sha(binary))
        save(workspace, manifest)
    except BaseException:
        manifest['status'] = 'failed'
        save(workspace, manifest)
        raise


def verify(root, workspace, program):
    program_bytes(program)
    manifest = json.loads(public_read(workspace, 'manifest.json'))
    data, original_idl = inputs(root)
    if (manifest.get('schemaVersion') != 1 or manifest.get('cluster') != 'devnet'
            or manifest.get('programId') != program or manifest.get('status') != 'built-not-runtime-verified'):
        raise ValueError('Incomplete or mismatched rehearsal manifest')
    expected = dict(data)
    expected[LIB] = expected[LIB].replace(f'declare_id!("{RELEASE}");'.encode(), f'declare_id!("{program}");'.encode())
    idl = json.loads(original_idl)
    idl['address'] = program
    expected['idl.json'] = (json.dumps(idl, indent=2, sort_keys=True) + '\n').encode()
    if (manifest.get('sourceHashes') != {n: sha(b) for n, b in data.items()}
            or manifest.get('releaseIdlSha256') != sha(original_idl)
            or manifest.get('builderSha256') != sha(Path(__file__).read_bytes())
            or manifest.get('preparedHashes') != {n: sha(b) for n, b in expected.items()}):
        raise ValueError('Manifest inputs mismatch')
    for name, content in expected.items():
        if public_read(workspace, name) != content:
            raise ValueError('Prepared file mismatch')
    binary = public_read(workspace, 'program.so')
    if (sha(binary) != manifest.get('binarySha256') or not binary.startswith(b'\x7fELF')
            or program_bytes(program) not in binary):
        raise ValueError('Binary mismatch')
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--program-id', required=True)
    parser.add_argument('--verify', type=Path, help='Verify an existing public workspace; does not compile')
    parser.add_argument('--build', action='store_true', help='Compile offline with explicitly installed tools')
    parser.add_argument('--platform-tools', help='Installed platform-tools directory; required with --build')
    args = parser.parse_args()
    if args.build and not args.platform_tools:
        parser.error('--build requires --platform-tools')
    root = Path(__file__).resolve().parent.parent
    if args.verify:
        if args.build or args.platform_tools:
            parser.error('--verify cannot be combined with build options')
        print(json.dumps(verify(root, args.verify, args.program_id), indent=2, sort_keys=True))
        return
    workspace, manifest = prepare(root, args.program_id)
    print(f'Public rehearsal workspace: {workspace}', flush=True)
    if args.build:
        compile_program(root, workspace, manifest, args.platform_tools)
    print(json.dumps(manifest, indent=2, sort_keys=True))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error))
