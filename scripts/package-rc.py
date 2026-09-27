#!/usr/bin/env python3
"""Verify current clean-tree RC evidence and bundle only explicit public inputs."""
from pathlib import Path
import argparse
import gzip
import hashlib
import importlib.util
import io
import json
import subprocess
import tarfile


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


rc = load('rc_checks', 'check-rc.py')
reproduction = load('rc_reproduction', 'reproduce-release.py')


def public_bytes(root, name):
    relative = Path(name)
    if relative.is_absolute() or '..' in relative.parts:
        raise ValueError('Unexpected artifact path')
    current = root
    for part in relative.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError('Symlinks are not permitted in RC evidence')
    return current.read_bytes()


def verify(root):
    report = json.loads(public_bytes(root, 'target/rc-check.json'))
    if report.get('schemaVersion') != 1 or report.get('status') != 'passed' or report.get('dirty') is not False:
        raise ValueError('RC evidence must pass on a clean tree; commit and run check:rc again')
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    if report.get('head') != head or subprocess.check_output(['git', 'status', '--porcelain'], cwd=root):
        raise ValueError('Git revision or working tree differs from the validated candidate')
    expected_checks = [{'command': command, 'exitCode': 0} for command in rc.COMMANDS]
    if report.get('checks') != expected_checks:
        raise ValueError('Incomplete or unexpected RC check sequence')
    if report.get('sourceHashes') != rc.source_hashes(root):
        raise ValueError('RC sources changed since validation')
    artifacts = report.get('artifacts')
    if not isinstance(artifacts, dict) or set(artifacts) != set(rc.ARTIFACTS):
        raise ValueError('Incomplete or unexpected RC artifact set')
    for name, expected in artifacts.items():
        if hashlib.sha256(public_bytes(root, name)).hexdigest() != expected:
            raise ValueError(f'Stale RC artifact: {name}')
    rebuilt = json.loads(public_bytes(root, 'target/reproducibility.json'))
    if rebuilt.get('status') != 'passed':
        raise ValueError('Fresh-workspace reproduction has not passed')
    reproduction.compare({name: artifacts[name] for name in reproduction.OUTPUTS}, rebuilt.get('outputHashes', {}))
    # Reproduction only reads Rust/build inputs, which must be in the full RC manifest.
    reproduced_sources = rebuilt.get('sourceHashes')
    required = {'Cargo.toml', 'Cargo.lock', 'Anchor.toml', 'rust-toolchain.toml', 'scripts/build-release.py', 'scripts/reproduce-release.py'}
    required.update(name for name in report['sourceHashes'] if name.startswith('programs/') and
                    (name.endswith('.rs') or name.endswith('/Cargo.toml')))
    if not isinstance(reproduced_sources, dict) or set(reproduced_sources) != required or any(
            report['sourceHashes'].get(name) != digest for name, digest in reproduced_sources.items()):
        raise ValueError('Reproduction sources do not match the candidate')
    versions = report.get('toolVersions')
    if not isinstance(versions, dict) or set(versions) != {'rustc', 'cargo', 'sbf', 'solana', 'anchor', 'node', 'yarn', 'python'} or any(
            not isinstance(value, str) or not value for value in versions.values()):
        raise ValueError('Missing toolchain evidence')
    return report


def bundle(root, report):
    contents = {}
    for name, digest in {**report['sourceHashes'], **report['artifacts']}.items():
        data = public_bytes(root, name)
        if hashlib.sha256(data).hexdigest() != digest:
            raise ValueError('Candidate changed while packaging')
        contents[name] = data
    manifest = {**report, 'reproduction': json.loads(public_bytes(root, 'target/reproducibility.json'))}
    contents['rc-manifest.json'] = (json.dumps(manifest, sort_keys=True, indent=2) + '\n').encode()
    # The archive has deterministic order, metadata and gzip header for these bytes.
    output = io.BytesIO()
    with gzip.GzipFile(fileobj=output, mode='wb', filename='', mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w', format=tarfile.PAX_FORMAT) as archive:
            for name, data in sorted(contents.items()):
                entry = tarfile.TarInfo(name)
                entry.size = len(data)
                entry.mode = 0o644
                archive.addfile(entry, io.BytesIO(data))
    # Recheck after collecting bytes; a concurrent edit/commit must not be packaged.
    if verify(root) != report:
        raise ValueError('RC evidence changed while packaging')
    destination = root / 'target/rc' / f"papa-{report['head'][:12]}.tar.gz"
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix('.tmp')
    temporary.write_bytes(output.getvalue())
    temporary.replace(destination)
    digest = hashlib.sha256(output.getvalue()).hexdigest()
    destination.with_suffix('.sha256').write_text(f'{digest}  {destination.name}\n')
    print(f'{destination.relative_to(root)} SHA-256 {digest}')
    return destination


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify-only', action='store_true')
    arguments = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    report = verify(root)
    if arguments.verify_only:
        print('PASS: clean current RC, complete checks, current artifacts and fresh-build correspondence')
    else:
        bundle(root, report)


if __name__ == '__main__':
    main()
