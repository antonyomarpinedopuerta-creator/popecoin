#!/usr/bin/env python3
"""Compare independently supplied successful RC reports against this checkout."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

spec = importlib.util.spec_from_file_location('rc', Path(__file__).with_name('check-rc.py'))
rc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rc)


def compare(reports, head, sources):
    if len(reports) != 2:
        raise ValueError('Exactly two runner reports are required')
    expected = [{'command': command, 'exitCode': 0} for command in rc.COMMANDS]
    for report in reports:
        if report.get('schemaVersion') != 1 or report.get('status') != 'passed' or report.get('dirty') is not False or report.get('head') != head:
            raise ValueError('Report did not validate this clean HEAD')
        if report.get('sourceHashes') != sources or report.get('checks') != expected or set(report.get('artifacts', {})) != set(rc.ARTIFACTS):
            raise ValueError('Incomplete or mismatched source/check/artifact inventory')
    if reports[0]['artifacts'] != reports[1]['artifacts']:
        raise ValueError('Independent runner artifacts differ')
    return {'status': 'passed', 'head': head, 'sourceHashes': sources, 'artifactHashes': reports[0]['artifacts'],
            'scope': 'Two CI runner reports agree; not an independent security audit'}


if __name__ == '__main__':
    root = Path(__file__).resolve().parent.parent
    output = root / 'target/ci-comparison.json'
    output.parent.mkdir(exist_ok=True)
    output.write_text('{"status":"incomplete"}\n')
    result = compare([json.loads(Path(path).read_text()) for path in sys.argv[1:]],
                     subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(), rc.source_hashes(root))
    output.write_text(json.dumps(result, indent=2) + '\n')
    print('PASS: both runner source inventories and all six artifact hashes match')
