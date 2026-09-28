#!/usr/bin/env python3
"""Verify a clean Git export with a new Yarn cache and no inherited build outputs."""
from pathlib import Path
import importlib.util
import json
import os
import subprocess
import tarfile
import tempfile


def load(filename):
    spec = importlib.util.spec_from_file_location(filename.replace('-', '_'), Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    root = Path(__file__).resolve().parent.parent
    report = root / 'target/clean-check.json'
    report.parent.mkdir(parents=True, exist_ok=True)
    evidence = {'status': 'incomplete', 'scope': 'Public Git export, empty Yarn cache/node_modules/build caches; shared installed toolchains and Cargo registry cache'}

    def save():
        temporary = report.with_suffix('.tmp')
        temporary.write_text(json.dumps(evidence, indent=2) + '\n')
        temporary.replace(report)

    save()
    try:
        if subprocess.check_output(['git', 'status', '--porcelain'], cwd=root):
            raise ValueError('Commit the candidate before the clean export check')
        head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
        evidence['head'] = head
        load('check-public.py').check(root)
        source_hashes = load('check-rc.py').source_hashes(root)
        workspace = Path(tempfile.mkdtemp(prefix='clean-check-', dir=root / 'target'))
        source = workspace / 'source'
        source.mkdir()
        archive = workspace / 'public-source.tar'
        evidence['workspace'] = str(workspace)
        save()
        subprocess.run(['git', 'archive', '--format=tar', '-o', str(archive), head], cwd=root, check=True)
        with tarfile.open(archive) as stream:
            stream.extractall(source, filter='data')
        if (source / 'node_modules').exists() or (source / 'target').exists():
            raise ValueError('Git export unexpectedly contains dependencies or build outputs')
        if load('check-rc.py').source_hashes(source) != source_hashes:
            raise ValueError('Git export differs from candidate public inputs')
        # Only the exported public tree is committed, not the original Git database.
        commands = [
            ['git', 'init', '--quiet', '--template='],
            ['git', 'add', '.'],
            ['git', '-c', 'user.name=PAPA clean verification', '-c', 'user.email=verification@invalid',
             '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '--no-gpg-sign', '-m', 'Public source verification fixture'],
            ['yarn', 'install', '--frozen-lockfile', '--ignore-scripts', '--production=false', '--cache-folder', str(workspace / 'yarn-cache')],
            ['npm', 'run', 'check:rc'],
        ]
        env = dict(os.environ, NO_DNA='1', CARGO_TARGET_DIR=str(source / 'target'))
        for name in ['NODE_PATH', 'NODE_OPTIONS', 'TS_NODE_PROJECT', 'ANCHOR_WALLET', 'ANCHOR_PROVIDER_URL']:
            env.pop(name, None)
        for role in ['PAYER', 'DEVELOPMENT', 'FOUNDER', 'RESERVE']:
            env.pop(f'PAPA_DEVNET_{role}_KEYPAIR', None)
        for command in commands:
            subprocess.run(command, cwd=source, env=env, check=True)
        clean = json.loads((source / 'target/rc-check.json').read_text())
        if clean['status'] != 'passed' or clean['dirty'] or clean['sourceHashes'] != source_hashes:
            raise ValueError('Clean export RC did not validate the exact public sources')
        repro = load('reproduce-release.py')
        expected = repro.hashes(root, repro.OUTPUTS)
        repro.compare(expected, repro.hashes(source, repro.OUTPUTS))
        devnet = ['target/devnet-workspace/target/deploy/popecoin_vesting.so', 'target/devnet-workspace/build-record.json']
        if repro.hashes(root, devnet) != repro.hashes(source, devnet):
            raise ValueError('Clean export Devnet binary differs')
        if subprocess.check_output(['git', 'status', '--porcelain'], cwd=root) or subprocess.check_output(
                ['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip() != head or load('check-rc.py').source_hashes(root) != source_hashes:
            raise ValueError('Candidate changed during clean verification')
        evidence.update(status='passed', sourceHashes=source_hashes, outputHashes=expected,
                        devnetHashes=repro.hashes(source, devnet), toolVersions=clean['toolVersions'])
        save()
        print(f'PASS: clean Git export rebuilt/tested both identities and reproduced current artifacts; {report.relative_to(root)}')
    except BaseException:
        evidence['status'] = 'failed'
        save()
        raise


if __name__ == '__main__':
    main()
