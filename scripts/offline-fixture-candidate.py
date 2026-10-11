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


RUNTIME_ELFS={
    'target/meteora-official/build/cp_amm.so':'a30610058262a5c87e1b22144ef6053ff2cd8bc9f97b7e978a51e28f8ec3ea3c',
    'target/robusto-final-public-programs/token.so':'8190d3f7ceb6cb7a7a8d8924bff89f9f611e15ce1f806f2b6237f3311a98f697',
    'target/robusto-final-public-programs/token2022.so':'0999dbf708971e723b08d1caafc988826a59c6001ed6dc02260da07defbe1469'}

def runtime_sources(root):
    return load('check-unsigned-runtime').inventory(root)


def runtime_evidence(root, head, binary_sha):
    builder=load('build-rehearsal')
    raw=builder.public_read(root,'target/unsigned-runtime-report.json')
    report=json.loads(raw,object_pairs_hook=load('backup-public').unique_object)
    if (report.get('scope')!='OFFLINE_FIXTURE_ONLY' or report.get('status')!='passed' or
        report.get('head')!=head or report.get('authorization') is not False or
        report.get('mainnetDisabled') is not True or report.get('mainnetStatus')!='NOT_AUTHORIZED_FOR_MAINNET' or report.get('nativeAtomicityVerified') is not False or
        report.get('productionExecutionVerified') is not False or report.get('sourceHashes')!=runtime_sources(root)):
        raise ValueError('Runtime report must bind exact clean offline candidate')
    artifacts=report.get('artifactHashes')
    if not isinstance(artifacts,dict) or len(artifacts)!=4 or binary_sha not in artifacts.values():
        raise ValueError('Runtime artifacts missing fixture ELF')
    fixtures=[p for p in artifacts if p.startswith('target/rehearsal-builds/') and p.endswith('/program.so')]
    if len(fixtures)!=1 or artifacts!={**RUNTIME_ELFS,fixtures[0]:binary_sha}:
        raise ValueError('Runtime artifacts differ from pinned execution profile')
    gate=load('check-unsigned-runtime')
    gate.evaluate('\n'.join(gate.MARKERS+['RUNTIME_EVIDENCE '+json.dumps(r) for r in report.get('receipts',[])]),0)
    if report.get('suites')!={'baselineInstructions':24,'boundedSequences':8,'meteora':20,'meteoraLiquidity':13,'meteoraSwaps':12,'adversarialScenarios':15}:
        raise ValueError('Incomplete runtime suites')
    if hashlib.sha256(builder.public_read(root,'target/debug/robusto-unsigned-runtime')).hexdigest()!=report.get('binarySha256'):
        raise ValueError('Runtime harness binary changed')
    fixture=builder.public_read(root,'target/unsigned-meteora-fixture.json')
    if hashlib.sha256(fixture).hexdigest()!=report.get('fixtureSha256'):
        raise ValueError('Runtime fixture changed')
    files={'runtime-evidence.json':raw,'runtime-meteora-fixture.json':fixture}
    for name,value in artifacts.items():
        content=builder.public_read(root,name)
        if hashlib.sha256(content).hexdigest()!=value:
            raise ValueError('Runtime artifact changed')
        files[name]=content
    for name in report['sourceHashes']:
        if name.startswith('tools/unsigned-runtime/'):
            files[name]=builder.public_read(root,name)
    return files


def package(root, first, second, program, include_runtime=False):
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
    runtime = runtime_evidence(root,head,verified['binarySha256']) if include_runtime else {}
    files.update(runtime)
    report = dict(scope='OFFLINE_FIXTURE_ONLY', candidateClass='OFFLINE_FIXTURE_CANDIDATE_NOT_PRODUCTION', authorization=False,
                  mainnetStatus='NOT_AUTHORIZED_FOR_MAINNET', mainnetDisabled=True, head=head, programId=program,
                  binarySha256=verified['binarySha256'], toolHashes=verified['toolHashes'],
                  sourceHashes=verified['sourceHashes'], releaseIdlSha256=verified['releaseIdlSha256'],
                  reproducibility='Two fresh workspaces; bit-identical SBF; same installed toolchain',
                  limitations=['Adapted IDL, not freshly independently generated', 'No runtime/CPI validation',
                               'Not the release identity or a production RC', 'Metadata URI/publication pending'])
    if runtime:
        report['runtimeEvidenceSha256']=hashlib.sha256(runtime['runtime-evidence.json']).hexdigest()
        report['limitations'].remove('No runtime/CPI validation')
        report['limitations']+=['Runtime evidence is local and self-reported; no native transaction atomicity', 'Requires exact Git checkout and installed dependencies/tools; not a self-contained environment']
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
    if runtime and runtime_evidence(root,head,verified['binarySha256'])!=runtime:
        raise ValueError('Runtime evidence changed during packaging')
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
    parser.add_argument('--with-runtime-evidence', action='store_true')
    args = parser.parse_args()
    package(ROOT, args.first, args.second, args.program_id, args.with_runtime_evidence)


if __name__ == '__main__':
    main()
