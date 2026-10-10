#!/usr/bin/env python3
"""Package two independently built public fixture workspaces; never build/sign/send."""
import argparse
import gzip
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def compare(root, first, second, program):
    builder = load('build-rehearsal')
    if first.resolve() == second.resolve():
        raise ValueError('Two independent workspaces required')
    a, b = [builder.verify(root, p, program) for p in (first, second)]
    for field in ['sourceHashes', 'preparedHashes', 'releaseIdlSha256', 'builderSha256', 'toolHashes', 'binarySha256']:
        if not a.get(field) or a[field] != b.get(field):
            raise ValueError('Build correspondence mismatch: ' + field)
    left, right = [builder.public_read(p, 'program.so') for p in (first, second)]
    if left != right:
        raise ValueError('Build bytes differ')
    return a


def package(root, first, second, program):
    if subprocess.check_output(['git', 'status', '--porcelain'], cwd=root).strip():
        raise ValueError('Clean committed source required')
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    builder = load('build-rehearsal')
    verified = compare(root, first, second, program)
    files = {name: builder.public_read(first, name) for name in verified['preparedHashes']}
    files['program.so'] = builder.public_read(first, 'program.so')
    for name in ['metadata/robusto/CONTENT_APPROVAL.json', 'metadata/robusto/metadata.template.json',
                 'metadata/robusto/robusto-logo.png']:
        files[name] = builder.public_read(root, name)
    report = dict(scope='OFFLINE_FIXTURE_CANDIDATE_NOT_PRODUCTION', authorization=False,
                  mainnetStatus='NOT_AUTHORIZED_FOR_MAINNET', mainnetDisabled=True, head=head, programId=program,
                  binarySha256=verified['binarySha256'], toolHashes=verified['toolHashes'],
                  sourceHashes=verified['sourceHashes'], releaseIdlSha256=verified['releaseIdlSha256'],
                  reproducibility='Two fresh workspaces; bit-identical SBF; same installed toolchain',
                  limitations=['Adapted IDL, not freshly independently generated', 'No runtime/CPI validation',
                               'Not the release identity or a production RC', 'Metadata URI/publication pending'])
    files['offline-reproducibility.json'] = (json.dumps(report, sort_keys=True, indent=2)+'\n').encode()
    files['backup-manifest.json'] = (json.dumps(dict(scope=report['scope'], head=head, authorization=False,
        files={name:hashlib.sha256(value).hexdigest() for name,value in sorted(files.items())}), sort_keys=True, indent=2)+'\n').encode()
    public, scanner = load('check-public'), load('security-scan')
    for name, value in files.items():
        if public.sensitive_name(name) or scanner.suspect(value):
            raise ValueError('Public artifact gate rejected candidate')
    output = io.BytesIO()
    with gzip.GzipFile(fileobj=output, mode='wb', filename='', mtime=0) as zipped:
        with tarfile.open(fileobj=zipped, mode='w', format=tarfile.PAX_FORMAT) as archive:
            for name, value in sorted(files.items()):
                entry = tarfile.TarInfo(name)
                entry.size, entry.mode = len(value), 0o644
                archive.addfile(entry, io.BytesIO(value))
    # Revalidate mutable inputs before publishing the local package.
    if compare(root, first, second, program) != verified or any(builder.public_read(root,n)!=files[n]
            for n in files if n.startswith('metadata/')) or subprocess.check_output(['git','status','--porcelain'],cwd=root).strip() or subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()!=head:
        raise ValueError('Candidate changed during packaging')
    base = root / 'target/offline-fixture-candidates'
    if (root/'target').is_symlink() or base.is_symlink():
        raise ValueError('Unsafe output directory')
    base.mkdir(parents=True, exist_ok=True)
    destination = Path(tempfile.mkdtemp(prefix=head[:12]+'-', dir=base)) / 'robusto-offline-fixture.tar.gz'
    destination.write_bytes(output.getvalue())
    checksum = hashlib.sha256(output.getvalue()).hexdigest()
    destination.with_suffix('.sha256').write_text(f'{checksum}  {destination.name}\n')
    load('backup-public').verify_backup(destination)
    print(json.dumps(dict(archive=str(destination), sha256=checksum, **report), indent=2))
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--first', type=Path, required=True)
    parser.add_argument('--second', type=Path, required=True)
    parser.add_argument('--program-id', required=True)
    args = parser.parse_args()
    package(ROOT, args.first, args.second, args.program_id)


if __name__ == '__main__':
    main()
