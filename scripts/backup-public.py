#!/usr/bin/env python3
"""Deterministic public recovery package, allowlisted RC inputs/artifacts only."""
from pathlib import Path
import gzip
import hashlib
import importlib.util
import io
import json
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parent.parent


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def make_backup(root=ROOT):
    package = load('package-rc')
    report = package.verify(root)
    load('check-public').check(root)
    security = load('security-scan').scan(root)
    if security['status'] != 'passed':
        raise ValueError('Security heuristics failed; no public backup produced')
    tracked = set(filter(None, subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')))
    if tracked != set(report['sourceHashes']):
        raise ValueError('RC inventory must include every tracked public file before backup')
    data = {name: package.public_bytes(root, name) for name in report['sourceHashes']}
    # Explicit small public artifacts, not node_modules, private identities or target tree.
    for name in report['artifacts']:
        data[name] = package.public_bytes(root, name)
    for name in ['target/rc-check.json', 'target/reproducibility.json', 'target/security-scan.json', 'target/dependency-audit.json']:
        data[name] = package.public_bytes(root, name)
    if any(load('security-scan').suspect(value) for value in data.values()):
        raise ValueError('Credential heuristic rejected backup bytes; values not printed')
    manifest = {'schema': 1, 'head': report['head'], 'scope': 'Public software/evidence only. No private identity recovery. Mainnet disabled.',
                'files': {name: hashlib.sha256(value).hexdigest() for name, value in sorted(data.items())}}
    data['backup-manifest.json'] = (json.dumps(manifest, indent=2, sort_keys=True) + '\n').encode()
    out = io.BytesIO()
    with gzip.GzipFile(fileobj=out, mode='wb', filename='', mtime=0) as zipped:
        with tarfile.open(fileobj=zipped, mode='w', format=tarfile.PAX_FORMAT) as archive:
            for name, value in sorted(data.items()):
                entry = tarfile.TarInfo(name)
                entry.size = len(value)
                entry.mode = 0o644
                archive.addfile(entry, io.BytesIO(value))
    if package.verify(root) != report:
        raise ValueError('Candidate changed during backup')
    destination = root / 'target/backups' / f"robusto-public-{report['head'][:12]}.tar.gz"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(out.getvalue())
    digest = hashlib.sha256(out.getvalue()).hexdigest()
    destination.with_suffix('.sha256').write_text(f'{digest}  {destination.name}\n')
    verify_backup(destination)
    print(json.dumps({'archive': str(destination), 'sha256': digest, 'head': report['head'], 'entries': len(data)}, indent=2))
    return destination


def verify_backup(path):
    raw = Path(path).read_bytes()
    seen, hashes = set(), {}
    with tarfile.open(fileobj=io.BytesIO(raw), mode='r:gz') as archive:
        manifest = None
        for item in archive:
            if not item.isfile() or item.name in seen or Path(item.name).is_absolute() or '..' in Path(item.name).parts:
                raise ValueError('Unsafe archive entry')
            seen.add(item.name)
            if load('check-public').sensitive_name(item.name):
                raise ValueError('Sensitive backup filename')
            value = archive.extractfile(item).read()
            if load('security-scan').suspect(value):
                raise ValueError('Credential heuristic rejected archive member')
            if item.name == 'backup-manifest.json':
                manifest = json.loads(value)
            else:
                hashes[item.name] = hashlib.sha256(value).hexdigest()
    if not manifest or hashes != manifest['files']:
        raise ValueError('Backup inventory/hash mismatch')
    expected = f'{hashlib.sha256(raw).hexdigest()}  {Path(path).name}\n'
    if Path(path).with_suffix('.sha256').read_text() != expected:
        raise ValueError('Backup checksum sidecar mismatch')
    return manifest


if __name__ == '__main__':
    import sys
    if len(sys.argv) == 3 and sys.argv[1] == '--verify':
        print(json.dumps(verify_backup(sys.argv[2]), indent=2))
    elif len(sys.argv) == 1:
        make_backup()
    else:
        raise SystemExit('Use no arguments to create, or --verify archive to validate')
