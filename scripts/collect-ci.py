#!/usr/bin/env python3
"""Verify hosted run identity and public archives against this local clean RC."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile

REPOSITORY = 'antonyomarpinedopuerta-creator/popecoin'


def load(filename):
    spec = importlib.util.spec_from_file_location(filename.replace('-', '_'), Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def validate_run(run, head, run_id):
    if (run.get('databaseId') != run_id or run.get('headSha') != head or run.get('status') != 'completed' or
            run.get('conclusion') != 'success' or run.get('workflowName') != 'Local candidate checks' or
            run.get('url') != f'https://github.com/{REPOSITORY}/actions/runs/{run_id}' or
            run.get('event') not in ['push', 'workflow_dispatch']):
        raise ValueError('Hosted run is not a successful candidate run in the expected repository')
    jobs = run.get('jobs', [])
    if len(jobs) != 3 or {j['name'] for j in jobs} != {'validate (first)', 'validate (second)', 'compare'} or any(
            j['status'] != 'completed' or j['conclusion'] != 'success' for j in jobs):
        raise ValueError('Missing or unsuccessful hosted jobs')


def verify_archive(path, report, reproduction):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if path.with_suffix('.sha256').read_text() != f'{digest}  {path.name}\n':
        raise ValueError('Hosted archive checksum mismatch')
    expected = {**report['sourceHashes'], **report['artifacts']}
    seen = set()
    manifest = (json.dumps({**report, 'reproduction': reproduction}, sort_keys=True, indent=2) + '\n').encode()
    with tarfile.open(path, 'r|gz') as archive:
        for member in archive:
            if member.name in seen or member.name not in set(expected) | {'rc-manifest.json'} or not member.isfile() or member.size > 64 * 1024 * 1024:
                raise ValueError('Invalid hosted archive inventory or entry')
            seen.add(member.name)
            data = archive.extractfile(member).read(member.size + 1)
            if member.name == 'rc-manifest.json':
                if data != manifest: raise ValueError('Hosted manifest mismatch')
            elif hashlib.sha256(data).hexdigest() != expected[member.name]:
                raise ValueError('Hosted file hash mismatch')
    if seen != set(expected) | {'rc-manifest.json'}:
        raise ValueError('Incomplete hosted archive')
    return digest


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('run_id', type=int); args = parser.parse_args()
    if args.run_id <= 0: raise ValueError('Invalid run ID')
    root = Path(__file__).resolve().parent.parent
    output = root / 'target/hosted-ci.json'; output.parent.mkdir(exist_ok=True)
    output.write_text('{"status":"incomplete"}\n')
    package = load('package-rc.py'); local = package.verify(root)
    run = json.loads(subprocess.check_output(['gh', 'run', 'view', str(args.run_id), '--repo', REPOSITORY,
        '--json', 'databaseId,headSha,status,conclusion,url,workflowName,jobs,event'], text=True, timeout=60))
    validate_run(run, local['head'], args.run_id)
    workspace = Path(tempfile.mkdtemp(prefix='hosted-evidence-', dir=root / 'target'))
    for name in ['rc-first', 'rc-second', 'reproducibility-comparison']:
        subprocess.run(['gh', 'run', 'download', str(args.run_id), '--repo', REPOSITORY, '--name', name,
                        '--dir', str(workspace / name)], check=True, timeout=120)
    reports = [json.loads((workspace / name / 'rc-check.json').read_text()) for name in ['rc-first', 'rc-second']]
    comparison = load('compare-builds.py').compare(reports, local['head'], local['sourceHashes'])
    hosted_comparison = json.loads((workspace / 'reproducibility-comparison/ci-comparison.json').read_text())
    if comparison != hosted_comparison or comparison['artifactHashes'] != local['artifacts']:
        raise ValueError('Hosted comparison or artifacts differ from local candidate')
    archives = {}
    for name, report in zip(['rc-first', 'rc-second'], reports):
        reproduction = json.loads((workspace / name / 'reproducibility.json').read_text())
        if reproduction.get('status') != 'passed': raise ValueError('Hosted reproduction failed')
        path = workspace / name / 'rc' / f"papa-{local['head'][:12]}.tar.gz"
        archives[name] = verify_archive(path, report, reproduction)
    if package.verify(root) != local: raise ValueError('Local candidate changed')
    result = {'status': 'passed', 'head': local['head'], 'run': run, 'comparison': comparison,
              'archiveSha256': archives, 'workspace': str(workspace),
              'scope': 'GitHub API + both public archive inventories/hashes verified against local RC; no independent security audit'}
    temporary = output.with_suffix('.tmp'); temporary.write_text(json.dumps(result, indent=2) + '\n'); temporary.replace(output)
    print(f'PASS: {run["url"]}; both hosted archives and all six artifacts match the local candidate')


if __name__ == '__main__':
    main()
