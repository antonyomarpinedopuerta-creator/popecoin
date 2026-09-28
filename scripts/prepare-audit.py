#!/usr/bin/env python3
"""Collect hash-linked public evidence for a human reviewer, never audit approval."""
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path


def load(filename):
    spec = importlib.util.spec_from_file_location(filename.replace('-', '_'), Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_evidence(value, head, status='passed'):
    if value.get('status') != status or value.get('head') != head or value.get('dirty', False) is not False:
        raise ValueError('Evidence is failed, stale, dirty or incomplete')


def main():
    root = Path(__file__).resolve().parent.parent
    output = root / 'target/audit-review.json'
    output.parent.mkdir(exist_ok=True)
    output.write_text('{"status":"incomplete"}\n')
    package = load('package-rc.py')
    rc = package.verify(root)
    head = rc['head']
    archive = root / 'target/rc' / f'papa-{head[:12]}.tar.gz'
    archive_sha = package.verify_archive(root, archive)
    evidence = {}
    for name, status in [('clean-check', 'passed'), ('metadata-local', 'passed'), ('metadata-remote', 'passed'),
                         ('devnet-rehearsal', 'passed'), ('dependency-audit', 'reviewed-findings-only')]:
        path = root / f'target/{name}.json'
        raw = package.public_bytes(root, path.relative_to(root).as_posix())
        value = json.loads(raw)
        validate_evidence(value, head, status)
        if name == 'clean-check' and value.get('sourceHashes') != rc['sourceHashes']:
            raise ValueError('Clean installation sources differ')
        evidence[name] = {'sha256': hashlib.sha256(raw).hexdigest(), 'report': value}
    if package.verify(root) != rc:
        raise ValueError('Candidate changed while collecting evidence')
    report = {'status': 'prepared-for-independent-review', 'head': head, 'observedAt': datetime.now(timezone.utc).isoformat(),
              'archive': str(archive.relative_to(root)), 'archiveSha256': archive_sha, 'evidence': evidence,
              'scopeDocument': 'docs/INDEPENDENT_AUDIT.md',
              'unfulfilled': ['Independent security audit', 'Hosted CI run and cross-runner comparison',
                             'Signed Devnet deployment and lifecycle for this candidate', 'Production parameters and custody approval'],
              'warning': 'Integrity links are not signatures or independent verification. No production authorization.'}
    temporary = output.with_suffix('.tmp')
    temporary.write_text(json.dumps(report, indent=2) + '\n')
    temporary.replace(output)
    print(f'Prepared {output.relative_to(root)}; independent review and signed rehearsal remain external')


if __name__ == '__main__':
    main()
