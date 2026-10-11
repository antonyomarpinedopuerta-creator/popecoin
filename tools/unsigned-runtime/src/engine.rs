//! Agave instruction context + explicit fixture commit/discard policy.
//! This is NOT Bank/SVM transaction processing, signature verification, or network confirmation.
use solana_account::{AccountSharedData, ReadableAccount};
use solana_instruction::{error::InstructionError, Instruction};
use solana_program_runtime::{
    loaded_programs::ProgramCacheEntry, with_mock_invoke_context_with_feature_set,
};
use solana_svm_timings::ExecuteTimings;
use solana_transaction_context::InstructionAccount;
use std::sync::Arc;

pub type Accounts = Vec<(solana_pubkey::Pubkey, AccountSharedData)>;
#[derive(Debug, PartialEq, Eq)]
pub enum Outcome {
    Complete,
    Failed(usize, InstructionError),
    Interrupted(usize),
    InvalidFixture(String),
}
pub struct Execution {
    pub outcome: Outcome,
    pub committed: Accounts,
    /// Inspectable raw runtime effects, including effects before an instruction failed.
    pub staged: Accounts,
    pub consumed: u64,
    pub logs: Vec<String>,
}
/// Reject impossible known classic SPL supply before treating runtime output as fixture evidence.
pub fn execute(
    accounts: &Accounts,
    instructions: &[Instruction],
    stop_before: Option<usize>,
) -> Execution {
    if let Err(reason) = validate_classic_supply(accounts) {
        return Execution {
            outcome: Outcome::InvalidFixture(reason),
            committed: accounts.clone(),
            staged: accounts.clone(),
            consumed: 0,
            logs: vec![],
        };
    }
    execute_raw(accounts, instructions, stop_before)
}
pub fn validate_classic_supply(accounts: &Accounts) -> Result<(), String> {
    use solana_program_pack::Pack;
    use spl_token_interface::state::{Account as TokenAccount, Mint};
    let mut supplies = std::collections::HashMap::new();
    let mut totals = std::collections::HashMap::new();
    for (key, a) in accounts {
        if *a.owner() != spl_token_interface::ID {
            continue;
        }
        if a.data().len() == Mint::LEN {
            if let Ok(mint) = Mint::unpack(a.data()) {
                supplies.insert(*key, u128::from(mint.supply));
            }
        } else if a.data().len() == TokenAccount::LEN {
            if let Ok(token) = TokenAccount::unpack(a.data()) {
                if let Some(reserve) = Option::<u64>::from(token.is_native) {
                    if token.mint.to_string() != "So11111111111111111111111111111111111111112" {
                        return Err("Native exemption requires the native mint".into());
                    }
                    if u128::from(a.lamports()) < u128::from(reserve) + u128::from(token.amount) {
                        return Err("Unbacked native token fixture".into());
                    }
                    // Wrapped native supply is not maintained in the native mint.
                    continue;
                }
                *totals.entry(token.mint).or_insert(0u128) += u128::from(token.amount);
            }
        }
    }
    for (mint, total) in totals {
        if supplies.get(&mint).is_some_and(|supply| total > *supply) {
            return Err("Known classic token balances exceed mint supply".into());
        }
    }
    Ok(())
}

/// Diagnostic only: can execute deliberately impossible snapshots. Never use as an accepted fixture.
pub fn execute_raw(
    accounts: &Accounts,
    instructions: &[Instruction],
    stop_before: Option<usize>,
) -> Execution {
    // Never merge duplicate identities or silently assign a missing account an index.
    let mut keys = std::collections::HashSet::new();
    assert!(
        accounts.iter().all(|(k, _)| keys.insert(*k)),
        "Duplicate fixture account identity"
    );
    let feature_set = &solana_svm_feature_set::SVMFeatureSet::all_enabled();
    with_mock_invoke_context_with_feature_set!(
        ctx,
        transaction_context,
        feature_set,
        accounts.clone()
    );
    ctx.program_cache_for_tx_batch.set_slot_for_tests(10);
    ctx.program_cache_for_tx_batch.replenish(
        solana_sdk_ids::bpf_loader::id(),
        Arc::new(ProgramCacheEntry::new_builtin(
            0,
            0,
            solana_bpf_loader_program::Entrypoint::vm,
        )),
    );
    ctx.program_cache_for_tx_batch.replenish(
        solana_sdk_ids::system_program::id(),
        Arc::new(ProgramCacheEntry::new_builtin(
            0,
            0,
            solana_system_program::system_processor::Entrypoint::vm,
        )),
    );
    solana_bpf_loader_program::test_utils::load_all_invoked_programs(&mut ctx);
    let mut outcome = Outcome::Complete;
    let mut consumed = 0;
    for (index, ix) in instructions.iter().enumerate() {
        if stop_before == Some(index) {
            outcome = Outcome::Interrupted(index);
            break;
        }
        let program_index = accounts
            .iter()
            .position(|(k, _)| *k == ix.program_id)
            .expect("Missing fixture program") as u16;
        let metas = ix
            .accounts
            .iter()
            .map(|meta| {
                let position = accounts
                    .iter()
                    .position(|(k, _)| *k == meta.pubkey)
                    .expect("Missing fixture account");
                InstructionAccount::new(position as u16, meta.is_signer, meta.is_writable)
            })
            .collect();
        let result = ctx
            .transaction_context
            .configure_next_instruction_for_tests(program_index, metas, ix.data.clone())
            .and_then(|()| {
                let mut units = 0;
                let result = ctx.process_instruction(&mut units, &mut ExecuteTimings::default());
                consumed += units;
                result
            });
        if let Err(error) = result {
            outcome = Outcome::Failed(index, error);
            break;
        }
    }
    // An interruption after the last instruction but before fixture commit is also uncertain.
    if outcome == Outcome::Complete && stop_before == Some(instructions.len()) {
        outcome = Outcome::Interrupted(instructions.len());
    }
    let logs = ctx.get_log_collector().unwrap().borrow().messages.clone();
    drop(ctx);
    let staged: Accounts = accounts
        .iter()
        .map(|(k, _)| *k)
        .zip(transaction_context.deconstruct_without_keys().unwrap())
        .collect();
    let committed = if outcome == Outcome::Complete {
        staged.clone()
    } else {
        accounts.clone()
    };
    Execution {
        outcome,
        committed,
        staged,
        consumed,
        logs,
    }
}

