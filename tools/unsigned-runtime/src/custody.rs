//! Real SBF custody limitations; synthetic public permissions, no native rollback claim.
use crate::{account, engine, initialize, public, token, PROGRAM};
use sha2::{Digest, Sha256};
use solana_account::{ReadableAccount, WritableAccount};
use solana_instruction::{error::InstructionError, AccountMeta, Instruction};
use solana_program_pack::Pack;
use solana_pubkey::Pubkey;
use spl_token_interface::state::{Account as TokenAccount, Mint};
use std::{path::Path, str::FromStr};

pub fn test(root: &Path, elf: &Path) {
    let mut initial = initialize(root, elf, None);
    let program = Pubkey::from_str(PROGRAM).unwrap();
    let mint = public(10);
    let beneficiary = public(11);
    let donor = public(79);
    let source = public(80);
    let dest = public(12);
    let (vesting, _) =
        Pubkey::find_program_address(&[b"vesting", beneficiary.as_ref(), mint.as_ref()], &program);
    let (vault, _) = Pubkey::find_program_address(&[b"vault", vesting.as_ref()], &program);
    // Consistent fictional supply: 100 reserved plus 10 held by an unrelated donor.
    let ma = &mut initial.iter_mut().find(|(k, _)| *k == mint).unwrap().1;
    let mut m = Mint::unpack(ma.data()).unwrap();
    m.supply = 110;
    Mint::pack(m, ma.data_as_mut_slice()).unwrap();
    initial.iter_mut().find(|(k, _)| *k == vault).unwrap().1 = token(mint, vesting, 100, false);
    initial.push((
        donor,
        account(solana_sdk_ids::system_program::id(), vec![], false),
    ));
    initial.push((source, token(mint, donor, 10, false)));
    initial.push((dest, token(mint, beneficiary, 0, false)));
    initial.push((public(81), token(mint, public(13), 0, false)));
    initial
        .iter_mut()
        .find(|(k, _)| *k == solana_sdk_ids::sysvar::clock::id())
        .unwrap()
        .1
        .set_data_from_slice(
            &bincode::serialize(&solana_clock::Clock {
                slot: 10,
                unix_timestamp: 200,
                ..Default::default()
            })
            .unwrap(),
        );
    let balance = |state: &engine::Accounts, key| {
        TokenAccount::unpack(state.iter().find(|(k, _)| *k == key).unwrap().1.data())
            .unwrap()
            .amount
    };
    let totals = |state: &engine::Accounts| {
        (
            [source, dest, vault, public(81)]
                .iter()
                .map(|k| u128::from(balance(state, *k)))
                .sum::<u128>(),
            state
                .iter()
                .map(|(_, a)| u128::from(a.lamports()))
                .sum::<u128>(),
        )
    };
    let donation = spl_token_interface::instruction::transfer_checked(
        &spl_token_interface::ID,
        &source,
        &mint,
        &vault,
        &donor,
        &[],
        10,
        6,
    )
    .unwrap();
    let donated = engine::execute(&initial, &[donation], None);
    assert_eq!(donated.outcome, engine::Outcome::Complete);
    assert_eq!(balance(&donated.committed, vault), 110);
    assert_eq!(totals(&initial), totals(&donated.committed));
    let mut data = Sha256::digest(b"global:release")[..8].to_vec();
    let release = Instruction {
        program_id: program,
        data: data.clone(),
        accounts: vec![
            AccountMeta::new(vesting, false),
            AccountMeta::new(vault, false),
            AccountMeta::new(beneficiary, true),
            AccountMeta::new_readonly(mint, false),
            AccountMeta::new(dest, false),
            AccountMeta::new_readonly(spl_token_interface::ID, false),
        ],
    };
    let denied = |state: &engine::Accounts, ix: Instruction, code| {
        let result = engine::execute(state, &[ix], None);
        assert_eq!(
            result.outcome,
            engine::Outcome::Failed(0, InstructionError::Custom(code))
        );
        assert_eq!(result.staged, *state);
        assert_eq!(result.committed, *state);
    };
    data = Sha256::digest(b"global:deposit")[..8].to_vec();
    data.extend(1u64.to_le_bytes());
    denied(
        &donated.committed,
        Instruction {
            program_id: program,
            data,
            accounts: vec![
                AccountMeta::new(vesting, false),
                AccountMeta::new(vault, false),
                AccountMeta::new(public(13), true),
                AccountMeta::new_readonly(mint, false),
                AccountMeta::new(public(81), false),
                AccountMeta::new_readonly(spl_token_interface::ID, false),
            ],
        },
        6003,
    );
    let mut missing = release.clone();
    missing.accounts[2].is_signer = false;
    denied(&donated.committed, missing, 3010);
    let mut wrong = release.clone();
    wrong.accounts[2].pubkey = public(13);
    denied(&donated.committed, wrong, 6000);
    let complete = engine::execute(&donated.committed, std::slice::from_ref(&release), None);
    assert_eq!(complete.outcome, engine::Outcome::Complete);
    assert_eq!(balance(&complete.committed, dest), 100);
    assert_eq!(balance(&complete.committed, vault), 10);
    assert_eq!(totals(&initial), totals(&complete.committed));
    let state = complete
        .committed
        .iter()
        .find(|(k, _)| *k == vesting)
        .unwrap()
        .1
        .data();
    assert_eq!(u64::from_le_bytes(state[112..120].try_into().unwrap()), 100);
    denied(&complete.committed, release, 6002);
    let withdraw = spl_token_interface::instruction::transfer_checked(
        &spl_token_interface::ID,
        &vault,
        &mint,
        &source,
        &donor,
        &[],
        10,
        6,
    )
    .unwrap();
    denied(&complete.committed, withdraw, 4);
    println!("7 vesting custody SBF cases passed: surplus remains reserved outside entitlement; no administrative recovery; NOT native atomicity");
}
