use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VestingAccount {
    pub authority: Pubkey,
    pub beneficiary: Pubkey,
    pub mint: Pubkey,
    pub total_amount: u64,
    pub released_amount: u64,
    pub start_time: i64,
    pub cliff_time: i64,
    pub end_time: i64,
    pub bump: u8,
}
