//! Post-create real Meteora instruction execution; no signing or network.
use crate::engine::{self, Accounts, Outcome};
use sha2::{Digest, Sha256};
use solana_account::{ReadableAccount, WritableAccount};
use solana_instruction::{error::InstructionError, AccountMeta, Instruction};
use solana_program_pack::Pack;
use solana_pubkey::Pubkey;
use spl_token_interface::state::{Account as TokenAccount, AccountState};

pub fn test(initial: &Accounts, named: impl Fn(&str) -> Pubkey, program: Pubkey) {
    let balance = |state: &Accounts, name: &str| {
        TokenAccount::unpack(
            state
                .iter()
                .find(|(k, _)| *k == named(name))
                .unwrap()
                .1
                .data(),
        )
        .unwrap()
        .amount
    };
    let totals = |state: &Accounts| {
        (
            u128::from(balance(state, "payer_token_a"))
                + u128::from(balance(state, "token_a_vault")),
            u128::from(balance(state, "payer_token_b"))
                + u128::from(balance(state, "token_b_vault")),
            state
                .iter()
                .map(|(_, a)| u128::from(a.lamports()))
                .sum::<u128>(),
        )
    };
    let modify = |state: &mut Accounts, name: &str, amount: u64, frozen: bool| {
        let a = &mut state.iter_mut().find(|(k, _)| *k == named(name)).unwrap().1;
        let mut t = TokenAccount::unpack(a.data()).unwrap();
        t.amount = amount;
        if frozen {
            t.state = AccountState::Frozen;
        }
        TokenAccount::pack(t, a.data_as_mut_slice()).unwrap();
    };
    let instruction = |remove: bool, delta: u128, threshold: u64| {
        let mut roles = vec![];
        if remove {
            roles.push(("pool_authority", false, false));
        }
        roles.extend([
            ("pool", true, false),
            ("position", true, false),
            ("payer_token_a", true, false),
            ("payer_token_b", true, false),
            ("token_a_vault", true, false),
            ("token_b_vault", true, false),
            ("token_a_mint", false, false),
            ("token_b_mint", false, false),
            ("position_nft_account", false, false),
            ("creator", false, true),
            ("token_a_program", false, false),
            ("token_b_program", false, false),
            ("event_authority", false, false),
            ("program", false, false),
        ]);
        let name = if remove {
            "remove_liquidity"
        } else {
            "add_liquidity"
        };
        let mut data = Sha256::digest(format!("global:{name}").as_bytes())[..8].to_vec();
        data.extend(delta.to_le_bytes());
        data.extend(threshold.to_le_bytes());
        data.extend(threshold.to_le_bytes());
        Instruction {
            program_id: program,
            data,
            accounts: roles
                .into_iter()
                .map(|(name, w, s)| AccountMeta {
                    pubkey: if name == "program" {
                        program
                    } else {
                        named(name)
                    },
                    is_writable: w,
                    is_signer: s,
                })
                .collect(),
        }
    };
    let mut funded = initial.clone();
    // Additional fictional source inventory, below known mint supply. No mint instruction.
    modify(&mut funded, "payer_token_a", 1_000_000_000_000, false);
    for role in ["payer_token_a", "payer_token_b"] {
        let a = &mut funded
            .iter_mut()
            .find(|(k, _)| *k == named(role))
            .unwrap()
            .1;
        let mut t = TokenAccount::unpack(a.data()).unwrap();
        t.owner = named("creator");
        TokenAccount::pack(t, a.data_as_mut_slice()).unwrap();
    }
    let delta = 3876039221566836409435171622711u128;
    let add = instruction(false, delta, u64::MAX);
    let added = engine::execute(&funded, std::slice::from_ref(&add), None);
    assert_eq!(
        added.outcome,
        Outcome::Complete,
        "{}",
        added.logs.join("\n")
    );
    assert_eq!(totals(&funded), totals(&added.committed));
    assert_eq!(balance(&added.committed, "payer_token_a"), 0);
    assert_eq!(
        balance(&added.committed, "token_a_vault"),
        2_000_000_000_000
    );
    let remove = instruction(true, delta, 0);
    let removed = engine::execute(&added.committed, std::slice::from_ref(&remove), None);
    assert_eq!(
        removed.outcome,
        Outcome::Complete,
        "{}",
        removed.logs.join("\n")
    );
    assert_eq!(totals(&added.committed), totals(&removed.committed));
    assert!(balance(&removed.committed, "payer_token_a") > 0);
    assert!(balance(&removed.committed, "token_a_vault") < 2_000_000_000_000);
    for label in [
        "zeroAdd",
        "maxAdd",
        "slippageAdd",
        "missingSigner",
        "frozenSource",
        "emptySource",
        "zeroRemove",
        "excessRemove",
        "slippageRemove",
        "frozenDestination",
    ] {
        let mut state = funded.clone();
        let mut ix = add.clone();
        match label {
            "zeroAdd" => ix = instruction(false, 0, u64::MAX),
            "maxAdd" => ix = instruction(false, u128::MAX, u64::MAX),
            "slippageAdd" => ix = instruction(false, delta, 0),
            "missingSigner" => {
                ix.accounts
                    .iter_mut()
                    .find(|a| a.is_signer)
                    .unwrap()
                    .is_signer = false
            }
            "frozenSource" => modify(&mut state, "payer_token_a", 1_000_000_000_000, true),
            "emptySource" => modify(&mut state, "payer_token_a", 0, false),
            "zeroRemove" => ix = instruction(true, 0, 0),
            "excessRemove" => ix = instruction(true, u128::MAX, 0),
            "slippageRemove" => ix = instruction(true, delta, u64::MAX),
            "frozenDestination" => {
                ix = remove.clone();
                modify(&mut state, "payer_token_a", 1_000_000_000_000, true);
            }
            _ => unreachable!(),
        }
        let result = engine::execute(&state, &[ix], None);
        println!("Liquidity {label}: {:?}", result.outcome);
        let code = match label {
            "zeroAdd" => 6016,
            "maxAdd" => 6000,
            "slippageAdd" | "slippageRemove" => 6002,
            "missingSigner" => 3010,
            "frozenSource" | "frozenDestination" => 17,
            "emptySource" => 1,
            "zeroRemove" | "excessRemove" => 6023,
            _ => unreachable!(),
        };
        assert_eq!(
            result.outcome,
            Outcome::Failed(0, InstructionError::Custom(code)),
            "{label}"
        );
        assert_eq!(result.committed, state);
        assert_eq!(totals(&state), totals(&result.staged));
    }
    let mut swap_state = funded.clone();
    // Backed fictional wSOL input; initial lower price boundary requires B -> A.
    modify(&mut swap_state, "payer_token_b", 1_000_000_000, false);
    swap_state
        .iter_mut()
        .find(|(k, _)| *k == named("payer_token_b"))
        .unwrap()
        .1
        .checked_add_lamports(1_000_000_000)
        .unwrap();
    let trader = crate::public(78);
    assert_ne!(trader, named("creator"));
    assert_ne!(trader, named("payer"));
    swap_state.push((
        trader,
        crate::account(solana_sdk_ids::system_program::id(), vec![], false),
    ));
    for role in ["payer_token_a", "payer_token_b"] {
        let a = &mut swap_state
            .iter_mut()
            .find(|(k, _)| *k == named(role))
            .unwrap()
            .1;
        let mut token = TokenAccount::unpack(a.data()).unwrap();
        token.owner = trader;
        TokenAccount::pack(token, a.data_as_mut_slice()).unwrap();
    }
    // Creator account absent altogether: ordinary swaps cannot use its permission.
    swap_state.retain(|(k, _)| *k != named("creator"));
    let roles = [
        ("pool_authority", false, false),
        ("pool", true, false),
        ("payer_token_b", true, false),
        ("payer_token_a", true, false),
        ("token_a_vault", true, false),
        ("token_b_vault", true, false),
        ("token_a_mint", false, false),
        ("token_b_mint", false, false),
        ("trader", false, true),
        ("token_a_program", false, false),
        ("token_b_program", false, false),
        ("program", false, false),
        ("event_authority", false, false),
        ("program", false, false),
    ];
    let mut data = Sha256::digest(b"global:swap2")[..8].to_vec();
    data.extend(1_000_000u64.to_le_bytes());
    data.extend(1u64.to_le_bytes());
    data.push(0);
    let swap = Instruction {
        program_id: program,
        data,
        accounts: roles
            .into_iter()
            .map(|(name, w, s)| AccountMeta {
                pubkey: if name == "trader" {
                    trader
                } else if name == "program" {
                    program
                } else {
                    named(name)
                },
                is_writable: w,
                is_signer: s,
            })
            .collect(),
    };
    assert_eq!(
        swap.accounts
            .iter()
            .filter(|a| a.is_signer)
            .map(|a| a.pubkey)
            .collect::<Vec<_>>(),
        vec![trader]
    );
    assert!(!swap
        .accounts
        .iter()
        .any(|a| a.pubkey == named("creator") || a.pubkey == named("position_nft_account")));
    let swapped = engine::execute(&swap_state, std::slice::from_ref(&swap), None);
    assert_eq!(
        swapped.outcome,
        Outcome::Complete,
        "{}",
        swapped.logs.join("\n")
    );
    assert_eq!(totals(&swap_state), totals(&swapped.committed));
    assert_eq!(balance(&swapped.committed, "payer_token_b"), 999_000_000);
    assert!(balance(&swapped.committed, "payer_token_a") > balance(&swap_state, "payer_token_a"));
    for label in ["swapSigner", "swapFrozen", "swapEmpty", "swapSlippage"] {
        let mut state = swap_state.clone();
        let mut ix = swap.clone();
        match label {
            "swapSigner" => ix.accounts[8].is_signer = false,
            "swapFrozen" => modify(&mut state, "payer_token_b", 1_000_000_000, true),
            "swapEmpty" => modify(&mut state, "payer_token_b", 0, false),
            "swapSlippage" => ix.data[16..24].copy_from_slice(&u64::MAX.to_le_bytes()),
            _ => unreachable!(),
        }
        let result = engine::execute(&state, &[ix], None);
        println!("Swap {label}: {:?}", result.outcome);
        let code = match label {
            "swapSigner" => 3010,
            "swapFrozen" => 17,
            "swapEmpty" => 1,
            "swapSlippage" => 6002,
            _ => unreachable!(),
        };
        assert_eq!(
            result.outcome,
            Outcome::Failed(0, InstructionError::Custom(code)),
            "{label}"
        );
        assert_eq!(result.committed, state);
        assert_eq!(totals(&state), totals(&result.staged));
    }
    let mut sell = swap.clone();
    sell.accounts.swap(2, 3);
    sell.data[8..16].copy_from_slice(&100_000_000u64.to_le_bytes());
    let sold = engine::execute(&swapped.committed, std::slice::from_ref(&sell), None);
    assert_eq!(sold.outcome, Outcome::Complete, "{}", sold.logs.join("\n"));
    assert_eq!(totals(&swapped.committed), totals(&sold.committed));
    assert_eq!(
        balance(&sold.committed, "payer_token_a"),
        balance(&swapped.committed, "payer_token_a") - 100_000_000
    );
    assert!(
        balance(&sold.committed, "payer_token_b") > balance(&swapped.committed, "payer_token_b")
    );
    for label in [
        "sellBoundary",
        "sellSlippage",
        "sellEmpty",
        "sellFrozen",
        "sellAuthority",
        "sellLimit",
    ] {
        let mut state = swapped.committed.clone();
        let mut ix = sell.clone();
        match label {
            "sellBoundary" => state = swap_state.clone(),
            "sellSlippage" => ix.data[16..24].copy_from_slice(&u64::MAX.to_le_bytes()),
            "sellEmpty" => modify(&mut state, "payer_token_a", 0, false),
            "sellFrozen" => {
                let value = balance(&state, "payer_token_a");
                modify(&mut state, "payer_token_a", value, true);
            }
            "sellAuthority" => {
                let a = &mut state
                    .iter_mut()
                    .find(|(k, _)| *k == named("payer_token_a"))
                    .unwrap()
                    .1;
                let mut t = TokenAccount::unpack(a.data()).unwrap();
                t.owner = crate::public(79);
                TokenAccount::pack(t, a.data_as_mut_slice()).unwrap();
            }
            "sellLimit" => ix.data[8..16].copy_from_slice(&u64::MAX.to_le_bytes()),
            _ => unreachable!(),
        }
        let result = engine::execute(&state, &[ix], None);
        println!("Swap {label}: {:?}", result.outcome);
        let code = match label {
            "sellBoundary" | "sellLimit" => 6015,
            "sellSlippage" => 6002,
            "sellEmpty" => 1,
            "sellFrozen" => 17,
            "sellAuthority" => 4,
            _ => unreachable!(),
        };
        assert_eq!(
            result.outcome,
            Outcome::Failed(0, InstructionError::Custom(code)),
            "{label}"
        );
        assert_eq!(result.committed, state);
        assert_eq!(totals(&state), totals(&result.staged));
    }
    // Trading permission does not grant withdrawal rights over another owner's position.
    let mut unauthorized_remove = remove.clone();
    unauthorized_remove
        .accounts
        .iter_mut()
        .find(|a| a.is_signer)
        .unwrap()
        .pubkey = trader;
    let denied = engine::execute(&swapped.committed, &[unauthorized_remove], None);
    assert_eq!(
        denied.outcome,
        Outcome::Failed(0, InstructionError::Custom(6053))
    );
    assert_eq!(denied.committed, swapped.committed);
    assert_eq!(totals(&denied.staged), totals(&swapped.committed));
    println!("12 Meteora swap cases passed: real pinned SBF swap2 CPI; OFFLINE_FIXTURE_ONLY");
    println!(
        "13 Meteora liquidity cases passed: real pinned SBF add/remove CPI; OFFLINE_FIXTURE_ONLY"
    );
}
