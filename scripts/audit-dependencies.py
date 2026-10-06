#!/usr/bin/env python3
"""Report retained findings explicitly; reject new findings and unavailable audits."""
from collections import Counter
from pathlib import Path
import argparse
import importlib.util
import json
import subprocess


def evaluate_yarn(output, returncode, policy):
    counts = Counter()
    findings = []
    summaries = []
    seen = set()
    for line in output.splitlines():
        entry = json.loads(line)
        if entry['type'] == 'error':
            raise ValueError('Yarn audit unavailable; cannot validate dependency state')
        if entry['type'] == 'auditSummary':
            summaries.append(entry['data']['vulnerabilities'])
        if entry['type'] != 'auditAdvisory':
            continue
        data = entry['data']
        advisory = data['advisory']
        identity, module, severity = (advisory[key] for key in ['github_advisory_id', 'module_name', 'severity'])
        path = data['resolution']['path']
        reviewed = policy['yarn'].get(identity)
        if not reviewed or module != reviewed['module'] or severity != reviewed['severity'] or path not in reviewed['paths']:
            raise ValueError('New advisory, severity, package or dependency path requires review')
        if (identity, path) in seen:
            raise ValueError('Duplicate advisory record')
        seen.add((identity, path))
        counts[severity] += 1
        findings.append({'advisory': identity, 'module': module, 'severity': severity, 'path': path})
    levels = {'info': 1, 'low': 2, 'moderate': 4, 'high': 8, 'critical': 16}
    if len(summaries) != 1 or set(summaries[0]) != set(levels) or any(summaries[0][key] != counts[key] for key in levels):
        raise ValueError('Missing or inconsistent Yarn audit summary')
    expected_exit = sum(bit for severity, bit in levels.items() if counts[severity])
    if returncode != expected_exit:
        raise ValueError('Unexpected Yarn audit exit status')
    return findings


def evaluate_rust(report, returncode, policy):
    vulnerabilities = report['vulnerabilities']
    if returncode != 0 or vulnerabilities['found'] or vulnerabilities['count'] != 0 or vulnerabilities['list']:
        raise ValueError('Rust audit failed or contains a vulnerability')
    findings = []
    for category, warnings in report['warnings'].items():
        for warning in warnings:
            key = [category, warning['advisory']['id'], warning['package']['name'], warning['package']['version']]
            if key not in policy['rustWarnings']:
                raise ValueError('New Rust warning or affected version requires review')
            findings.append(key)
    return findings


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cargo-audit', default='cargo-audit')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    destination = root / 'target/dependency-audit.json'
    destination.parent.mkdir(parents=True, exist_ok=True)
    record = {'status': 'incomplete'}

    def save():
        temporary = destination.with_suffix('.tmp')
        temporary.write_text(json.dumps(record, indent=2) + '\n')
        temporary.replace(destination)

    save()
    try:
        spec = importlib.util.spec_from_file_location('audit_sources', root / 'scripts/check-rc.py')
        sources = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(sources)
        record['sourceHashes'] = sources.source_hashes(root)
        record['head'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
        record['dirty'] = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=root))
        policy = json.loads((root / 'config/dependency-policy.json').read_text())
        yarn = subprocess.run(['yarn', 'audit', '--json'], cwd=root, capture_output=True, text=True, timeout=120)
        record['yarnFindings'] = evaluate_yarn(yarn.stdout, yarn.returncode, policy)
        rust = subprocess.run([args.cargo_audit, 'audit', '--json', '--db', str(root / 'target/advisory-db')],
                              cwd=root, capture_output=True, text=True, timeout=180)
        rust_report = json.loads(rust.stdout)
        record['rustWarnings'] = evaluate_rust(rust_report, rust.returncode, policy)
        record['rustDatabase'] = rust_report['database']
        if sources.source_hashes(root) != record['sourceHashes'] or subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip() != record['head'] or bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=root)) != record['dirty']:
            raise ValueError('Repository changed during audit')
        record['status'] = 'reviewed-findings-only'
        save()
        print(json.dumps(record, indent=2))
        print('Retained findings are NOT eliminated. No unreviewed advisory/path/version was accepted.')
    except BaseException:
        record['status'] = 'failed'
        save()
        raise


if __name__ == '__main__':
    main()
