#!/usr/bin/env python3
"""Deterministic public recovery package, allowlisted RC inputs/artifacts only."""
from pathlib import Path
import gzip
import hashlib
import importlib.util
import io
import json
import os
import stat
import re
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
    audit = json.loads(package.public_bytes(root, 'target/dependency-audit.json'))
    validate_audit(audit, report)
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


def validate_audit(audit, report):
    if (audit.get('status') != 'reviewed-findings-only' or audit.get('dirty') is not False or
            audit.get('head') != report['head'] or audit.get('sourceHashes') != report['sourceHashes']):
        raise ValueError('Dependency audit must validate the exact clean backup candidate')


# Conservative local public package limits; never extract archive members.
MAX_COMPRESSED = 64 * 1024 * 1024
MAX_EXPANDED = 128 * 1024 * 1024
MAX_MEMBER = 32 * 1024 * 1024
MAX_ENTRIES = 4096


def bounded_regular(path, limit):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_size > limit:
            raise ValueError('Backup input is not a bounded regular file')
        with os.fdopen(fd, 'rb', closefd=False) as source:
            value = source.read(limit + 1)
        if len(value) > limit:
            raise ValueError('Backup input exceeds size limit')
        return value
    finally:
        os.close(fd)


def unique_object(pairs):
    result = {}
    for name, value in pairs:
        if name in result:
            raise ValueError('Duplicate manifest field')
        result[name] = value
    return result


def verify_backup(path):
    path = Path(path)
    if load('check-public').sensitive_name(path.name):
        raise ValueError('Sensitive backup filename')
    raw = bounded_regular(path, MAX_COMPRESSED)
    expected = f'{hashlib.sha256(raw).hexdigest()}  {path.name}\n'.encode()
    if bounded_regular(path.with_suffix('.sha256'), 512) != expected:
        raise ValueError('Backup checksum sidecar mismatch')
    # Bound decompression itself, including tar headers, padding and trailing data.
    try:
        with gzip.GzipFile(fileobj=io.BytesIO(raw)) as zipped:
            expanded = zipped.read(MAX_EXPANDED + 1)
    except (OSError, EOFError) as error:
        raise ValueError('Invalid compressed backup') from error
    if len(expanded) > MAX_EXPANDED:
        raise ValueError('Backup expansion exceeds size limit')
    seen, hashes = set(), {}
    with tarfile.open(fileobj=io.BytesIO(expanded), mode='r:') as archive:
        manifest = None
        for item in archive:
            name = item.name
            if (len(seen) >= MAX_ENTRIES or not item.isfile() or item.issparse() or name in seen or
                    Path(name).is_absolute() or '..' in Path(name).parts or
                    Path(name).as_posix() != name or '\\' in name or item.size > MAX_MEMBER or item.size < 0):
                raise ValueError('Unsafe or oversized archive entry')
            seen.add(name)
            if load('check-public').sensitive_name(name):
                raise ValueError('Sensitive backup filename')
            value = archive.extractfile(item).read(item.size + 1)
            if len(value) != item.size:
                raise ValueError('Incomplete archive member')
            if load('security-scan').suspect(value):
                raise ValueError('Credential heuristic rejected archive member')
            if name == 'backup-manifest.json':
                manifest = json.loads(value, object_pairs_hook=unique_object)
            else:
                hashes[name] = hashlib.sha256(value).hexdigest()
    files = manifest.get('files') if isinstance(manifest, dict) else None
    if (not isinstance(files, dict) or not files or
            any(not isinstance(v, str) or not re.fullmatch('[0-9a-f]{64}', v) for v in files.values()) or hashes != files):
        raise ValueError('Backup inventory/hash mismatch')
    return manifest


if __name__ == '__main__':
    import sys
    if len(sys.argv) == 3 and sys.argv[1] == '--verify':
        print(json.dumps(verify_backup(sys.argv[2]), indent=2))
    elif len(sys.argv) == 1:
        make_backup()
    else:
        raise SystemExit('Use no arguments to create, or --verify archive to validate')
