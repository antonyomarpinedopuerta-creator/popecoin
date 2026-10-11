#!/usr/bin/env python3
"""Clean-HEAD, offline unsigned execution evidence. Never build SBF, sign, or use RPC."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]
MARKERS=['24 unsigned instruction-runtime cases passed','8 bounded atomicity cases passed',
         '20 Meteora cases passed','15 ROBUSTO adversarial SBF cases passed']

def sha(value): return hashlib.sha256(value).hexdigest()
def evaluate(stdout,returncode):
    if returncode or any(stdout.count(marker)!=1 for marker in MARKERS):
        raise ValueError('Runtime failed or incomplete suite evidence')
    records=[json.loads(line[len('RUNTIME_EVIDENCE '):]) for line in stdout.splitlines() if line.startswith('RUNTIME_EVIDENCE ')]
    if len(records)!=5 or [r.get('status') for r in records]!=['COMPLETE','FAILED','FAILED','INTERRUPTED','FAILED']:
        raise ValueError('Incomplete runtime receipts')
    for r in records:
        if (type(r.get('schemaVersion')) is not int or r.get('schemaVersion')!=1 or r.get('scope')!='OFFLINE_FIXTURE_ONLY' or r.get('authorization') is not False or
            r.get('nativeAtomicityVerified') is not False or r.get('mainnetDisabled') is not True or
            r.get('retryAllowed') is not False or r.get('syntheticSignerPermissions') is not True):
            raise ValueError('Non-fixture runtime receipt')
        for name in ['messageSha256','beforeSha256','committedSha256','stagedSha256']:
            value=r.get(name)
            if not isinstance(value,str) or len(value)!=64 or any(c not in '0123456789abcdef' for c in value):
                raise ValueError('Invalid runtime digest')
        for name in ['plannedInstructions','executedInstructions','computeUnits']:
            if type(r.get(name)) is not int or r[name]<0:
                raise ValueError('Invalid runtime counts')
        if r['executedInstructions']>r['plannedInstructions']:
            raise ValueError('Invalid runtime counts')
        if r['status']=='COMPLETE':
            if r['executedInstructions']!=r['plannedInstructions'] or r['committedSha256']!=r['stagedSha256']:
                raise ValueError('Incomplete runtime completion')
        elif r['committedSha256']!=r['beforeSha256']:
            raise ValueError('Failed or interrupted fixture committed effects')
    return records

def load(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/f'{name}.py')
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result

def inventory(root):
    public=load('check-public')
    names=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0')
    result={}
    for name in filter(None,names):
        if public.sensitive_name(name): raise ValueError('Sensitive tracked input')
        result[name]=sha(load('build-rehearsal').public_read(root,name))
    return result

def check(program_path):
    root=ROOT
    # Only read the explicit public ELF and tracked public sources. No target/private traversal.
    builder=load('build-rehearsal')
    path=Path(program_path).absolute()
    relative=path.relative_to(root).as_posix()
    if not relative.startswith('target/rehearsal-builds/') or path.name!='program.so':
        raise ValueError('Explicit public fixture ELF required')
    artifacts={relative:'e932987ffdb686dcffd3563ca2bbccdfcf51dc89debefb6d6cb046e5f5bf7ecb',
        'target/meteora-official/build/cp_amm.so':'a30610058262a5c87e1b22144ef6053ff2cd8bc9f97b7e978a51e28f8ec3ea3c',
        'target/robusto-final-public-programs/token.so':'8190d3f7ceb6cb7a7a8d8924bff89f9f611e15ce1f806f2b6237f3311a98f697',
        'target/robusto-final-public-programs/token2022.so':'0999dbf708971e723b08d1caafc988826a59c6001ed6dc02260da07defbe1469'}
    if any(sha(builder.public_read(root,p))!=h for p,h in artifacts.items()):
        raise ValueError('Unexpected fixture ELF')
    if subprocess.check_output(['git','status','--porcelain'],cwd=root).strip():
        raise ValueError('Clean committed sources required')
    head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
    sources=inventory(root)
    env=dict(os.environ,CARGO_NET_OFFLINE='true',CARGO_TARGET_DIR=str(root/'target'),NO_DNA='1')
    tree=subprocess.check_output(['cargo','tree','--offline','--locked','--manifest-path','tools/unsigned-runtime/Cargo.toml','-e','normal','--prefix','none'],cwd=root,env=env,text=True)
    if any(x in tree for x in ['solana-keypair','litesvm']): raise ValueError('Forbidden identity-generating runtime dependency')
    fixture=subprocess.check_output(['node','--require','ts-node/register','scripts/prepare-unsigned-runtime-fixture.ts'],cwd=root,env=env)
    target=root/'target'
    if target.is_symlink():raise ValueError('Unsafe output directory')
    fd=os.open(target/'unsigned-meteora-fixture.json',os.O_WRONLY|os.O_CREAT|os.O_TRUNC|os.O_NOFOLLOW,0o644)
    with os.fdopen(fd,'wb') as output:output.write(fixture)
    run=subprocess.run(['cargo','run','--offline','--locked','--manifest-path','tools/unsigned-runtime/Cargo.toml','--',str(root),str(path)],cwd=root,env=env,text=True,capture_output=True,check=False)
    records=evaluate(run.stdout,run.returncode)
    if (inventory(root)!=sources or subprocess.check_output(['git','status','--porcelain'],cwd=root).strip() or
        subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()!=head):
        raise ValueError('Source changed during runtime verification')
    if any(sha(builder.public_read(root,p))!=h for p,h in artifacts.items()):
        raise ValueError('ELF changed during runtime verification')
    report=dict(scope='OFFLINE_FIXTURE_ONLY',authorization=False,mainnetStatus='NOT_AUTHORIZED_FOR_MAINNET',
        mainnetDisabled=True,status='passed',head=head,sourceHashes=sources,artifactHashes=artifacts,receipts=records,
        fixtureSha256=sha(fixture),binarySha256=sha(builder.public_read(root,'target/debug/robusto-unsigned-runtime')),
        dependencyTreeSha256=sha(tree.encode()),stdoutSha256=sha(run.stdout.encode()),
        suites={'baselineInstructions':24,'boundedSequences':8,'meteora':20,'adversarialScenarios':15},
        nativeAtomicityVerified=False,productionExecutionVerified=False,
        limitations=['Explicit fixture discard is not Bank transaction rollback','No signatures, network confirmation, fees or production authorization','Local source/binary hashes are not independent attestations'])
    output=target/'unsigned-runtime-report.json'
    save_report(report)
    print(json.dumps({'head':head,'status':'passed','report':str(output),'sha256':sha(output.read_bytes()),'suites':report['suites']},indent=2))
    return report

def save_report(report):
    target=ROOT/'target'
    if target.is_symlink() or not target.is_dir():raise ValueError('Unsafe report directory')
    with tempfile.NamedTemporaryFile(mode='w',prefix='unsigned-runtime-',suffix='.pending',dir=target,delete=False) as f:
        json.dump(report,f,indent=2,sort_keys=True);f.write('\n');temporary=Path(f.name)
    os.replace(temporary,target/'unsigned-runtime-report.json')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--fixture-elf',required=True)
    args=parser.parse_args()
    try:check(args.fixture_elf)
    except Exception:
        save_report({'scope':'OFFLINE_FIXTURE_ONLY','authorization':False,'status':'FAILED_INCOMPLETE_EVIDENCE'})
        raise
