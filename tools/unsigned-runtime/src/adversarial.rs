//! Constraints tested against the compiled program, with synthetic public accounts.
use crate::{engine, initialize, public, token, PROGRAM};
use sha2::{Digest, Sha256};
use solana_account::{ReadableAccount, WritableAccount};
use solana_instruction::{error::InstructionError, AccountMeta, Instruction};
use solana_program_pack::Pack;
use solana_pubkey::Pubkey;
use spl_token_interface::state::{Account as TokenAccount, Mint};
use std::{path::Path, str::FromStr};

pub fn test(root: &Path, program_path: &Path) {
    let mut original = initialize(root, program_path, None);
    let program = Pubkey::from_str(PROGRAM).unwrap();
    let mint = public(10);
    let beneficiary = public(11);
    let authority = public(13);
    let dest = public(12);
    let (vesting, _) =
        Pubkey::find_program_address(&[b"vesting", beneficiary.as_ref(), mint.as_ref()], &program);
    let (vault, _) = Pubkey::find_program_address(&[b"vault", vesting.as_ref()], &program);
    original.iter_mut().find(|(k, _)| *k == vault).unwrap().1 = token(mint, vesting, 100, false);
    original.push((dest, token(mint, beneficiary, 0, false)));
    let mut othermint = vec![0; Mint::LEN];
    Mint::pack(
        Mint {
            is_initialized: true,
            decimals: 6,
            ..Mint::default()
        },
        &mut othermint,
    )
    .unwrap();
    original.push((
        public(77),
        crate::account(spl_token_interface::ID, othermint, false),
    ));
    original
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
    let instruction = Instruction {
        program_id: program,
        data: Sha256::digest(b"global:release")[..8].to_vec(),
        accounts: vec![
            AccountMeta::new(vesting, false),
            AccountMeta::new(vault, false),
            AccountMeta::new(beneficiary, true),
            AccountMeta::new_readonly(mint, false),
            AccountMeta::new(dest, false),
            AccountMeta::new_readonly(spl_token_interface::ID, false),
        ],
    };
    for label in [
        "wrongBeneficiary",
        "wrongMint",
        "substitutedVault",
        "vaultAuthority",
        "destinationOwner",
        "destinationMint",
        "stateOwner",
        "discriminator",
        "truncatedState",
        "bump",
        "releasedOverflow",
        "destinationOverflow",
        "readonlyState",
        "readonlyVault",
        "tokenProgram",
    ] {
        let mut accounts = original.clone();
        let mut ix = instruction.clone();
        let target = match label {
            "vaultAuthority" => vault,
            "destinationOwner" | "destinationMint" | "destinationOverflow" => dest,
            _ => vesting,
        };
        let a = &mut accounts.iter_mut().find(|(k, _)| *k == target).unwrap().1;
        match label {
            "wrongBeneficiary" => ix.accounts[2].pubkey = authority,
            "wrongMint" => ix.accounts[3].pubkey = public(77),
            "substitutedVault" => ix.accounts[1].pubkey = dest,
            "stateOwner" => a.set_owner(solana_sdk_ids::system_program::id()),
            "discriminator" => a.data_as_mut_slice()[0] ^= 255,
            "truncatedState" => {
                let truncated = a.data()[..9].to_vec();
                a.set_data_from_slice(&truncated);
            }
            "bump" => a.data_as_mut_slice()[144] ^= 1,
            "releasedOverflow" => {
                a.data_as_mut_slice()[112..120].copy_from_slice(&101u64.to_le_bytes())
            }
            "readonlyState" => ix.accounts[0].is_writable = false,
            "readonlyVault" => ix.accounts[1].is_writable = false,
            "tokenProgram" => ix.accounts[5].pubkey = solana_sdk_ids::system_program::id(),
            _ => {
                let mut t = TokenAccount::unpack(a.data()).unwrap();
                match label {
                    "vaultAuthority" | "destinationOwner" => t.owner = public(77),
                    "destinationMint" => t.mint = public(77),
                    "destinationOverflow" => t.amount = u64::MAX,
                    _ => unreachable!(),
                }
                TokenAccount::pack(t, a.data_as_mut_slice()).unwrap();
            }
        }
        let result = engine::execute(&accounts, &[ix], None);
        println!("ROBUSTO {label}: {:?}", result.outcome);
        if label == "destinationOverflow" {
            assert_eq!(
                result.outcome,
                engine::Outcome::InvalidFixture(
                    "Known classic token balances exceed mint supply".into()
                )
            );
            assert_eq!(result.committed, accounts);
            assert_eq!(result.consumed, 0);
            let raw = engine::execute_raw(&accounts, std::slice::from_ref(&instruction), None);
            assert_eq!(raw.outcome, engine::Outcome::Complete);
            assert_eq!(
                TokenAccount::unpack(
                    raw.staged
                        .iter()
                        .find(|(k, _)| *k == dest)
                        .unwrap()
                        .1
                        .data()
                )
                .unwrap()
                .amount,
                49
            );
            // Preserve evidence of the behavior on an impossible snapshot; it is NOT a reachable supply state.
            continue;
        }
        let code = match label {
            "wrongBeneficiary" | "destinationOwner" => 6000,
            "wrongMint" | "vaultAuthority" | "destinationMint" => 2003,
            "substitutedVault" => 2040,
            "stateOwner" => 3007,
            "discriminator" => 3002,
            "truncatedState" => 3003,
            "bump" => 2006,
            "releasedOverflow" => 6004,
            "readonlyState" | "readonlyVault" => 2000,
            "tokenProgram" => 3008,
            _ => panic!("Missing exact error expectation"),
        };
        assert_eq!(
            result.outcome,
            engine::Outcome::Failed(0, InstructionError::Custom(code))
        );
        assert_eq!(result.committed, accounts);
        // These rejection sites must not mutate even raw token or vesting bytes.
        assert_eq!(
            result.staged, accounts,
            "{label}: unexpected partial effect"
        );
    }
    println!("15 ROBUSTO adversarial SBF cases passed");
}
