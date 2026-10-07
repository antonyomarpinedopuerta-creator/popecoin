#!/usr/bin/env python3
"""Audit the unchanged official Meteora lock; findings stay failing, never allowlisted."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'target/meteora-official/damm-v2-a85c926607433f23f0ea60f4ca7b1ae92f4156cb'
EXPECTED_LOCK = 'b5ec7c2a5793afc7f8c46169b23cb370bd90f13a86e753beec7bc01f5c42e1d0'


def main():
    if hashlib.sha256((SOURCE / 'Cargo.lock').read_bytes()).hexdigest() != EXPECTED_LOCK:
        raise ValueError('Official Meteora lock checksum mismatch')
    process = subprocess.run(['cargo-audit', 'audit', '--file', str(SOURCE / 'Cargo.lock'),
                              '--db', str(ROOT / 'target/advisory-db'), '--no-fetch', '--json'],
                             capture_output=True, text=True, check=False)
    data = json.loads(process.stdout)
    if 'vulnerabilities' not in data or data.get('error'):
        raise ValueError('External audit did not produce complete evidence')
    def item(record):
        a = record['advisory']
        return {'id': a['id'], 'package': record['package']['name'], 'version': record['package']['version'],
                'title': a['title'], 'source': f"https://rustsec.org/advisories/{a['id']}.html",
                'patched': record.get('versions', {}).get('patched', [])}
    vulnerabilities = [item(x) for x in data['vulnerabilities']['list']]
    warnings = [{**item(x), 'kind': kind} for kind, values in data.get('warnings', {}).items() for x in values]
    report = {'scope': 'OFFICIAL_METEORA_SOURCE_LOCK_ONLY_NOT_DEPLOYED_PROGRAM_AUDIT',
              'status': 'BLOCKED_FOR_PRODUCTION_REVIEW' if vulnerabilities or process.returncode else 'NO_VULNERABILITIES_REPORTED',
              'exitCode': process.returncode, 'cargoLockSha256': EXPECTED_LOCK, 'database': data['database'],
              'vulnerabilities': vulnerabilities, 'warnings': warnings,
              'limitations': 'Whole lock includes SDK/dev/optional dependencies. ruint is a direct normal cp-amm dependency; no claim of exploitability or deployed equivalence. No upstream lock/source patch or advisory suppression.'}
    (ROOT / 'target/meteora-official/upstream-audit.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
    return 1 if vulnerabilities or process.returncode else 0


if __name__ == '__main__':
    raise SystemExit(main())
