//! Exact pinned official Meteora ELF, synthetic accounts, real SBF CPI, no transport.
use crate::{account, elf, engine, token};
use base64::{engine::general_purpose::STANDARD, Engine};
use solana_account::{AccountSharedData, ReadableAccount, WritableAccount};
use solana_instruction::{error::InstructionError, AccountMeta, Instruction};
use solana_program_pack::Pack;
use solana_pubkey::Pubkey;
use spl_token_interface::state::{Account as TokenAccount, Mint};
use std::{path::Path, str::FromStr};

pub fn test(root: &Path) {
    use sha2::{Digest, Sha256};
    let bytes = std::fs::read(root.join("target/unsigned-meteora-fixture.json")).unwrap();
    assert_eq!(
        format!("{:x}", Sha256::digest(&bytes)),
        "642012176374b022f97605fc50d62c8601d78420914273430fb9cf63316d4258"
    );
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(json["scope"], "OFFLINE_FIXTURE_ONLY");
    assert_eq!(json["authorization"], false);
    assert_eq!(json["mainnetDisabled"], true);
    assert_eq!(json["mainnetStatus"], "NOT_AUTHORIZED_FOR_MAINNET");
    assert_eq!(
        json["idlSha256"],
        "e476ace8abaf90b70660c7a9bca39e604bb606880a865625bb31cfb3857b4d0d"
    );
    let ixjson = &json["instruction"];
    let key = |value: &serde_json::Value| Pubkey::from_str(value.as_str().unwrap()).unwrap();
    let named = |name: &str| {
        key(&ixjson["accounts"]
            .as_array()
            .unwrap()
            .iter()
            .find(|a| a["name"] == name)
            .unwrap()["address"])
    };
    let program = key(&ixjson["programId"]);
    let system = solana_sdk_ids::system_program::id();
    assert_eq!(
        program.to_string(),
        "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"
    );
    let token2022 = Pubkey::from_str("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb").unwrap();
    let mut map = std::collections::BTreeMap::new();
    for a in ixjson["accounts"].as_array().unwrap() {
        map.entry(key(&a["address"]))
            .or_insert_with(|| AccountSharedData::new(0, 0, &system));
    }
    map.insert(
        program,
        elf(
            &root.join("target/meteora-official/build/cp_amm.so"),
            "a30610058262a5c87e1b22144ef6053ff2cd8bc9f97b7e978a51e28f8ec3ea3c",
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
        token2022,
        elf(
            &root.join("target/robusto-final-public-programs/token2022.so"),
            "0999dbf708971e723b08d1caafc988826a59c6001ed6dc02260da07defbe1469",
        ),
    );
    map.insert(
        system,
        account(solana_sdk_ids::native_loader::id(), vec![], true),
    );
    map.insert(named("payer"), {
        let mut a = account(system, vec![], false);
        a.set_lamports(100_000_000_000);
        a
    });
    map.insert(
        named("token_a_mint"),
        account(
            spl_token_interface::ID,
            STANDARD
                .decode(json["input"]["mintAccount"]["dataBase64"].as_str().unwrap())
                .unwrap(),
            false,
        ),
    );
    let mut mintb = vec![0; Mint::LEN];
    Mint::pack(
        Mint {
            decimals: 9,
            is_initialized: true,
            ..Mint::default()
        },
        &mut mintb,
    )
    .unwrap();
    map.insert(
        named("token_b_mint"),
        account(spl_token_interface::ID, mintb, false),
    );
    map.insert(
        named("payer_token_a"),
        token(
            named("token_a_mint"),
            named("payer"),
            1_000_000_000_000,
            false,
        ),
    );
    let reserve = solana_rent::Rent::default().minimum_balance(TokenAccount::LEN);
    let mut b = token(named("token_b_mint"), named("payer"), 1, false);
    let mut tb = TokenAccount::unpack(b.data()).unwrap();
    tb.is_native = Some(reserve).into();
    TokenAccount::pack(tb, b.data_as_mut_slice()).unwrap();
    b.set_lamports(reserve + 1);
    map.insert(named("payer_token_b"), b);
    let clock = solana_clock::Clock {
        slot: 10,
        unix_timestamp: 100,
        ..Default::default()
    };
    map.insert(
        solana_sdk_ids::sysvar::clock::id(),
        account(
            solana_sdk_ids::sysvar::id(),
            bincode::serialize(&clock).unwrap(),
            false,
        ),
    );
    map.insert(
        solana_sdk_ids::sysvar::rent::id(),
        account(
            solana_sdk_ids::sysvar::id(),
            bincode::serialize(&solana_rent::Rent::default()).unwrap(),
            false,
        ),
    );
    let accounts: engine::Accounts = map.into_iter().collect();
    let ix = Instruction {
        program_id: program,
        data: STANDARD
            .decode(ixjson["dataBase64"].as_str().unwrap())
            .unwrap(),
        accounts: ixjson["accounts"]
            .as_array()
            .unwrap()
            .iter()
            .map(|a| AccountMeta {
                pubkey: key(&a["address"]),
                is_signer: a["isSigner"].as_bool().unwrap(),
                is_writable: a["isWritable"].as_bool().unwrap(),
            })
            .collect(),
    };
    let result = engine::execute(&accounts, std::slice::from_ref(&ix), None);
    if result.outcome != engine::Outcome::Complete {
        println!("{:?}\n{}", result.outcome, result.logs.join("\n"));
    }
    assert_eq!(result.outcome, engine::Outcome::Complete);
    let amount = |key| {
        TokenAccount::unpack(
            result
                .committed
                .iter()
                .find(|(k, _)| *k == key)
                .unwrap()
                .1
                .data(),
        )
        .unwrap()
        .amount
    };
    assert_eq!(amount(named("payer_token_a")), 0);
    assert_eq!(amount(named("token_a_vault")), 1_000_000_000_000);
    assert_eq!(amount(named("payer_token_b")), 0);
    assert_eq!(amount(named("token_b_vault")), 1);
    let lamports = |state: &engine::Accounts| {
        state
            .iter()
            .map(|(_, a)| u128::from(a.lamports()))
            .sum::<u128>()
    };
    assert_eq!(lamports(&accounts), lamports(&result.committed));
    for name in ["token_a_mint", "token_b_mint"] {
        assert_eq!(
            accounts.iter().find(|(k, _)| *k == named(name)).unwrap().1,
            result
                .committed
                .iter()
                .find(|(k, _)| *k == named(name))
                .unwrap()
                .1
        );
    }
    let nft = result
        .committed
        .iter()
        .find(|(k, _)| *k == named("position_nft_mint"))
        .unwrap()
        .1
        .data();
    assert_eq!(Mint::unpack(&nft[..Mint::LEN]).unwrap().supply, 1);
    for (name, disc) in [
        ("pool", b"account:Pool".as_slice()),
        ("position", b"account:Position".as_slice()),
    ] {
        use sha2::{Digest, Sha256};
        let state = &result
            .committed
            .iter()
            .find(|(k, _)| *k == named(name))
            .unwrap()
            .1;
        assert_eq!(*state.owner(), program);
        assert_eq!(&state.data()[..8], &Sha256::digest(disc)[..8]);
    }
    let check = |label: &str, state: &engine::Accounts, instruction: Instruction| {
        let failure = engine::execute(state, &[instruction], None);
        println!("Meteora {label}: {:?}", failure.outcome);
        let error = match label {
            "payer" => InstructionError::Custom(3010),
            "position_nft_mint" => InstructionError::PrivilegeEscalation,
            "sourceAuthority" => InstructionError::Custom(4),
            "sourceMint" => InstructionError::Custom(3),
            "frozenSource" => InstructionError::Custom(17),
            "emptyA" | "emptyB" | "payerFunds" => InstructionError::Custom(1),
            "invalidMintA" | "invalidMintB" => InstructionError::UninitializedAccount,
            "mintOwner" => InstructionError::Custom(3007),
            "zeroLiquidity" => InstructionError::Custom(6021),
            "maxLiquidity" => InstructionError::Custom(6000),
            "invalidRange" => InstructionError::Custom(6014),
            "invalidActivation" => InstructionError::Custom(6010),
            "invalidFeeMode" => InstructionError::Custom(6017),
            "duplicatePool" => InstructionError::Custom(0),
            "substitutedVault" | "sameMints" => InstructionError::Custom(2006),
            _ => panic!("Missing exact error expectation"),
        };
        assert_eq!(
            failure.outcome,
            engine::Outcome::Failed(0, error),
            "{label}"
        );
        assert_eq!(
            failure.committed, *state,
            "{label}: failed fixture accepted effects"
        );
        assert_eq!(
            lamports(&failure.staged),
            lamports(state),
            "{label}: raw lamports not conserved"
        );
        failure
    };
    for role in ["payer", "position_nft_mint"] {
        let mut altered = ix.clone();
        altered
            .accounts
            .iter_mut()
            .find(|m| m.pubkey == named(role))
            .unwrap()
            .is_signer = false;
        check(role, &accounts, altered);
    }
    for label in [
        "sourceAuthority",
        "sourceMint",
        "frozenSource",
        "emptyA",
        "emptyB",
        "invalidMintA",
        "invalidMintB",
        "mintOwner",
        "payerFunds",
    ] {
        let mut altered = accounts.clone();
        let target = match label {
            "invalidMintA" | "mintOwner" => "token_a_mint",
            "invalidMintB" => "token_b_mint",
            "emptyB" => "payer_token_b",
            "payerFunds" => "payer",
            _ => "payer_token_a",
        };
        let a = &mut altered
            .iter_mut()
            .find(|(k, _)| *k == named(target))
            .unwrap()
            .1;
        match label {
            "invalidMintA" | "invalidMintB" => a.data_as_mut_slice()[45] = 0,
            "mintOwner" => a.set_owner(program),
            "payerFunds" => a.set_lamports(1),
            _ => {
                let mut t = TokenAccount::unpack(a.data()).unwrap();
                match label {
                    "sourceAuthority" => t.owner = crate::public(77),
                    "sourceMint" => t.mint = crate::public(77),
                    "frozenSource" => t.state = spl_token_interface::state::AccountState::Frozen,
                    _ => t.amount = 0,
                }
                TokenAccount::pack(t, a.data_as_mut_slice()).unwrap();
            }
        }
        let failure = check(label, &altered, ix.clone());
        if label == "emptyB" {
            // Token A already transferred before the B CPI fails. This raw partial effect must never be committed.
            let raw = |name| {
                TokenAccount::unpack(
                    failure
                        .staged
                        .iter()
                        .find(|(k, _)| *k == named(name))
                        .unwrap()
                        .1
                        .data(),
                )
                .unwrap()
                .amount
            };
            assert_eq!(raw("payer_token_a"), 0);
            assert_eq!(raw("token_a_vault"), 1_000_000_000_000);
            assert_ne!(failure.staged, altered);
        }
    }
    for variant in json["variants"].as_array().unwrap() {
        let mut altered = ix.clone();
        altered.data = STANDARD
            .decode(variant["dataBase64"].as_str().unwrap())
            .unwrap();
        check(variant["name"].as_str().unwrap(), &accounts, altered);
    }
    check("duplicatePool", &result.committed, ix.clone());
    let mut substituted = ix.clone();
    substituted
        .accounts
        .iter_mut()
        .find(|m| m.pubkey == named("token_a_vault"))
        .unwrap()
        .pubkey = named("pool_authority");
    check("substitutedVault", &accounts, substituted);
    let mut same_mint = ix.clone();
    same_mint
        .accounts
        .iter_mut()
        .find(|m| m.pubkey == named("token_b_mint"))
        .unwrap()
        .pubkey = named("token_a_mint");
    check("sameMints", &accounts, same_mint);
    println!("20 Meteora cases passed: real pinned SBF/System/SPL/Token-2022/event CPI; OFFLINE_FIXTURE_ONLY");
}
