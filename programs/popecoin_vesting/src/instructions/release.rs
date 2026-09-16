use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

use crate::{
    constants::*,
    error::ErrorCode,
    state::VestingAccount,
};

#[derive(Accounts)]
pub struct Release<'info> {
    #[account(
        mut,
        seeds = [VESTING_SEED, vesting.beneficiary.as_ref(), vesting.mint.as_ref()],
        bump = vesting.bump
    )]
    pub vesting: Account<'info, VestingAccount>,

    #[account(
        mut,
        seeds = [VAULT_SEED, vesting.key().as_ref()],
        bump,
        constraint = vault.mint == mint.key(),
        constraint = vault.owner == vesting.key()
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = beneficiary.key() == vesting.beneficiary @ ErrorCode::Unauthorized
    )]
    pub beneficiary: Signer<'info>,

    #[account(
        address = vesting.mint
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = beneficiary_token_account.owner == beneficiary.key() @ ErrorCode::Unauthorized,
        constraint = beneficiary_token_account.mint == mint.key()
    )]
    pub beneficiary_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_release(ctx: Context<Release>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let vesting = &mut ctx.accounts.vesting;

    let vested_amount = if now < vesting.cliff_time {
        0
    } else if now >= vesting.end_time {
        vesting.total_amount
    } else {
        let elapsed = now
            .checked_sub(vesting.start_time)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        let duration = vesting
            .end_time
            .checked_sub(vesting.start_time)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        let vested = (vesting.total_amount as u128)
            .checked_mul(elapsed as u128)
            .ok_or(ErrorCode::ArithmeticOverflow)?
            .checked_div(duration as u128)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        vested as u64
    };

    let releasable = vested_amount
        .checked_sub(vesting.released_amount)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    require!(releasable > 0, ErrorCode::NothingToRelease);

    let seeds: &[&[u8]] = &[
        VESTING_SEED,
        vesting.beneficiary.as_ref(),
        vesting.mint.as_ref(),
        &[vesting.bump],
    ];

    let signer_seeds = &[seeds];

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.vault.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.beneficiary_token_account.to_account_info(),
        authority: vesting.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        cpi_accounts,
        signer_seeds,
    );

    token::transfer_checked(
        cpi_ctx,
        releasable,
        ctx.accounts.mint.decimals,
    )?;

    vesting.released_amount = vesting
        .released_amount
        .checked_add(releasable)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    msg!("Released {} POPE base units", releasable);

    Ok(())
}
