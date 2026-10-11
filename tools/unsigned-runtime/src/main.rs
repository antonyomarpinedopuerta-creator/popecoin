mod engine;
// Instruction runtime only: signer flags are synthetic permissions, never signatures.
use sha2::{Digest, Sha256};
use solana_account::{AccountSharedData, ReadableAccount, WritableAccount};
use solana_instruction::{error::InstructionError, AccountMeta};
use solana_program_pack::Pack;
use solana_pubkey::Pubkey;
use spl_token_interface::state::{Account as TokenAccount, AccountState, Mint};
use std::{path::Path, str::FromStr};

const PROGRAM: &str = "YMN9Qj5jPNp7j14VPcML1B6xGgcPWVZUGLFU3Mnyfaf";
fn public(n: u8) -> Pubkey {
    Pubkey::new_from_array([n; 32])
}
fn account(owner: Pubkey, data: Vec<u8>, executable: bool) -> AccountSharedData {
    let mut a = AccountSharedData::new(10_000_000, data.len(), &owner);
    a.set_data_from_slice(&data);
    a.set_executable(executable);
    a
}
fn elf(path: &Path, expected: &str) -> AccountSharedData {
    let bytes = std::fs::read(path).unwrap();
    assert_eq!(
        format!("{:x}", Sha256::digest(&bytes)),
        expected,
        "Unreviewed ELF"
    );
    account(solana_sdk_ids::bpf_loader::id(), bytes, true)
}
fn token(mint: Pubkey, owner: Pubkey, amount: u64, frozen: bool) -> AccountSharedData {
    let t = TokenAccount {
        mint,
        owner,
        amount,
        state: if frozen {
            AccountState::Frozen
        } else {
            AccountState::Initialized
        },
        ..TokenAccount::default()
    };
    let mut bytes = vec![0; TokenAccount::LEN];
    TokenAccount::pack(t, &mut bytes).unwrap();
    account(spl_token_interface::ID, bytes, false)
}
fn run(
    paths: (&Path, &Path),
    now: i64,
    signer: bool,
    frozen: bool,
    balance: u64,
    expected: Result<(), InstructionError>,
    deposit: Option<u64>,
) {
    let (root, program_path) = paths;
    let program = Pubkey::from_str(PROGRAM).unwrap();
    let mint = public(10);
    let beneficiary = public(11);
    let (vesting, bump) =
        Pubkey::find_program_address(&[b"vesting", beneficiary.as_ref(), mint.as_ref()], &program);
    let (vault, _) = Pubkey::find_program_address(&[b"vault", vesting.as_ref()], &program);
    let destination = public(12);
    let actor = if deposit.is_some() {
        public(13)
    } else {
        beneficiary
    };
    let mut state = Sha256::digest(b"account:VestingAccount")[..8].to_vec();
    for key in [public(13), beneficiary, mint] {
        state.extend_from_slice(key.as_ref());
    }
    for n in [100u64, 0] {
        state.extend_from_slice(&n.to_le_bytes());
    }
    for n in [100i64, 110, 200] {
        state.extend_from_slice(&n.to_le_bytes());
    }
    state.push(bump);
    let mut mint_bytes = vec![0; Mint::LEN];
    Mint::pack(
        Mint {
            supply: 100,
            decimals: 6,
            is_initialized: true,
            ..Mint::default()
        },
        &mut mint_bytes,
    )
    .unwrap();
    let clock = solana_clock::Clock {
        slot: 10,
        unix_timestamp: now,
        ..Default::default()
    };
    let accounts = vec![
        (
            program,
            elf(
                program_path,
                "e932987ffdb686dcffd3563ca2bbccdfcf51dc89debefb6d6cb046e5f5bf7ecb",
            ),
        ),
        (
            spl_token_interface::ID,
            elf(
                &root.join("target/robusto-final-public-programs/token.so"),
                "8190d3f7ceb6cb7a7a8d8924bff89f9f611e15ce1f806f2b6237f3311a98f697",
            ),
        ),
        (vesting, account(program, state, false)),
        (vault, token(mint, vesting, balance, frozen)),
        (
            actor,
            account(solana_sdk_ids::system_program::id(), vec![], false),
        ),
        (mint, account(spl_token_interface::ID, mint_bytes, false)),
        (
            destination,
            token(mint, actor, if deposit.is_some() { 100 } else { 0 }, false),
        ),
        (
            solana_sdk_ids::sysvar::clock::id(),
            account(
                solana_sdk_ids::sysvar::id(),
                bincode::serialize(&clock).unwrap(),
                false,
            ),
        ),
        // mock_process_instruction removes its last supplied account on return.
        (
            public(99),
            account(solana_sdk_ids::system_program::id(), vec![], false),
        ),
    ];
    let before: Vec<_> = accounts.iter().map(|(_, a)| a.data().to_vec()).collect();
    let metas = vec![
        AccountMeta::new(vesting, false),
        AccountMeta::new(vault, false),
        AccountMeta::new(actor, signer),
        AccountMeta::new_readonly(mint, false),
        AccountMeta::new(destination, false),
        AccountMeta::new_readonly(spl_token_interface::ID, false),
    ];
    let mut data = Sha256::digest(if deposit.is_some() {
        b"global:deposit".as_slice()
    } else {
        b"global:release".as_slice()
    })[..8]
        .to_vec();
    if let Some(amount) = deposit {
        data.extend_from_slice(&amount.to_le_bytes());
    }
    let result = solana_program_runtime::invoke_context::mock_process_instruction(
        &solana_sdk_ids::bpf_loader::id(),
        Some(0),
        &data,
        accounts,
        metas,
        expected.clone(),
        solana_bpf_loader_program::Entrypoint::vm,
        solana_bpf_loader_program::test_utils::load_all_invoked_programs,
        |_| {},
    );
    if expected.is_ok() {
        if let Some(amount) = deposit {
            assert_eq!(
                TokenAccount::unpack(result[3].data()).unwrap().amount,
                balance + amount
            );
            assert_eq!(
                TokenAccount::unpack(result[6].data()).unwrap().amount,
                100 - amount
            );
            assert_eq!(result[2].data(), before[2]);
            return;
        }
        let amount = if now >= 200 { 100 } else { (now - 100) as u64 };
        assert_eq!(
            TokenAccount::unpack(result[3].data()).unwrap().amount,
            balance - amount
        );
        assert_eq!(
            TokenAccount::unpack(result[6].data()).unwrap().amount,
            amount
        );
        assert_eq!(
            u64::from_le_bytes(result[2].data()[112..120].try_into().unwrap()),
            amount
        );
    } else {
        for index in [2, 3, 6] {
            assert_eq!(result[index].data(), before[index]);
        }
    }
}
fn initialize(
    root: &Path,
    program_path: &Path,
    missing_signer: Option<usize>,
) -> Vec<(Pubkey, AccountSharedData)> {
    let program = Pubkey::from_str(PROGRAM).unwrap();
    let mint = public(10);
    let beneficiary = public(11);
    let authority = public(13);
    let payer = public(14);
    let system = solana_sdk_ids::system_program::id();
    let (vesting, bump) =
        Pubkey::find_program_address(&[b"vesting", beneficiary.as_ref(), mint.as_ref()], &program);
    let (vault, _) = Pubkey::find_program_address(&[b"vault", vesting.as_ref()], &program);
    let mut mint_bytes = vec![0; Mint::LEN];
    Mint::pack(
        Mint {
            supply: 100,
            decimals: 6,
            is_initialized: true,
            ..Mint::default()
        },
        &mut mint_bytes,
    )
    .unwrap();
    let rent = solana_rent::Rent::default();
    let clock = solana_clock::Clock {
        slot: 10,
        ..Default::default()
    };
    let mut payer_account = account(system, vec![], false);
    payer_account.set_lamports(100_000_000);
    let accounts = vec![
        (
            program,
            elf(
                program_path,
                "e932987ffdb686dcffd3563ca2bbccdfcf51dc89debefb6d6cb046e5f5bf7ecb",
            ),
        ),
        (
            spl_token_interface::ID,
            elf(
                &root.join("target/robusto-final-public-programs/token.so"),
                "8190d3f7ceb6cb7a7a8d8924bff89f9f611e15ce1f806f2b6237f3311a98f697",
            ),
        ),
        (vesting, AccountSharedData::new(0, 0, &system)),
        (vault, AccountSharedData::new(0, 0, &system)),
        (beneficiary, account(system, vec![], false)),
        (mint, account(spl_token_interface::ID, mint_bytes, false)),
        (authority, account(system, vec![], false)),
        (payer, payer_account),
        (
            system,
            account(solana_sdk_ids::native_loader::id(), vec![], true),
        ),
        (
            solana_sdk_ids::sysvar::rent::id(),
            account(
                solana_sdk_ids::sysvar::id(),
                bincode::serialize(&rent).unwrap(),
                false,
            ),
        ),
        (
            solana_sdk_ids::sysvar::clock::id(),
            account(
                solana_sdk_ids::sysvar::id(),
                bincode::serialize(&clock).unwrap(),
                false,
            ),
        ),
        (public(99), account(system, vec![], false)),
    ];
    let keys: Vec<_> = accounts.iter().map(|(key, _)| *key).collect();
    let before: Vec<_> = accounts
        .iter()
        .map(|(_, a)| (a.data().to_vec(), a.lamports(), *a.owner()))
        .collect();
    let metas = vec![
        AccountMeta::new(payer, missing_signer != Some(0)),
        AccountMeta::new_readonly(authority, missing_signer != Some(1)),
        AccountMeta::new_readonly(beneficiary, missing_signer != Some(2)),
        AccountMeta::new_readonly(mint, false),
        AccountMeta::new(vesting, false),
        AccountMeta::new(vault, false),
        AccountMeta::new_readonly(spl_token_interface::ID, false),
        AccountMeta::new_readonly(system, false),
        AccountMeta::new_readonly(solana_sdk_ids::sysvar::rent::id(), false),
    ];
    let mut data = Sha256::digest(b"global:initialize")[..8].to_vec();
    data.extend_from_slice(&100u64.to_le_bytes());
    for time in [100i64, 110, 200] {
        data.extend_from_slice(&time.to_le_bytes());
    }
    let expected = if missing_signer.is_some() {
        Err(InstructionError::Custom(3010))
    } else {
        Ok(())
    };
    let result = solana_program_runtime::invoke_context::mock_process_instruction(
        &solana_sdk_ids::bpf_loader::id(),
        Some(0),
        &data,
        accounts,
        metas,
        expected,
        solana_bpf_loader_program::Entrypoint::vm,
        |ctx| {
            solana_bpf_loader_program::test_utils::load_all_invoked_programs(ctx);
            ctx.program_cache_for_tx_batch.replenish(
                system,
                std::sync::Arc::new(
                    solana_program_runtime::loaded_programs::ProgramCacheEntry::new_builtin(
                        0,
                        0,
                        solana_system_program::system_processor::Entrypoint::vm,
                    ),
                ),
            );
        },
        |_| {},
    );
    if missing_signer.is_none() {
        let state = result[2].data();
        assert_eq!(state.len(), 145);
        assert_eq!(&state[..8], &Sha256::digest(b"account:VestingAccount")[..8]);
        assert_eq!(&state[8..40], authority.as_ref());
        assert_eq!(&state[40..72], beneficiary.as_ref());
        assert_eq!(&state[72..104], mint.as_ref());
        assert_eq!(u64::from_le_bytes(state[104..112].try_into().unwrap()), 100);
        assert_eq!(u64::from_le_bytes(state[112..120].try_into().unwrap()), 0);
        assert_eq!(state[144], bump);
        assert_eq!(*result[2].owner(), program);
        assert_eq!(*result[3].owner(), spl_token_interface::ID);
        let token = TokenAccount::unpack(result[3].data()).unwrap();
        assert_eq!(token.owner, vesting);
        assert_eq!(token.mint, mint);
        assert_eq!(token.amount, 0);
        assert_eq!(token.state, AccountState::Initialized);
        assert_eq!(result[2].lamports(), rent.minimum_balance(145));
        assert_eq!(
            result[3].lamports(),
            rent.minimum_balance(TokenAccount::LEN)
        );
        assert_eq!(
            result[7].lamports() + result[2].lamports() + result[3].lamports(),
            100_000_000
        );
    } else {
        for index in [2, 3, 7] {
            assert_eq!(
                (
                    result[index].data().to_vec(),
                    result[index].lamports(),
                    *result[index].owner()
                ),
                before[index]
            );
        }
    }
    keys.into_iter().zip(result).collect()
}

