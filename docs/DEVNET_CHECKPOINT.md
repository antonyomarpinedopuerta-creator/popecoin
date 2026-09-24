# PAPA Devnet Checkpoint

This document records the verified Devnet state of the PAPA project before moving to Mainnet preparation.

## Repository

- Checkpoint commit: `0923248488d11bd78d86b191f96022f2355d76a2`
- Branch: `master`
- Repository was clean and synchronized with `origin/master` at checkpoint time.

## Token

- Network: Solana Devnet
- Mint: `ANNSmx2Jww4HUukAvxBRSZeTqzcuqPQTiewSjxx7tgnw`
- Token program: Classic SPL Token (`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`)
- Decimals: 6
- Total supply: 10,000,000 PAPA
- Raw supply: 10,000,000,000,000 base units
- Freeze authority: not set
- Mint authority remains active intentionally during development.

## Distribution Reconciliation

The complete Devnet supply was reconciled across token accounts:

- Liquidity: 4,000,000 PAPA
- Reserve vesting vault: 3,000,000 PAPA
- Community/Airdrops: 1,500,000 PAPA
- Founder vesting vault: 1,000,000 PAPA
- Development/Operations: 500,000 PAPA

Total: 10,000,000 PAPA.

No additional minting is planned for this Devnet token.

## Vesting Program

- Program ID: `BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`
- ProgramData: `BgN29LQE57gAB7UVTRUkczfQYnvXXFd37bsB8yCJqC6U`
- Upgrade authority: `8X8ZV5J2W1agj7vm4UAJGCg4fZDYThGBwhSRFEzm8bwn`
- Upgrade authority remains active intentionally during development.
- Last verified deployed slot: `499370833`
- Deployed data length: 243296 bytes

### Deployment Safety Warning

The generated local program keypair under `target/deploy` resolves to:

`Ei7LusW1YjHJdR2vPEWdaTobrEwQCJQ8Tff9XGnXBWSF`

This does NOT match the existing Devnet program ID.

Do not run a normal `anchor deploy` blindly. Any future deployment or upgrade must explicitly target the intended program ID and follow a reviewed procedure.

## Reserve Vesting

- Beneficiary: `HnXgMRPyukmJCXRoi5vF9YZNuBmbuTa2csiVmKYTfRHa`
- Vesting PDA: `A8CgDf97V7bdYNHUaiFSZ7w1ELa2ByUovkoKs6jihtUR`
- Vault: `J75cXVBhuH2dekefy27ohEbgTt1bCbyDaSYo7fWVxVjZ`
- Total amount: 3,000,000 PAPA
- Released amount at checkpoint: 0
- Vault balance at checkpoint: 3,000,000 PAPA

## Founder Vesting

- Beneficiary: `DuvtonEx95RYtTXiUUaUpz1t4PuRHRDGAVB6wD29EfT3`
- Vesting PDA: `FmCMr7rHrz8Uybxe6TSLqiFdKpjCkbw1nbSCXEtxKdfG`
- Vault: `9Sae8FryLamWuxPuBPy9MHq3mwhauD6FA5Q1ZCUjWCB8`
- Total amount: 1,000,000 PAPA
- Released amount at checkpoint: 0
- Vault balance at checkpoint: 1,000,000 PAPA

## Metadata

Verified on-chain metadata:

- Name: PAPA
- Symbol: PAPA
- Mutable: true
- URI: `https://raw.githubusercontent.com/antonyomarpinedopuerta-creator/popecoin/master/metadata/metadata.json`

The public metadata JSON and PNG image returned successfully during verification.

GitHub-hosted metadata is acceptable for Devnet testing but is not the intended durable storage strategy for Mainnet.

## Tests

The project passed the safe local validation workflow:

- Anchor safe build succeeded.
- Rust integration tests: 17/17 passed.
- Program-load test: 1/1 passed.
- Vesting tests: 5/5 passed.
- Total: 23/23 tests passed.
- TypeScript type checking passed.

## Deployed Binary Correspondence

The executable program deployed on Devnet has been matched to the historical reviewed source at Git commit `990cd9ed0126c81e178a7156ce1bf416c412d28b`.

A direct `cargo build-sbf` reconstruction of that commit produced:

- Executable size: 233,096 bytes.
- SHA-256: `d0b317c25e76a31f323dc772358ba8ba0e5a6511bd9fdec22148b2cc6bbed47d`.

The program dumped from Devnet has a total account data length of 243,296 bytes. Byte comparison established that:

- its first 233,096 bytes are identical byte-for-byte to the reconstructed executable;
- the remaining 10,200 bytes are zero padding;
- hashing the first 233,096 bytes of the Devnet dump produces the same SHA-256: `d0b317c25e76a31f323dc772358ba8ba0e5a6511bd9fdec22148b2cc6bbed47d`.

Both binaries also contain the historical `POPE` log strings. Later `POPE` to `PAPA` log-string changes were not deployed.

This establishes correspondence between the executable deployed on Devnet and the reconstructed executable from commit `990cd9e`. It does not mean the current source tree is byte-identical to the deployed version because subsequent branding-only source changes exist.

No deployment should be performed merely to change branding/log strings.

## Mainnet Status

This checkpoint closes the verified Devnet testing state only.

It does NOT mean the project is ready for Mainnet or public DEX launch.

Mainnet preparation still requires, among other items:

- secure production key management;
- final reviewed build and deployment procedure;
- independent security review;
- durable metadata storage;
- explicit production vesting timestamps;
- authority and multisig decisions;
- legal/tax/disclosure review;
- liquidity planning and explicit approval before spending real SOL;
- final review before irreversible authority changes.

Devnet wallets, keys, tokens and mint must not be reused as production assets.
