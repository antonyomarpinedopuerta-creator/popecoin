use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

use crate::{
    error::ErrorCode,
    state::VestingAccount,
};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vesting", vesting.beneficiary.as_ref(), vesting.mint.as_ref()],
        bump = vesting.bump,
        has_one = authority @ ErrorCode::Unauthorized,
        has_one = mint
    )]
    pub vesting: Account<'info, VestingAccount>,

    #[account(
        mut,
        seeds = [b"vault", vesting.key().as_ref()],
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
        constraint = authority_token_account.owner == authority.key() @ ErrorCode::Unauthorized,
        constraint = authority_token_account.mint == mint.key()
    )]
    pub authority_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(
        amount == ctx.accounts.vesting.total_amount,
        ErrorCode::InvalidDeposit
    );

    require!(
        ctx.accounts.vault.amount == 0,
        ErrorCode::InvalidDeposit
    );

    // El vesting solo puede financiarse una vez.
    // Si alguna cantidad ya fue liberada, no se permite
    // volver a depositar aunque la vault esté vacía.
    require!(
        ctx.accounts.vesting.released_amount == 0,
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

    msg!("Deposited {} POPE base units", amount);

    Ok(())
}
