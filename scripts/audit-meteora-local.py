#!/usr/bin/env python3
"""Audit the unchanged official Meteora lock; findings stay failing, never allowlisted."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'target/meteora-official/damm-v2-a85c926607433f23f0ea60f4ca7b1ae92f4156cb'
EXPECTED_LOCK = 'b5ec7c2a5793afc7f8c46169b23cb370bd90f13a86e753beec7bc01f5c42e1d0'


def evaluate(data, returncode):
    """Reject partial scanner output; warnings also require production review."""
    if not isinstance(data, dict) or data.get('error') or returncode not in (0, 1):
        raise ValueError('External audit did not produce complete evidence')
    vulns, warning_groups, database = (data.get(k) for k in ('vulnerabilities', 'warnings', 'database'))
    if (not isinstance(vulns, dict) or not isinstance(vulns.get('list'), list) or
            type(vulns.get('count')) is not int or type(vulns.get('found')) is not bool or
            vulns['count'] != len(vulns['list']) or vulns['found'] != bool(vulns['list']) or
            not isinstance(warning_groups, dict) or not isinstance(database, dict) or
            type(database.get('advisory-count')) is not int or database['advisory-count'] <= 0):
        raise ValueError('Incomplete or inconsistent audit evidence')
    if returncode != int(bool(vulns['list'])):
        raise ValueError('Scanner exit disagrees with vulnerability evidence')
    if any(not isinstance(kind, str) or not kind or not isinstance(values, list)
           for kind, values in warning_groups.items()):
        raise ValueError('Incomplete warnings evidence')
    def item(record):
        if not isinstance(record, dict):
            raise ValueError('Malformed finding')
        a, package = record.get('advisory'), record.get('package')
        if (not isinstance(a, dict) or not isinstance(package, dict) or
                not isinstance(a.get('id'), str) or not re.fullmatch(r'RUSTSEC-\d{4}-\d{4}', a['id']) or
                any(not isinstance(v, str) or not v for v in
                    [a.get('title'), package.get('name'), package.get('version')])):
            raise ValueError('Malformed finding identity')
        versions = record.get('versions', {})
        if (not isinstance(versions, dict) or not isinstance(versions.get('patched', []), list) or
                any(not isinstance(v, str) or not v for v in versions.get('patched', []))):
            raise ValueError('Malformed patched versions')
        return {'id': a['id'], 'package': record['package']['name'], 'version': record['package']['version'],
                'title': a['title'], 'source': f"https://rustsec.org/advisories/{a['id']}.html",
                'patched': record.get('versions', {}).get('patched', [])}
    vulnerabilities = [item(x) for x in data['vulnerabilities']['list']]
    warnings = [{**item(x), 'kind': kind} for kind, values in data.get('warnings', {}).items() for x in values]
    identities = [(v['id'], v['package'], v['version']) for v in vulnerabilities + warnings]
    if len(identities) != len(set(identities)):
        raise ValueError('Duplicate finding identity')
    report = {'scope': 'OFFICIAL_METEORA_SOURCE_LOCK_ONLY_NOT_DEPLOYED_PROGRAM_AUDIT',
              'status': 'BLOCKED_FOR_PRODUCTION_REVIEW' if vulnerabilities or warnings else 'NO_FINDINGS_REPORTED_NOT_SECURITY_APPROVAL',
              'exitCode': returncode, 'cargoLockSha256': EXPECTED_LOCK, 'database': data['database'],
              'vulnerabilities': vulnerabilities, 'warnings': warnings,
              'limitations': 'Whole lock includes SDK/dev/optional dependencies. ruint is a direct normal cp-amm dependency; no claim of exploitability or deployed equivalence. No upstream lock/source patch or advisory suppression.'}
    return report


def main():
    output = ROOT / 'target/meteora-official/upstream-audit.json'
    try:
        if hashlib.sha256((SOURCE / 'Cargo.lock').read_bytes()).hexdigest() != EXPECTED_LOCK:
            raise ValueError('Official Meteora lock checksum mismatch')
        process = subprocess.run(['cargo-audit', 'audit', '--file', str(SOURCE / 'Cargo.lock'),
                                  '--db', str(ROOT / 'target/advisory-db'), '--no-fetch', '--json'],
                                 capture_output=True, text=True, check=False)
        report = evaluate(json.loads(process.stdout), process.returncode)
    except Exception:
        output.write_text(json.dumps({'status': 'FAILED_INCOMPLETE_EVIDENCE', 'authorization': False}) + '\n')
        raise
    output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
    return 1 if report['vulnerabilities'] or report['warnings'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