fn lifecycle(root: &Path, program_path: &Path) {
    let mut accounts = initialize(root, program_path, None);
    let program = Pubkey::from_str(PROGRAM).unwrap();
    let mint = public(10);
    let beneficiary = public(11);
    let authority = public(13);
    let (vesting, _) =
        Pubkey::find_program_address(&[b"vesting", beneficiary.as_ref(), mint.as_ref()], &program);
    let (vault, _) = Pubkey::find_program_address(&[b"vault", vesting.as_ref()], &program);
    let destination = public(12);
    let source = public(15);
    accounts.push((destination, token(mint, beneficiary, 0, false)));
    accounts.push((source, token(mint, authority, 100, false)));
    for (deposit, now, error) in [
        (true, 100, None),
        (true, 100, Some(6003)),
        (false, 150, None),
        (false, 150, Some(6002)),
        (false, 120, Some(6004)),
        (false, 200, None),
        (false, 200, Some(6002)),
    ] {
        let clock = solana_clock::Clock {
            slot: 10,
            unix_timestamp: now,
            ..Default::default()
        };
        accounts
            .iter_mut()
            .find(|(key, _)| *key == solana_sdk_ids::sysvar::clock::id())
            .unwrap()
            .1
            .set_data_from_slice(&bincode::serialize(&clock).unwrap());
        let before = accounts.clone();
        let mut data = Sha256::digest(if deposit {
            b"global:deposit".as_slice()
        } else {
            b"global:release".as_slice()
        })[..8]
            .to_vec();
        if deposit {
            data.extend_from_slice(&100u64.to_le_bytes());
        }
        let actor = if deposit { authority } else { beneficiary };
        let metas = vec![
            AccountMeta::new(vesting, false),
            AccountMeta::new(vault, false),
            AccountMeta::new(actor, true),
            AccountMeta::new_readonly(mint, false),
            AccountMeta::new(if deposit { source } else { destination }, false),
            AccountMeta::new_readonly(spl_token_interface::ID, false),
        ];
        let keys: Vec<_> = accounts.iter().map(|(key, _)| *key).collect();
        accounts.push((
            public(99),
            account(solana_sdk_ids::system_program::id(), vec![], false),
        ));
        let result = solana_program_runtime::invoke_context::mock_process_instruction(
            &solana_sdk_ids::bpf_loader::id(),
            Some(0),
            &data,
            accounts,
            metas,
            error.map_or(Ok(()), |code| Err(InstructionError::Custom(code))),
            solana_bpf_loader_program::Entrypoint::vm,
            solana_bpf_loader_program::test_utils::load_all_invoked_programs,
            |_| {},
        );
        accounts = keys.into_iter().zip(result).collect();
        if error.is_some() {
            assert_eq!(
                accounts, before,
                "Failed lifecycle step changed account state"
            );
        }
        let find = |key| accounts.iter().find(|(k, _)| *k == key).unwrap().1.data();
        let amount = |key| TokenAccount::unpack(find(key)).unwrap().amount;
        assert_eq!(amount(source) + amount(vault) + amount(destination), 100);
        assert_eq!(
            u64::from_le_bytes(find(vesting)[112..120].try_into().unwrap()),
            amount(destination)
        );
    }
    let amount = |key| {
        TokenAccount::unpack(accounts.iter().find(|(k, _)| *k == key).unwrap().1.data())
            .unwrap()
            .amount
    };
    assert_eq!(amount(source), 0);
    assert_eq!(amount(vault), 0);
    assert_eq!(amount(destination), 100);
}

