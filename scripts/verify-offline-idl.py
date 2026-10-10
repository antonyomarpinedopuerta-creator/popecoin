#!/usr/bin/env python3
"""Compare captured Cargo --lib IDL print sections to an existing public IDL. No build/RPC."""
import argparse
import hashlib
import json
from pathlib import Path
import re


def decode(log):
    blocks = {}
    active = None
    lines = []
    for line in log.splitlines():
        begin = re.fullmatch(r'--- IDL begin (\w+) ---', line)
        end = re.fullmatch(r'--- IDL end (\w+) ---', line)
        if begin:
            if active is not None or begin[1] not in ['address', 'program', 'errors', 'const']:
                raise ValueError('Unsupported or interleaved IDL section')
            active, lines = begin[1], []
        elif end:
            if active != end[1]:
                raise ValueError('Incomplete IDL section')
            value = '\n'.join(lines)
            blocks.setdefault(active, []).append(re.sub('[^a-zA-Z0-9]', '', value) if active=='address' else json.loads(value))
            active = None
        elif active:
            lines.append(line)
    if active or any(len(blocks.get(k, [])) != 1 for k in ['address', 'program', 'errors']):
        raise ValueError('Missing or duplicate IDL sections')
    if 'test result: FAILED' in log or not re.search(r'test result: ok\. [1-9][0-9]* passed; 0 failed;', log):
        raise ValueError('Successful IDL generation required')
    value = blocks['program'][0]
    value['address'] = blocks['address'][0]
    value['errors'] = blocks['errors'][0]
    value['constants'] = blocks.get('const', [])
    # Current program has unique names. Fail on path collisions instead of guessing.
    names = [x['name'].split('::')[-1] for x in value.get('types', [])]
    if len(names) != len(set(names)):
        raise ValueError('Ambiguous IDL type paths')
    def normalize(v):
        if isinstance(v, str) and re.fullmatch(r'(\w+::)+\w+', v):
            return v.split('::')[-1]
        if isinstance(v, list):
            return [normalize(x) for x in v]
        if isinstance(v, dict):
            return {k:normalize(x) for k,x in v.items()}
        return v
    value = normalize(value)
    for field in ['accounts', 'instructions', 'constants', 'types']:
        rows = value.get(field, [])
        if len({x['name'] for x in rows}) != len(rows):
            raise ValueError('Duplicate IDL definitions')
        value[field] = sorted(rows, key=lambda x:x['name'])
    return value


def verify(log, expected):
    generated = decode(log)
    if generated != expected:
        raise ValueError('Freshly generated IDL differs from existing artifact')
    canonical = (json.dumps(generated, sort_keys=True, indent=2)+'\n').encode()
    return generated, hashlib.sha256(canonical).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--log', type=Path, required=True)
    parser.add_argument('--expected', type=Path, required=True)
    args = parser.parse_args()
    for path in [args.log, args.expected]:
        if path.is_symlink() or not path.is_file() or path.stat().st_size > 4*1024*1024:
            raise ValueError('Bounded public regular input required')
    _, digest = verify(args.log.read_text(), json.loads(args.expected.read_text()))
    print(json.dumps(dict(status='MATCHED_FRESH_CARGO_IDL_SECTIONS', canonicalSha256=digest,
                         runtimeVerified=False, authorization=False), indent=2))


if __name__ == '__main__':
    main()
