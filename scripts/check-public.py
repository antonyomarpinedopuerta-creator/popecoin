#!/usr/bin/env python3
"""Heuristic public-file gate. Never print matching content or open sensitive names."""
from pathlib import Path
import re
import subprocess


def sensitive_name(name):
    path = Path(name)
    base = path.name.lower()
    return (path.is_absolute() or '..' in path.parts or base.startswith('.env') or
            path.suffix.lower() in {'.pem', '.key', '.p12', '.pfx', '.keystore'} or
            (base.endswith('.json') and (base in {'id.json', 'keys.json'} or any(
                word in base for word in ['keypair', 'wallet', 'seed', 'secret', 'credential']))))


def scan_bytes(data):
    patterns = [
        rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
        rb'\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}',
        rb'\bAKIA[A-Z0-9]{16}\b',
        rb'\A\s*\[\s*\d{1,3}(?:\s*,\s*\d{1,3}){31,63}\s*\]\s*\Z',
    ]
    return any(re.search(pattern, data) for pattern in patterns)


def check(root):
    files = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root).decode().split('\0')
    files = sorted(set(filter(None, files)))
    # Check historical filenames only: do not open old wallet/key blobs.
    history = subprocess.check_output(['git', 'log', '--all', '--format=', '--name-only'], cwd=root, text=True)
    if any(sensitive_name(name) for name in history.splitlines() if name):
        raise ValueError('Potential sensitive filename in Git history; review names without opening keys')
    for name in files:
        if sensitive_name(name):
            raise ValueError(f'Sensitive filename rejected without opening content: {name}')
        file = root / name
        current = root
        for part in Path(name).parts:
            current = current / part
            if current.is_symlink():
                raise ValueError('Symlink rejected without opening target')
        if not file.is_file():
            raise ValueError('Tracked public file is missing or not regular')
        if scan_bytes(file.read_bytes()):
            raise ValueError(f'Potential credential pattern in {name}; value redacted')
    print(f'PASS: {len(files)} public files; no checked credential patterns or sensitive names. Heuristic, not a universal secret audit.')


if __name__ == '__main__':
    check(Path(__file__).resolve().parent.parent)
