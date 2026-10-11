#!/usr/bin/env python3
"""Deterministic public audit handoff; never signs, connects or certifies production."""
import argparse
import gzip
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile

ROOT=Path(__file__).resolve().parents[1]
OFFICIAL='target/meteora-official/damm-v2-a85c926607433f23f0ea60f4ca7b1ae92f4156cb/'
REPORT='target/robusto-10b9-integration-report.json'

def load(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/f'{name}.py')
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod

def sha(value):return hashlib.sha256(value).hexdigest()

def validate_report(report, head, sources):
    if (report.get('status')!='passed' or report.get('head')!=head or report.get('sourceHashes')!=sources or
        report.get('scope')!='OFFLINE_FIXTURE_ONLY' or report.get('authorization') is not False or
        report.get('mainnetDisabled') is not True or report.get('mainnetStatus')!='NOT_AUTHORIZED_FOR_MAINNET' or
        report.get('nativeAtomicityVerified') is not False or report.get('productionExecutionVerified') is not False or
        report.get('profile')!='PROPOSED_NOT_APPROVED_10B9_USDC6' or
        report.get('legacySuites')!={'baselineInstructions':24,'boundedSequences':8,'meteora':20,'meteoraLiquidity':13,'meteoraSwaps':12,'adversarialScenarios':15}):
        raise ValueError('Stale, incomplete or non-fixture runtime evidence')
    suites=report.get('suites',{})
    if set(suites)!={'supplyVesting','meteora9USDC6'} or any(suites[k].get('cases')!=n for k,n in [('supplyVesting',11),('meteora9USDC6',47)]):
        raise ValueError('Missing alternative suites')

def archive_bytes(data,head):
    public=load('check-public')
    if any(public.sensitive_name(n) or public.scan_bytes(b) for n,b in data.items()):
        raise ValueError('Sensitive public package input rejected')
    manifest=dict(schema=1,head=head,scope='OFFLINE_FIXTURE_ONLY',mainnetStatus='NOT_AUTHORIZED_FOR_MAINNET',
                  mainnetDisabled=True,authorization=False,independentlyAudited=False,
                  files={n:sha(b) for n,b in sorted(data.items())})
    content=dict(data)
    content['backup-manifest.json']=(json.dumps(manifest,indent=2,sort_keys=True)+'\n').encode()
    buffer=io.BytesIO()
    with gzip.GzipFile(fileobj=buffer,mode='wb',filename='',mtime=0) as zipped:
        with tarfile.open(fileobj=zipped,mode='w',format=tarfile.PAX_FORMAT) as archive:
            for name,value in sorted(content.items()):
                info=tarfile.TarInfo(name);info.mode=0o644;info.size=len(value)
                archive.addfile(info,io.BytesIO(value))
    return buffer.getvalue()

def package(root=ROOT):
    gate=load('check-unsigned-runtime');reader=load('build-rehearsal').public_read
    if subprocess.check_output(['git','status','--porcelain'],cwd=root).strip():raise ValueError('Clean HEAD required')
    head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
    sources=gate.inventory(root)
    report=json.loads(reader(root,REPORT));validate_report(report,head,sources)
    data={n:reader(root,n) for n in sources}
    artifacts=report['artifactHashes']
    fixed={'target/meteora-official/build/cp_amm.so':'a30610058262a5c87e1b22144ef6053ff2cd8bc9f97b7e978a51e28f8ec3ea3c',
           'target/robusto-final-public-programs/token.so':'8190d3f7ceb6cb7a7a8d8924bff89f9f611e15ce1f806f2b6237f3311a98f697',
           'target/robusto-final-public-programs/token2022.so':'0999dbf708971e723b08d1caafc988826a59c6001ed6dc02260da07defbe1469'}
    robusto={n:h for n,h in artifacts.items() if n.startswith('target/rehearsal-builds/') and n.endswith('/program.so')}
    if len(robusto)!=1 or next(iter(robusto.values()))!='e932987ffdb686dcffd3563ca2bbccdfcf51dc89debefb6d6cb046e5f5bf7ecb' or artifacts!=dict(fixed,**robusto):
        raise ValueError('Unreviewed ELF inventory')
    required=dict(artifacts)
    required.update({'target/debug/robusto-unsigned-runtime':report['binarySha256'],
                     'target/idl/popecoin_vesting.json':'bdd866c6853977ca05943b1961753850082eb91818a606d0dce117b78e0abb42',
                     'target/unsigned-runtime-report.json':report['baselineReportSha256'],
                     'target/unsigned-meteora-10b9-fixture.json':report['suites']['meteora9USDC6']['fixtureSha256'],
                     'target/robusto-10b9-fixture.json':report['suites']['supplyVesting']['fixtureSha256']})
    for n,h in required.items():
        value=reader(root,n)
        if sha(value)!=h:raise ValueError('Artifact differs from runtime evidence')
        # Host executable exceeds conservative archive member limit; bind its hash,
        # include buildable harness sources, never relax archive safety bounds.
        if n!='target/debug/robusto-unsigned-runtime':data[n]=value
    data[REPORT]=reader(root,REPORT)
    audit_name='target/meteora-official/upstream-audit.json'
    data[audit_name]=reader(root,audit_name)
    audit=json.loads(data[audit_name])
    if (audit.get('status')!='BLOCKED_FOR_PRODUCTION_REVIEW' or audit.get('exitCode')!=1 or
        audit.get('cargoLockSha256')!='b5ec7c2a5793afc7f8c46169b23cb370bd90f13a86e753beec7bc01f5c42e1d0' or
        len(audit.get('vulnerabilities',[]))!=3 or len(audit.get('warnings',[]))!=7):
        raise ValueError('Missing unchanged historical dependency findings')
    record_name='target/meteora-official/build-record.json'
    data[record_name]=reader(root,record_name)
    record=json.loads(data[record_name])
    if record['programCommit']!='a85c926607433f23f0ea60f4ca7b1ae92f4156cb' or record['cargoLockSha256']!='b5ec7c2a5793afc7f8c46169b23cb370bd90f13a86e753beec7bc01f5c42e1d0':raise ValueError('Unreviewed official source reference')
    for n,h in record['sourceHashes'].items():
        name=OFFICIAL+n;data[name]=reader(root,name)
        if sha(data[name])!=h:raise ValueError('Official source differs from build record')
    load('check-public').check(root)
    raw=archive_bytes(data,head)
    if raw!=archive_bytes(dict(reversed(list(data.items()))),head):raise ValueError('Nonreproducible package')
    # Detect changes while reading, before publishing the local handoff.
    if (gate.inventory(root)!=sources or subprocess.check_output(['git','status','--porcelain'],cwd=root).strip() or
        subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()!=head or
        any(reader(root,n)!=b for n,b in data.items()) or
        any(sha(reader(root,n))!=h for n,h in required.items())):raise ValueError('Inputs changed during packaging')
    out=root/'target'/f'robusto-external-audit-{head[:12]}.tar.gz'
    for path,value in [(out,raw),(out.with_suffix('.sha256'),f'{sha(raw)}  {out.name}\n'.encode())]:
        fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_TRUNC|os.O_NOFOLLOW,0o644)
        with os.fdopen(fd,'wb') as f:f.write(value)
    load('backup-public').verify_backup(out,sha(raw))
    print(json.dumps(dict(archive=str(out),sha256=sha(raw),head=head,files=len(data),independentlyAudited=False),indent=2))
    return out

if __name__=='__main__':
    argparse.ArgumentParser(description=__doc__).parse_args()
    package()
