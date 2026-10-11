#!/usr/bin/env python3
"""Clean-HEAD unsigned alternative evidence, including unchanged legacy runtime gate."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('baseline', ROOT/'scripts/check-unsigned-runtime.py')
baseline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)

def evaluate(stdout, code, markers):
    if code != 0 or any(stdout.count(m) != 1 for m in markers):
        raise ValueError('Incomplete alternative runtime evidence')

def check(elf):
    original = baseline.check(elf)
    env = dict(os.environ, CARGO_NET_OFFLINE='true', CARGO_TARGET_DIR=str(ROOT/'target'), NO_DNA='1')
    suites = {}
    for label, exporter, filename, mode, markers, count in [
        ('supplyVesting', 'robusto-10b9-alternative.ts', 'robusto-10b9-fixture.json', '--10b9-only', ['11 alternative 10B/9 cases passed'], 11),
        ('meteora9USDC6', 'robusto-meteora-10b9.ts', 'unsigned-meteora-10b9-fixture.json', '--meteora-10b9-usdc-only', ['20 Meteora cases passed', '13 Meteora liquidity cases passed', '12 Meteora swap cases passed', '2 alternative decimal mismatch SPL cases passed'], 47),
    ]:
        fixture = subprocess.check_output(['node','--require','ts-node/register',f'scripts/{exporter}'],cwd=ROOT,env=env)
        fd = os.open(ROOT/'target'/filename, os.O_WRONLY|os.O_CREAT|os.O_TRUNC|os.O_NOFOLLOW, 0o644)
        with os.fdopen(fd,'wb') as f: f.write(fixture)
        run = subprocess.run(['cargo','run','--offline','--locked','--manifest-path','tools/unsigned-runtime/Cargo.toml','--',str(ROOT),str(Path(elf).absolute()),mode],cwd=ROOT,env=env,text=True,capture_output=True)
        evaluate(run.stdout,run.returncode,markers)
        suites[label] = dict(cases=count,fixtureSha256=baseline.sha(fixture),stdoutSha256=baseline.sha(run.stdout.encode()))
    custody = subprocess.run(['cargo','run','--offline','--locked','--manifest-path','tools/unsigned-runtime/Cargo.toml','--',str(ROOT),str(Path(elf).absolute()),'--vesting-custody-only'],cwd=ROOT,env=env,text=True,capture_output=True)
    evaluate(custody.stdout,custody.returncode,['7 vesting custody SBF cases passed'])
    prototype = subprocess.run(['cargo','test','--offline','--locked','--manifest-path','tools/vesting-surplus-prototype/Cargo.toml'],cwd=ROOT,env=env,text=True,capture_output=True)
    evaluate(prototype.stdout,prototype.returncode,['test result: ok. 10 passed;'])
    if baseline.inventory(ROOT) != original['sourceHashes'] or subprocess.check_output(['git','status','--porcelain'],cwd=ROOT).strip():
        raise ValueError('Source changed during alternative verification')
    if subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()!=original['head']:
        raise ValueError('HEAD changed during alternative verification')
    if any(baseline.sha(baseline.load('build-rehearsal').public_read(ROOT,p)) != h for p,h in original['artifactHashes'].items()):
        raise ValueError('Artifact changed during verification')
    report = dict(original, surplusPrototype=dict(level='HOST_MODEL_ONLY_NOT_SBF',tests=10,stdoutSha256=baseline.sha(prototype.stdout.encode())), custodyCases=7, custodyStdoutSha256=baseline.sha(custody.stdout.encode()), suites=suites, legacySuites=original['suites'], status='passed', profile='PROPOSED_NOT_APPROVED_10B9_USDC6', baselineReportSha256=baseline.sha((ROOT/'target/unsigned-runtime-report.json').read_bytes()))
    return report

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fixture-elf',required=True)
    args=parser.parse_args()
    output=ROOT/'target/robusto-10b9-integration-report.json'
    # Invalidate stale success before any validation; never follow output symlinks.
    def save(report):
        if output.parent.is_symlink(): raise ValueError('Unsafe output directory')
        fd=os.open(output,os.O_WRONLY|os.O_CREAT|os.O_TRUNC|os.O_NOFOLLOW,0o644)
        with os.fdopen(fd,'w') as f: json.dump(report,f,indent=2,sort_keys=True);f.write('\n')
    save(dict(status='FAILED_INCOMPLETE_EVIDENCE',scope='OFFLINE_FIXTURE_ONLY',authorization=False))
    report=check(args.fixture_elf)
    save(report)
    print(json.dumps(dict(head=report['head'],status=report['status'],suites=report['suites'],custodyCases=report['custodyCases'],reportSha256=hashlib.sha256(output.read_bytes()).hexdigest()),indent=2))
