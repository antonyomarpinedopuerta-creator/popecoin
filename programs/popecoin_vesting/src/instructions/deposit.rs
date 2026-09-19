use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

use crate::{
    constants::*,
    error::ErrorCode,
    state::VestingAccount,
};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [
            VESTING_SEED,
            vesting.beneficiary.as_ref(),
            vesting.mint.as_ref()
        ],
        bump = vesting.bump,
        has_one = authority @ ErrorCode::Unauthorized,
        has_one = mint
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

    #[account(mut)]
    pub authority: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = authority_token_account.owner == authority.key()
            @ ErrorCode::Unauthorized,
        constraint = authority_token_account.mint == mint.key()
    )]
    pub authority_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(
        ctx.accounts.vesting.released_amount == 0,
        ErrorCode::InvalidDeposit
    );

    let total_amount = ctx.accounts.vesting.total_amount;
    let vault_amount = ctx.accounts.vault.amount;

    require!(
        vault_amount <= total_amount,
        ErrorCode::InvalidDeposit
    );

    let remaining_amount = total_amount
        .checked_sub(vault_amount)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    require!(
        remaining_amount > 0 && amount == remaining_amount,
        ErrorCode::InvalidDeposit
    );

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.authority_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.key(),
        cpi_accounts,
    );

    token::transfer_checked(
        cpi_ctx,
        amount,
        ctx.accounts.mint.decimals,
    )?;

    msg!(
        "Deposited {} PAPA base units; vault total is now {}",
        amount,
        total_amount
    );

    Ok(())
}