fn bounded_atomicity(root: &Path, program_path: &Path) {
    use engine::{execute, Outcome};
    use solana_instruction::Instruction;
    let mut accounts = initialize(root, program_path, None);
    let program = Pubkey::from_str(PROGRAM).unwrap();
    let mint = public(10);
    let beneficiary = public(11);
    let authority = public(13);
    let (vesting, _) =
        Pubkey::find_program_address(&[b"vesting", beneficiary.as_ref(), mint.as_ref()], &program);
    let (vault, _) = Pubkey::find_program_address(&[b"vault", vesting.as_ref()], &program);
    let source = public(15);
    let dest = public(12);
    accounts.push((source, token(mint, authority, 100, false)));
    accounts.push((dest, token(mint, beneficiary, 0, false)));
    accounts
        .iter_mut()
        .find(|(k, _)| *k == solana_sdk_ids::sysvar::clock::id())
        .unwrap()
        .1
        .set_data_from_slice(
            &bincode::serialize(&solana_clock::Clock {
                slot: 10,
                unix_timestamp: 150,
                ..Default::default()
            })
            .unwrap(),
        );
    let ix = |deposit: bool, signer: bool| {
        let mut data = Sha256::digest(if deposit {
            b"global:deposit".as_slice()
        } else {
            b"global:release".as_slice()
        })[..8]
            .to_vec();
        if deposit {
            data.extend_from_slice(&100u64.to_le_bytes());
        }
        Instruction {
            program_id: program,
            data,
            accounts: vec![
                AccountMeta::new(vesting, false),
                AccountMeta::new(vault, false),
                AccountMeta::new(if deposit { authority } else { beneficiary }, signer),
                AccountMeta::new_readonly(mint, false),
                AccountMeta::new(if deposit { source } else { dest }, false),
                AccountMeta::new_readonly(spl_token_interface::ID, false),
            ],
        }
    };
    let success = execute(&accounts, &[ix(true, true), ix(false, true)], None);
    assert_eq!(success.outcome, Outcome::Complete);
    let amount = |state: &engine::Accounts, key| {
        TokenAccount::unpack(state.iter().find(|(k, _)| *k == key).unwrap().1.data())
            .unwrap()
            .amount
    };
    assert_eq!(amount(&success.committed, dest), 50);
    assert_eq!(amount(&success.committed, vault), 50);
    assert_eq!(amount(&success.committed, source), 0);
    assert_ne!(
        engine::digest(&success.committed),
        engine::digest(&accounts)
    );
    // Both instructions execute in ONE Agave InvokeContext. Discard is our explicit fixture policy.
    let duplicate = execute(
        &accounts,
        &[ix(true, true), ix(false, true), ix(false, true)],
        None,
    );
    assert_eq!(
        duplicate.outcome,
        Outcome::Failed(2, InstructionError::Custom(6002))
    );
    assert_eq!(duplicate.committed, accounts);
    assert_eq!(amount(&duplicate.staged, dest), 50); // raw runtime did NOT roll back!
    assert_ne!(duplicate.staged, accounts);
    let rejected = execute(&accounts, &[ix(true, true), ix(true, true)], None);
    assert_eq!(
        rejected.outcome,
        Outcome::Failed(1, InstructionError::Custom(6003))
    );
    assert_eq!(rejected.committed, accounts);
    // Earlier signer permissions are not copied to a later unsigned instruction.
    let denied = execute(&accounts, &[ix(true, true), ix(false, false)], None);
    assert_eq!(
        denied.outcome,
        Outcome::Failed(1, InstructionError::Custom(3010))
    );
    assert_eq!(denied.committed, accounts);
    for stop in 0..=2 {
        let interrupted = execute(&accounts, &[ix(true, true), ix(false, true)], Some(stop));
        assert_eq!(interrupted.outcome, Outcome::Interrupted(stop));
        assert_eq!(interrupted.committed, accounts);
    }
    let mut frozen = accounts.clone();
    let destination = frozen.iter_mut().find(|(k, _)| *k == dest).unwrap();
    let mut state = TokenAccount::unpack(destination.1.data()).unwrap();
    state.state = AccountState::Frozen;
    TokenAccount::pack(state, destination.1.data_as_mut_slice()).unwrap();
    let failed_cpi = execute(&frozen, &[ix(true, true), ix(false, true)], None);
    assert_eq!(
        failed_cpi.outcome,
        Outcome::Failed(1, InstructionError::Custom(17))
    );
    assert_eq!(failed_cpi.committed, frozen);
    assert_eq!(amount(&failed_cpi.staged, dest), 0);
    for result in [&success, &duplicate, &rejected, &denied, &failed_cpi] {
        assert_eq!(
            amount(&result.staged, source)
                + amount(&result.staged, vault)
                + amount(&result.staged, dest),
            100
        );
        assert!(result.consumed > 0);
    }
    println!("8 bounded atomicity cases passed; raw effects retained for failed sequence; explicit fixture discard, NOT native transaction rollback");
}