pub fn digest(accounts: &Accounts) -> String {
    use sha2::{Digest, Sha256};
    let mut bytes = b"ROBUSTO_OFFLINE_ACCOUNT_STATE_V1".to_vec();
    let mut sorted: Vec<_> = accounts.iter().collect();
    sorted.sort_by_key(|(k, _)| *k);
    for (key, a) in sorted {
        bytes.extend_from_slice(key.as_ref());
        bytes.extend_from_slice(&a.lamports().to_le_bytes());
        bytes.extend_from_slice(a.owner().as_ref());
        bytes.push(u8::from(a.executable()));
        bytes.extend_from_slice(&(a.data().len() as u64).to_le_bytes());
        bytes.extend_from_slice(a.data());
    }
    format!("{:x}", Sha256::digest(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_account::WritableAccount;
    use solana_program_pack::Pack;
    use spl_token_interface::state::{Account as TokenAccount, Mint};
    fn snapshot(supply: u64, amount: u64) -> Accounts {
        let mint = crate::public(30);
        let mut bytes = vec![0; Mint::LEN];
        Mint::pack(
            Mint {
                supply,
                is_initialized: true,
                ..Mint::default()
            },
            &mut bytes,
        )
        .unwrap();
        vec![
            (mint, crate::account(spl_token_interface::ID, bytes, false)),
            (
                crate::public(31),
                crate::token(mint, crate::public(32), amount, false),
            ),
        ]
    }
    #[test]
    fn known_supply_checked_in_u128_with_multiple_accounts() {
        let mut a = snapshot(u64::MAX, u64::MAX);
        assert!(validate_classic_supply(&a).is_ok());
        a.push((
            crate::public(33),
            crate::token(crate::public(30), crate::public(32), 1, false),
        ));
        assert!(validate_classic_supply(&a).is_err());
        assert!(matches!(
            execute(&a, &[], None).outcome,
            Outcome::InvalidFixture(_)
        ));
    }
    #[test]
    fn native_exemption_requires_native_mint_and_lamport_backing() {
        let mut a = snapshot(0, 1);
        let mut t = TokenAccount::unpack(a[1].1.data()).unwrap();
        t.is_native = Some(1).into();
        TokenAccount::pack(t, a[1].1.data_as_mut_slice()).unwrap();
        assert_eq!(
            validate_classic_supply(&a).unwrap_err(),
            "Native exemption requires the native mint"
        );
        t.mint = "So11111111111111111111111111111111111111112"
            .parse()
            .unwrap();
        TokenAccount::pack(t, a[1].1.data_as_mut_slice()).unwrap();
        a[1].1.set_lamports(1);
        assert_eq!(
            validate_classic_supply(&a).unwrap_err(),
            "Unbacked native token fixture"
        );
        a[1].1.set_lamports(2);
        assert!(validate_classic_supply(&a).is_ok());
    }
    #[test]
    fn digest_binds_owner_balance_bytes_and_executable_independent_of_order() {
        let a = snapshot(100, 100);
        let hash = digest(&a);
        let mut reversed = a.clone();
        reversed.reverse();
        assert_eq!(digest(&reversed), hash);
        for mutation in 0..4 {
            let mut b = a.clone();
            match mutation {
                0 => b[0].1.set_lamports(1),
                1 => b[0].1.set_owner(crate::public(99)),
                2 => b[0].1.set_executable(true),
                _ => b[0].1.data_as_mut_slice()[0] ^= 1,
            }
            assert_ne!(digest(&b), hash);
        }
    }
    #[test]
    fn interruption_with_no_instructions_never_completes() {
        let a = snapshot(100, 100);
        let result = execute(&a, &[], Some(0));
        assert_eq!(result.outcome, Outcome::Interrupted(0));
        assert_eq!(result.committed, a);
    }
    #[test]
    #[should_panic(expected = "Duplicate fixture account identity")]
    fn duplicate_account_identity_rejected() {
        let mut a = snapshot(300, 100);
        a.push(a[1].clone());
        execute(&a, &[], None);
    }
}
