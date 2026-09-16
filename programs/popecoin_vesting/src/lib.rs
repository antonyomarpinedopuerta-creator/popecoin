pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc");

#[program]
pub mod popecoin_vesting {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        total_amount: u64,
        start_time: i64,
        cliff_time: i64,
        end_time: i64,
    ) -> Result<()> {
        crate::instructions::initialize::handle_initialize(
            ctx,
            total_amount,
            start_time,
            cliff_time,
            end_time,
        )
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        crate::instructions::deposit::handle_deposit(ctx, amount)
    }

    pub fn release(ctx: Context<Release>) -> Result<()> {
        crate::instructions::release::handle_release(ctx)
    }
}