fn main() {
    let args: Vec<_> = std::env::args().collect();
    assert_eq!(
        args.len(),
        3,
        "Usage: robusto-unsigned-runtime REPOSITORY FIXTURE_ELF"
    );
    let root = Path::new(&args[1]);
    let elf = Path::new(&args[2]);
    run((root, elf), 150, true, false, 100, Ok(()), None);
    run((root, elf), 200, true, false, 100, Ok(()), None);
    run(
        (root, elf),
        109,
        true,
        false,
        100,
        Err(InstructionError::Custom(6002)),
        None,
    );
    run(
        (root, elf),
        150,
        false,
        false,
        100,
        Err(InstructionError::Custom(3010)),
        None,
    );
    run(
        (root, elf),
        150,
        true,
        true,
        100,
        Err(InstructionError::Custom(17)),
        None,
    );
    run(
        (root, elf),
        150,
        true,
        false,
        1,
        Err(InstructionError::Custom(1)),
        None,
    );
    run((root, elf), 150, true, false, 0, Ok(()), Some(100));
    run((root, elf), 150, true, false, 40, Ok(()), Some(60));
    run(
        (root, elf),
        150,
        true,
        false,
        100,
        Err(InstructionError::Custom(6003)),
        Some(100),
    );
    run(
        (root, elf),
        150,
        true,
        false,
        0,
        Err(InstructionError::Custom(6003)),
        Some(99),
    );
    run(
        (root, elf),
        150,
        false,
        false,
        0,
        Err(InstructionError::Custom(3010)),
        Some(100),
    );
    run(
        (root, elf),
        150,
        true,
        true,
        0,
        Err(InstructionError::Custom(17)),
        Some(100),
    );
    initialize(root, elf, None);
    for index in 0..3 {
        initialize(root, elf, Some(index));
    }
    lifecycle(root, elf);
    bounded_atomicity(root, elf);
    println!("24 unsigned instruction-runtime cases passed; real SBF SPL CPI; synthetic signer permissions; NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED");
}
