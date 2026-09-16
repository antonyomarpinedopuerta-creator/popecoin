use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{
    constants::*,
    error::ErrorCode,
    state::VestingAccount,
};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub authority: Signer<'info>,

    /// CHECK: El beneficiario solo se almacena como clave pública.
    pub beneficiary: UncheckedAccount<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        space = 8 + VestingAccount::INIT_SPACE,
        seeds = [VESTING_SEED, beneficiary.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub vesting: Account<'info, VestingAccount>,

    #[account(
        init,
        payer = payer,
        token::mint = mint,
        token::authority = vesting,
        seeds = [VAULT_SEED, vesting.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handle_initialize(
    ctx: Context<Initialize>,
    total_amount: u64,
    start_time: i64,
    cliff_time: i64,
    end_time: i64,
) -> Result<()> {
    require!(
        total_amount > 0,
        ErrorCode::InvalidSchedule
    );

    require!(
        start_time < end_time
            && start_time <= cliff_time
            && cliff_time <= end_time,
        ErrorCode::InvalidSchedule
    );

    let vesting = &mut ctx.accounts.vesting;

    vesting.authority = ctx.accounts.authority.key();
    vesting.beneficiary = ctx.accounts.beneficiary.key();
    vesting.mint = ctx.accounts.mint.key();
    vesting.total_amount = total_amount;
    vesting.released_amount = 0;
    vesting.start_time = start_time;
    vesting.cliff_time = cliff_time;
    vesting.end_time = end_time;
    vesting.bump = ctx.bumps.vesting;

    msg!("POPE vesting initialized");
    msg!("Total amount: {}", total_amount);

    Ok(())
}
