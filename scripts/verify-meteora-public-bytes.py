#!/usr/bin/env python3
"""Verify saved PUBLIC RPC responses offline. No network or transaction support."""
import argparse
import base64
import hashlib
import json
from pathlib import Path

PROGRAM = 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG'
LOADER = 'BPFLoaderUpgradeab1e11111111111111111111111'
EXPECTED_BINARY = 'a30610058262a5c87e1b22144ef6053ff2cd8bc9f97b7e978a51e28f8ec3ea3c'

def b58(value):
    alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    n, result = int.from_bytes(value, 'big'), ''
    while n:
        result = alphabet[n % 58] + result
        n //= 58
    return '1' * (len(value) - len(value.lstrip(b'\0'))) + result

def account(response):
    if response.get('error') or not response.get('result', {}).get('value'):
        raise ValueError('RPC response missing public account')
    result = response['result']
    value = result['value']
    if value['owner'] != LOADER or value['data'][1] != 'base64':
        raise ValueError('Unexpected public loader/encoding')
    return value, base64.b64decode(value['data'][0], validate=True), result['context']['slot']

def verify(program_response, data_response, data_address, binary):
    if hashlib.sha256(binary).hexdigest() != EXPECTED_BINARY:
        raise ValueError('Expected reproduced Meteora artifact required')
    program, p, program_slot = account(program_response)
    data, d, data_slot = account(data_response)
    if not program['executable'] or data['executable'] or len(p) != 36 or int.from_bytes(p[:4], 'little') != 2:
        raise ValueError('Invalid loader Program account')
    if b58(p[4:36]) != data_address:
        raise ValueError('ProgramData address does not match Program account')
    if len(d) < 45 or int.from_bytes(d[:4], 'little') != 3 or d[12] not in [0, 1]:
        raise ValueError('Invalid loader ProgramData account')
    code = d[45:]
    matches = len(code) >= len(binary) and code[:len(binary)] == binary and not any(code[len(binary):])
    return {'status': 'VERIFIED_BYTE_MATCH_AT_OBSERVED_SLOTS' if matches else 'NOT_VERIFIED',
            'program': PROGRAM, 'programData': data_address,
            'programObservationSlot': program_slot, 'programDataObservationSlot': data_slot,
            'lastDeploymentSlot': int.from_bytes(d[4:12], 'little'),
            'upgradeAuthorityPresent': bool(d[12]),
            'artifactSha256': EXPECTED_BINARY, 'artifactBytes': len(binary),
            'programDataCodeAndPaddingSha256': hashlib.sha256(code).hexdigest(),
            'programDataCodeAndPaddingBytes': len(code), 'exactPrefixAndZeroPaddingMatch': matches,
            'limits': 'Saved RPC responses supplied by operator; no independent RPC quorum, no atomic snapshot, no guarantee after upgrades. No transaction support.'}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--program-account', required=True)
    parser.add_argument('--program-data', required=True)
    parser.add_argument('--program-data-address', required=True)
    parser.add_argument('--binary', required=True)
    args = parser.parse_args()
    result = verify(json.loads(Path(args.program_account).read_text()), json.loads(Path(args.program_data).read_text()),
                    args.program_data_address, Path(args.binary).read_bytes())
    print(json.dumps(result, indent=2))
    return 0 if result['exactPrefixAndZeroPaddingMatch'] else 1

if __name__ == '__main__':
    raise SystemExit(main())
