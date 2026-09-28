#!/usr/bin/env python3
"""Validate pinned public branding locally or through fixed Devnet HTTP URLs."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import urllib.request

BASE = 'https://raw.githubusercontent.com/antonyomarpinedopuerta-creator/popecoin/master/metadata/'
IMAGE = BASE + 'papa-logo.png'
METADATA = BASE + 'metadata.json'
LOGO_SHA = '7be34ed33f6fd2fe52946d43a4eccfd8e41055190bbc29d46a3e285858ee55eb'
DESCRIPTION = ('PAPA ($PAPA) is a community-driven satirical memecoin on Solana built around memes, transparency and digital culture. '
               'PAPA is an independent fictional project and is not affiliated with, endorsed by, or associated with the Vatican, '
               'the Holy See, the Catholic Church, or any real Pope.')


def unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate metadata key')
        result[key] = value
    return result


def validate(data, image):
    if len(data) > 16384 or len(image) > 4 * 1024 * 1024:
        raise ValueError('Metadata/image exceeds size budget')
    value = json.loads(data.decode('utf-8'), object_pairs_hook=unique)
    if value != dict(name='PAPA', symbol='PAPA', description=DESCRIPTION, image=IMAGE):
        raise ValueError('Unexpected Devnet metadata fields, disclaimer or image URL')
    if hashlib.sha256(image).hexdigest() != LOGO_SHA:
        raise ValueError('Pinned logo hash mismatch')
    if image[:8] != b'\x89PNG\r\n\x1a\n' or image[12:16] != b'IHDR' or tuple(int.from_bytes(image[i:i+4], 'big') for i in (16, 20)) != (1254, 1254):
        raise ValueError('Unexpected PNG dimensions/header')
    return {'metadataSha256': hashlib.sha256(data).hexdigest(), 'logoSha256': LOGO_SHA,
            'name': value['name'], 'symbol': value['symbol'], 'image': IMAGE, 'dimensions': [1254, 1254]}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Metadata redirects are not permitted')


def download(url, limit, opener=None):
    if url not in (IMAGE, METADATA):
        raise ValueError('Only fixed public Devnet metadata URLs may be fetched')
    opener = opener or urllib.request.build_opener(NoRedirect())
    with opener.open(urllib.request.Request(url, headers={'Accept-Encoding': 'identity'}), timeout=15) as response:
        if response.status != 200 or response.geturl() != url or response.headers.get('Content-Encoding', 'identity') != 'identity':
            raise ValueError('Unexpected HTTP response')
        data = response.read(limit + 1)
        if len(data) > limit:
            raise ValueError('HTTP response exceeds size budget')
        return data


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--remote', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    target = root / 'target' / ('metadata-remote.json' if args.remote else 'metadata-local.json')
    target.parent.mkdir(exist_ok=True)
    report = {'status': 'incomplete', 'scope': 'Devnet branding only; not durable production hosting',
              'observedAt': datetime.now(timezone.utc).isoformat()}
    def save():
        temporary = target.with_suffix('.tmp')
        temporary.write_text(json.dumps(report, indent=2) + '\n')
        temporary.replace(target)
    save()
    try:
        report['head'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
        report['dirty'] = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=root))
        local = validate((root / 'metadata/metadata.json').read_bytes(), (root / 'metadata/papa-logo.png').read_bytes())
        report['local'] = local
        if args.remote:
            report['remote'] = validate(download(METADATA, 16384), download(IMAGE, 4 * 1024 * 1024))
        report['status'] = 'passed'
        save()
        print(f'PASS: {target.relative_to(root)}; production hosting still pending')
    except BaseException:
        report['status'] = 'failed'
        save()
        raise


if __name__ == '__main__':
    main()
