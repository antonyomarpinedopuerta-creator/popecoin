#!/usr/bin/env python3
"""Public reads only. Fail closed on an upstream source or production binary change."""
from pathlib import Path
import base64
import datetime
import hashlib
import importlib.util
import json
import os
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
COMMIT = 'a85c926607433f23f0ea60f4ca7b1ae92f4156cb'
PROGRAM = 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG'
DATA = 'AUh8bm2XsMfex3KjYGcM3G4uBqUNSDw6HEhWaWMYnyPH'
SPL = {'token': 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
       'token2022': 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
       'ata': 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'}
READ_ADDRESSES = {PROGRAM, DATA, *SPL.values()}
READ_ONLY_OPT_IN = 'READ_ONLY:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'

def require_read_only_authorization():
    if os.environ.get('ROBUSTO_MAINNET_READ_ONLY') != READ_ONLY_OPT_IN:
        raise ValueError('MAINNET_DISABLED: explicit future public read-only authorization required')

def request(url, payload=None):
    allowed = ['https://api.github.com/repos/MeteoraAg/damm-v2/commits/main',
               'https://api.mainnet-beta.solana.com', 'https://api.devnet.solana.com']
    if url not in allowed:
        raise ValueError('Non-allowlisted read endpoint')
    if payload and (payload['method'] != 'getAccountInfo' or payload['params'][0] not in READ_ADDRESSES):
        raise ValueError('Only public Meteora account reads are permitted')
    require_read_only_authorization()
    req = urllib.request.Request(url, data=json.dumps(payload).encode() if payload else None,
                                 headers={'Content-Type': 'application/json', 'User-Agent': 'ROBUSTO-readonly-review'})
    with urllib.request.urlopen(req, timeout=30) as response:
        if response.url != url:
            raise ValueError('RPC redirect rejected')
        return json.loads(response.read(5_000_000))

def load_verifier():
    spec = importlib.util.spec_from_file_location('verify_public', ROOT / 'scripts/verify-meteora-public-bytes.py')
    verifier = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(verifier)
    return verifier

def main():
    # Reject accidental execution before network access or replacing prior evidence.
    require_read_only_authorization()
    destination = ROOT / 'target/robusto-final-preflight.json'
    destination.write_text(json.dumps({'status': 'INCOMPLETE'}) + '\n')
    head = request('https://api.github.com/repos/MeteoraAg/damm-v2/commits/main')['sha']
    if head != COMMIT:
        raise ValueError('STOP: official source changed; reassess advisories before execution')
    verifier = load_verifier()
    binary = (ROOT / 'target/meteora-official/build/cp_amm.so').read_bytes()
    observations = {}
    for cluster in ['mainnet-beta', 'devnet']:
        endpoint = f'https://api.{cluster}.solana.com'
        def read(address):
            return request(endpoint, {'jsonrpc': '2.0', 'id': 1, 'method': 'getAccountInfo',
                                      'params': [address, {'encoding': 'base64', 'commitment': 'finalized'}]})
        p, d = read(PROGRAM), read(DATA)
        observations[cluster] = verifier.verify(p, d, DATA, binary)
        if cluster == 'mainnet-beta' and not observations[cluster]['exactPrefixAndZeroPaddingMatch']:
            raise ValueError('STOP: public production binary changed; reassess advisories before execution')
    record = json.loads((ROOT / 'target/meteora-official/build-record.json').read_text())
    source = ROOT / 'target/meteora-official' / ('damm-v2-' + COMMIT)
    for name, expected in record['sourceHashes'].items():
        if hashlib.sha256((source / name).read_bytes()).hexdigest() != expected:
            raise ValueError('STOP: reviewed source input changed')
    spl = {}
    binary_dir = ROOT / 'target/robusto-final-public-programs'
    binary_dir.mkdir(parents=True, exist_ok=True)
    for name, address in SPL.items():
        def read_mainnet(public_address):
            return request('https://api.mainnet-beta.solana.com', {'jsonrpc': '2.0', 'id': 1, 'method': 'getAccountInfo',
                           'params': [public_address, {'encoding': 'base64', 'commitment': 'finalized'}]})
        response = read_mainnet(address)
        value = response['result']['value']
        if not value or not value['executable'] or value['data'][1] != 'base64':
            raise ValueError('Public SPL executable not found')
        code = base64.b64decode(value['data'][0], validate=True)
        data_address = None
        if value['owner'] == verifier.LOADER:
            if len(code) != 36 or int.from_bytes(code[:4], 'little') != 2:
                raise ValueError('Invalid SPL loader Program state')
            data_address = verifier.b58(code[4:36])
            READ_ADDRESSES.add(data_address)  # Only an address derived from a validated public loader account.
            response = read_mainnet(data_address)
            data = response['result']['value']
            if not data or data['owner'] != verifier.LOADER or data['executable'] or data['data'][1] != 'base64':
                raise ValueError('Invalid SPL ProgramData owner/state')
            raw = base64.b64decode(data['data'][0], validate=True)
            if len(raw) < 45 or int.from_bytes(raw[:4], 'little') != 3:
                raise ValueError('Invalid SPL ProgramData discriminator')
            code = raw[45:]  # Preserve all bytes/padding; never truncate ELF section headers.
        elif value['owner'] != 'BPFLoader2111111111111111111111111111111111':
            raise ValueError('Unsupported public SPL loader')
        if not code.startswith(b'\x7fELF'):
            raise ValueError('Public SPL bytecode is not ELF')
        binary_destination = binary_dir / (name + '.so')
        binary_destination.write_bytes(code)
        spl[name] = {'program': address, 'programData': data_address, 'source': 'OFFICIAL_PUBLIC_SOLANA_RPC_READONLY',
                     'observedSlot': response['result']['context']['slot'], 'bytes': len(code),
                     'sha256': hashlib.sha256(code).hexdigest(), 'path': binary_destination.relative_to(ROOT).as_posix(),
                     'limitation': 'Deployed public bytecode snapshot; not an independent SPL source reproducible-build attestation'}
    report = {'status': 'PASSED_READONLY_PREFLIGHT', 'checkedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'sourceCommit': head, 'binarySha256': hashlib.sha256(binary).hexdigest(),
              'verifiedSourceInputs': len(record['sourceHashes']), 'observations': observations, 'publicSplPrograms': spl,
              'selectedEnvironment': 'localnet', 'publicTransactions': 0,
              'reason': 'Exact reviewed production bytecode in isolated validator; deterministic adversarial states. Devnet has a different unreviewed binary.' if not observations['devnet']['exactPrefixAndZeroPaddingMatch'] else 'Exact production bytecode and deterministic adversarial states without public transactions.',
              'limitations': 'Single public RPC provider per cluster, non-atomic reads, upgradeable programs. No economic or Mainnet authorization.'}
    destination.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
