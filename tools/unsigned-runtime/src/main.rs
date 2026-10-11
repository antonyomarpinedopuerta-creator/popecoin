//! Instruction runtime only: signer flags are synthetic permissions, never signatures.
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
    root: &Path,
    program_path: &Path,
    now: i64,
    signer: bool,
    frozen: bool,
    balance: u64,
    expected: Result<(), InstructionError>,
    deposit: Option<u64>,
) {
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
        |ctx| solana_bpf_loader_program::test_utils::load_all_invoked_programs(ctx),
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
fn main() {
    let args: Vec<_> = std::env::args().collect();
    assert_eq!(
        args.len(),
        3,
        "Usage: robusto-unsigned-runtime REPOSITORY FIXTURE_ELF"
    );
    let root = Path::new(&args[1]);
    let elf = Path::new(&args[2]);
    run(root, elf, 150, true, false, 100, Ok(()), None);
    run(root, elf, 200, true, false, 100, Ok(()), None);
    run(
        root,
        elf,
        109,
        true,
        false,
        100,
        Err(InstructionError::Custom(6002)),
        None,
    );
    run(
        root,
        elf,
        150,
        false,
        false,
        100,
        Err(InstructionError::Custom(3010)),
        None,
    );
    run(
        root,
        elf,
        150,
        true,
        true,
        100,
        Err(InstructionError::Custom(17)),
        None,
    );
    run(
        root,
        elf,
        150,
        true,
        false,
        1,
        Err(InstructionError::Custom(1)),
        None,
    );
    run(root, elf, 150, true, false, 0, Ok(()), Some(100));
    run(root, elf, 150, true, false, 40, Ok(()), Some(60));
    run(
        root,
        elf,
        150,
        true,
        false,
        100,
        Err(InstructionError::Custom(6003)),
        Some(100),
    );
    run(
        root,
        elf,
        150,
        true,
        false,
        0,
        Err(InstructionError::Custom(6003)),
        Some(99),
    );
    run(
        root,
        elf,
        150,
        false,
        false,
        0,
        Err(InstructionError::Custom(3010)),
        Some(100),
    );
    run(
        root,
        elf,
        150,
        true,
        true,
        0,
        Err(InstructionError::Custom(17)),
        Some(100),
    );
    println!("12 unsigned instruction-runtime cases passed; real SBF SPL CPI; synthetic signer permissions; NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED");
}
