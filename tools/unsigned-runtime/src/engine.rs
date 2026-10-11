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
}
pub struct Execution {
    pub outcome: Outcome,
    pub committed: Accounts,
    /// Inspectable raw runtime effects, including effects before an instruction failed.
    pub staged: Accounts,
    pub consumed: u64,
    pub logs: Vec<String>,
}
pub fn execute(
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
