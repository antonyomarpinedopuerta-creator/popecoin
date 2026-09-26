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

impl VestingAccount {
    /// Linear accrual from start, gated by the cliff; rounds down to base units.
    pub fn vested_amount(&self, now: i64) -> u64 {
        if now < self.cliff_time {
            return 0;
        }
        if now >= self.end_time {
            return self.total_amount;
        }

        // Initialize guarantees start <= cliff <= now < end here.
        // Widen BEFORE subtraction: valid i64 timestamps may span more than i64::MAX.
        // Both differences fit u64, so their product with total_amount fits u128.
        let elapsed = (i128::from(now) - i128::from(self.start_time)) as u128;
        let duration = (i128::from(self.end_time) - i128::from(self.start_time)) as u128;
        ((u128::from(self.total_amount) * elapsed) / duration) as u64
    }
}
