#!/usr/bin/env python3
"""Heuristic scan of public bytes and recent Git blobs; report no credential values."""
from pathlib import Path
import importlib.util
import json
import os
import re
import stat
import subprocess

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('public_gate', ROOT / 'scripts/check-public.py')
public = importlib.util.module_from_spec(spec)
spec.loader.exec_module(public)


def suspect(data):
    if public.scan_bytes(data):
        return True
    # Arrays embedded in logs/JSON, not only files consisting of an array.
    for match in re.finditer(rb'\[\s*\d{1,3}(?:\s*,\s*\d{1,3}){63}\s*\]', data):
        if all(int(n) <= 255 for n in re.findall(rb'\d+', match.group())):
            return True
    return bool(re.search(rb'\b(?:xox[baprs]-[A-Za-z0-9-]{20,}|sk_live_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{35})', data))


def scan(root=ROOT, history_limit=20):
    public.check(root)
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    commits = subprocess.check_output(['git', 'log', f'-{history_limit}', '--format=%H'], cwd=root, text=True).splitlines()
    findings, blobs = [], set()
    for commit in commits:
        records = subprocess.check_output(['git', 'ls-tree', '-rz', commit], cwd=root).split(b'\0')
        for record in filter(None, records):
            metadata, name = record.split(b'\t', 1)
            mode, kind, oid = metadata.decode().split()
            path = name.decode()
            if public.sensitive_name(path) or mode == '120000':
                findings.append({'commit': commit, 'path': path, 'reason': 'sensitive name/symlink; content not opened'})
                continue
            if kind != 'blob' or oid in blobs:
                continue
            blobs.add(oid)
            if suspect(subprocess.check_output(['git', 'cat-file', 'blob', oid], cwd=root)):
                findings.append({'commit': commit, 'path': path, 'reason': 'credential heuristic; value redacted'})
    current = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root).decode().split('\0')
    for name in filter(None, current):
        if suspect((root / name).read_bytes()):
            findings.append({'path': name, 'reason': 'current public credential heuristic; value redacted'})
    private_modes = []
    base = root / 'target/rehearsal-identities'
    if base.exists():
        for current_dir, dirs, names in os.walk(base, followlinks=False):
            directory = Path(current_dir)
            if directory.is_symlink():
                raise ValueError('Private identity symlink rejected without opening')
            mode = stat.S_IMODE(directory.stat().st_mode)
            if mode != 0o700:
                findings.append({'path': str(directory.relative_to(root)), 'reason': 'private directory mode must be 0700'})
            for name in names:
                file = directory / name
                # Only stat + Git-ignore: never read private identity contents.
                if file.is_symlink() or not file.is_file():
                    raise ValueError('Private identity must be a regular file')
                relative = file.relative_to(root).as_posix()
                ignored = subprocess.run(['git', 'check-ignore', '-q', '--', relative], cwd=root).returncode == 0
                if stat.S_IMODE(file.stat().st_mode) != 0o600 or not ignored:
                    findings.append({'path': relative, 'reason': 'private file must be ignored and 0600'})
                private_modes.append({'path': relative, 'mode': oct(stat.S_IMODE(file.stat().st_mode)), 'ignored': ignored})
    return {'status': 'passed' if not findings else 'failed', 'head': head,
            'historyCommits': commits, 'uniquePublicHistoryBlobs': len(blobs),
            'privateIdentityMetadataOnly': private_modes, 'findings': findings,
            'limits': 'Heuristic, not a universal guarantee; no credential values printed, private key files never read. All historical filenames checked by public gate; byte scan limited to most recent 20 commits.'}


if __name__ == '__main__':
    report = scan()
    output = ROOT / 'target/security-scan.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k not in {'historyCommits', 'privateIdentityMetadataOnly'}}, indent=2))
    raise SystemExit(0 if report['status'] == 'passed' else 1)
