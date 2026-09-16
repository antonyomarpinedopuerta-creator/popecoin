use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Invalid vesting schedule")]
    InvalidSchedule,

    #[msg("Nothing is available to release yet")]
    NothingToRelease,

    #[msg("Invalid deposit amount or vault already funded")]
    InvalidDeposit,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
