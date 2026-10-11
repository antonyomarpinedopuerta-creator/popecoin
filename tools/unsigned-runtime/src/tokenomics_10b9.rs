//! Separate 10B / nine decimals fixture; real pinned SBF, synthetic permissions only.
use crate::{account, elf, engine, public, token};
use sha2::{Digest, Sha256};
use solana_account::{AccountSharedData, ReadableAccount, WritableAccount};
use solana_instruction::{error::InstructionError, AccountMeta, Instruction};
use solana_program_pack::Pack;
use solana_pubkey::Pubkey;
use spl_token_interface::state::{Account as TokenAccount, Mint};
use std::{path::Path, str::FromStr};
const SUPPLY: u64 = 10_000_000_000_000_000_000;
const FOUNDER: u64 = 1_000_000_000_000_000;
fn ix(v: &serde_json::Value) -> Instruction {
    let data = v["dataHex"]
        .as_str()
        .unwrap()
        .as_bytes()
        .chunks_exact(2)
        .map(|b| u8::from_str_radix(std::str::from_utf8(b).unwrap(), 16).unwrap())
        .collect();
    Instruction {
        program_id: Pubkey::from_str(v["programId"].as_str().unwrap()).unwrap(),
        data,
        accounts: v["accounts"]
            .as_array()
            .unwrap()
            .iter()
            .map(|a| AccountMeta {
                pubkey: Pubkey::from_str(a["address"].as_str().unwrap()).unwrap(),
                is_signer: a["isSigner"].as_bool().unwrap(),
                is_writable: a["isWritable"].as_bool().unwrap(),
            })
            .collect(),
    }
}
fn amount(state: &engine::Accounts, key: Pubkey) -> u64 {
    TokenAccount::unpack(state.iter().find(|(k, _)| *k == key).unwrap().1.data())
        .unwrap()
        .amount
}
fn check(
    state: &engine::Accounts,
    instructions: &[Instruction],
    error: Option<u32>,
) -> engine::Execution {
    let r = engine::execute(state, instructions, None);
    let expected = error.map_or(engine::Outcome::Complete, |e| {
        engine::Outcome::Failed(0, InstructionError::Custom(e))
    });
    assert_eq!(r.outcome, expected, "{}", r.logs.join("\n"));
    if error.is_some() {
        assert_eq!(r.committed, *state);
        assert_eq!(r.staged, *state);
    }
    r
}
pub fn test(root: &Path, program_path: &Path) {
    let bytes = std::fs::read(root.join("target/robusto-10b9-fixture.json")).unwrap();
    assert_eq!(
        format!("{:x}", Sha256::digest(&bytes)),
        "b7f02dfde0e9a73bd9369145efe44aa179e83c668e54081d5803a3a086362230",
        "Unreviewed alternative fixture"
    );
    let v: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(v["scope"], "OFFLINE_FIXTURE_ONLY");
    assert_eq!(v["authorization"], false);
    assert_eq!(v["mainnetDisabled"], true);
    assert_eq!(v["mainnetStatus"], "NOT_AUTHORIZED_FOR_MAINNET");
    assert_eq!(v["supplyBaseUnits"], SUPPLY.to_string());
    assert_eq!(v["founderBaseUnits"], FOUNDER.to_string());
    assert_eq!(v["decimals"], 9);
    let key = |name: &str| Pubkey::from_str(v[name].as_str().unwrap()).unwrap();
    let instructions: Vec<_> = v["instructions"]
        .as_array()
        .unwrap()
        .iter()
        .map(ix)
        .collect();
    assert_eq!(instructions.len(), 9);
    let system = solana_sdk_ids::system_program::id();
    let mut map = std::collections::BTreeMap::new();
    for instruction in instructions.iter().chain([ix(&v["release"])].iter()) {
        for a in &instruction.accounts {
            map.entry(a.pubkey)
                .or_insert_with(|| AccountSharedData::new(0, 0, &system));
        }
    }
    map.insert(
        key("program"),
        elf(
            program_path,
            "e932987ffdb686dcffd3563ca2bbccdfcf51dc89debefb6d6cb046e5f5bf7ecb",
        ),
    );
    map.insert(
        spl_token_interface::ID,
        elf(
            &root.join("target/robusto-final-public-programs/token.so"),
            "8190d3f7ceb6cb7a7a8d8924bff89f9f611e15ce1f806f2b6237f3311a98f697",
        ),
    );
    map.insert(
        system,
        account(solana_sdk_ids::native_loader::id(), vec![], true),
    );
    map.insert(
        public(10),
        account(spl_token_interface::ID, vec![0; Mint::LEN], false),
    );
    map.insert(public(15), token(public(10), public(13), 0, false));
    map.insert(public(16), token(public(10), public(11), 0, false));
    for n in 20..24 {
        map.insert(public(n), token(public(10), public(n + 30), 0, false));
    }
    let mut payer = account(system, vec![], false);
    payer.set_lamports(100_000_000);
    map.insert(public(14), payer);
    map.insert(
        solana_sdk_ids::sysvar::rent::id(),
        account(
            solana_sdk_ids::sysvar::id(),
            bincode::serialize(&solana_rent::Rent::default()).unwrap(),
            false,
        ),
    );
    map.insert(
        solana_sdk_ids::sysvar::clock::id(),
        account(
            solana_sdk_ids::sysvar::id(),
            bincode::serialize(&solana_clock::Clock {
                slot: 10,
                ..Default::default()
            })
            .unwrap(),
            false,
        ),
    );
    let initial: engine::Accounts = map.into_iter().collect();
    let minted = check(&initial, &instructions[..2], None).committed;
    assert_eq!(amount(&minted, public(15)), SUPPLY);
    check(&minted, &[ix(&v["overflowMint"])], Some(14));
    let mut wrong_decimals = ix(&v["extraMint"]);
    *wrong_decimals.data.last_mut().unwrap() = 8;
    check(&minted, &[wrong_decimals], Some(18));
    let closed = check(&minted, &instructions[2..], None).committed;
    assert_eq!(amount(&closed, public(15)), 0);
    assert_eq!(amount(&closed, key("vault")), FOUNDER);
    let expected = [
        4_000_000_000_000_000_000,
        3_000_000_000_000_000_000,
        1_500_000_000_000_000_000,
        1_499_000_000_000_000_000,
    ];
    for (n, value) in (20..24).zip(expected) {
        assert_eq!(amount(&closed, public(n)), value);
    }
    let mint = Mint::unpack(
        closed
            .iter()
            .find(|(k, _)| *k == public(10))
            .unwrap()
            .1
            .data(),
    )
    .unwrap();
    assert_eq!(mint.supply, SUPPLY);
    assert_eq!(mint.decimals, 9);
    assert!(mint.mint_authority.is_none());
    assert!(mint.freeze_authority.is_none());
    check(&closed, &[ix(&v["extraMint"])], Some(5));
    check(&closed, &[ix(&v["restoreAuthority"])], Some(5));
    let release = ix(&v["release"]);
    check(&closed, std::slice::from_ref(&release), Some(6002));
    let mut halfway = closed.clone();
    let clock = solana_sdk_ids::sysvar::clock::id();
    halfway
        .iter_mut()
        .find(|(k, _)| *k == clock)
        .unwrap()
        .1
        .set_data_from_slice(
            &bincode::serialize(&solana_clock::Clock {
                slot: 10,
                unix_timestamp: 730 * 86400,
                ..Default::default()
            })
            .unwrap(),
        );
    let half = check(&halfway, std::slice::from_ref(&release), None).committed;
    assert_eq!(amount(&half, public(16)), FOUNDER / 2);
    assert_eq!(amount(&half, key("vault")), FOUNDER / 2);
    check(&half, std::slice::from_ref(&release), Some(6002));
    let mut final_state = half.clone();
    final_state
        .iter_mut()
        .find(|(k, _)| *k == clock)
        .unwrap()
        .1
        .set_data_from_slice(
            &bincode::serialize(&solana_clock::Clock {
                slot: 10,
                unix_timestamp: 1095 * 86400,
                ..Default::default()
            })
            .unwrap(),
        );
    let complete = check(&final_state, std::slice::from_ref(&release), None).committed;
    assert_eq!(amount(&complete, public(16)), FOUNDER);
    assert_eq!(amount(&complete, key("vault")), 0);
    check(&complete, &[release], Some(6002));
    for state in [&closed, &half, &complete] {
        let total: u128 = (20..24)
            .map(|n| u128::from(amount(state, public(n))))
            .sum::<u128>()
            + u128::from(amount(state, public(16)))
            + u128::from(amount(state, key("vault")));
        assert_eq!(total, u128::from(SUPPLY));
    }
    assert_eq!(
        initial
            .iter()
            .map(|(_, a)| u128::from(a.lamports()))
            .sum::<u128>(),
        complete
            .iter()
            .map(|(_, a)| u128::from(a.lamports()))
            .sum::<u128>()
    );
    println!("11 alternative 10B/9 cases passed: real pinned SPL/ROBUSTO SBF, founder vesting, fixed mint, overflow and conservation; OFFLINE_FIXTURE_ONLY; NOT native atomicity");
}
