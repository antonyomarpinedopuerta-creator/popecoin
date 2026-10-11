//! OFFLINE_FIXTURE_ONLY: prospective attributed escrow policy model, NOT a Solana program.
//! Caller IDs are synthetic authenticated inputs. No signatures, CPI, or legacy ownership proof.
#![forbid(unsafe_code)]
use std::collections::BTreeMap;

pub type PublicId = [u8; 32];
#[derive(Debug, PartialEq, Eq)]
pub enum Error {
    InvalidAmount,
    Overflow,
    Unauthorized,
    InsufficientCredit,
    InsufficientReserve,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Escrow {
    beneficiary: PublicId,
    total: u64,
    released: u64,
    balance: u64,
    reserved: u64,
    unattributed: u64,
    // Only explicit deposits create a credit; unsolicited tokens never do.
    credits: BTreeMap<PublicId, u64>,
}
impl Escrow {
    pub fn new(beneficiary: PublicId, total: u64) -> Result<Self, Error> {
        if total == 0 {
            return Err(Error::InvalidAmount);
        }
        Ok(Self {
            beneficiary,
            total,
            released: 0,
            balance: 0,
            reserved: 0,
            unattributed: 0,
            credits: BTreeMap::new(),
        })
    }
    pub fn remaining(&self) -> u64 {
        self.total - self.released
    }
    pub fn balance(&self) -> u64 {
        self.balance
    }
    pub fn credit(&self, donor: PublicId) -> u64 {
        *self.credits.get(&donor).unwrap_or(&0)
    }
    /// Models a deposit whose real future program must authenticate source owner,
    /// mint and successful transfer before writing its program-owned receipt.
    pub fn deposit(&mut self, donor: PublicId, amount: u64) -> Result<(), Error> {
        if amount == 0 {
            return Err(Error::InvalidAmount);
        }
        let balance = self.balance.checked_add(amount).ok_or(Error::Overflow)?;
        let assigned = amount.min(self.remaining() - self.reserved);
        let credit = self
            .credit(donor)
            .checked_add(amount - assigned)
            .ok_or(Error::Overflow)?;
        self.balance = balance;
        self.reserved += assigned;
        self.credits.insert(donor, credit);
        self.invariant();
        Ok(())
    }
    /// Models observation of direct SPL arrival; cannot invent its origin/owner.
    pub fn observe_unattributed(&mut self, amount: u64) -> Result<(), Error> {
        if amount == 0 {
            return Err(Error::InvalidAmount);
        }
        let balance = self.balance.checked_add(amount).ok_or(Error::Overflow)?;
        let unattributed = self
            .unattributed
            .checked_add(amount)
            .ok_or(Error::Overflow)?;
        self.balance = balance;
        self.unattributed = unattributed;
        self.invariant();
        Ok(())
    }
    /// Destination is fixed to recorded donor. There is deliberately no administrator
    /// argument or recipient override. In production, caller authentication is essential.
    pub fn refund(
        &mut self,
        caller: PublicId,
        donor: PublicId,
        amount: u64,
    ) -> Result<PublicId, Error> {
        if caller != donor {
            return Err(Error::Unauthorized);
        }
        if amount == 0 {
            return Err(Error::InvalidAmount);
        }
        let credit = self
            .credit(donor)
            .checked_sub(amount)
            .ok_or(Error::InsufficientCredit)?;
        let balance = self
            .balance
            .checked_sub(amount)
            .ok_or(Error::InsufficientReserve)?;
        if balance < self.remaining() {
            return Err(Error::InsufficientReserve);
        }
        self.balance = balance;
        self.credits.insert(donor, credit);
        self.invariant();
        Ok(donor)
    }
    /// Arithmetic-only release; caller supplies vested_total from a separately
    /// validated schedule. This prototype does not authenticate a Clock or schedule.
    pub fn release(&mut self, caller: PublicId, vested_total: u64) -> Result<u64, Error> {
        if caller != self.beneficiary {
            return Err(Error::Unauthorized);
        }
        if vested_total > self.total {
            return Err(Error::InvalidAmount);
        }
        let amount = vested_total
            .checked_sub(self.released)
            .ok_or(Error::InvalidAmount)?;
        if amount == 0 {
            return Err(Error::InvalidAmount);
        }
        let reserved = self
            .reserved
            .checked_sub(amount)
            .ok_or(Error::InsufficientReserve)?;
        let balance = self
            .balance
            .checked_sub(amount)
            .ok_or(Error::InsufficientReserve)?;
        self.reserved = reserved;
        self.balance = balance;
        self.released = vested_total;
        self.invariant();
        Ok(amount)
    }
    fn invariant(&self) {
        assert!(self.released <= self.total && self.reserved <= self.remaining());
        let credits: u128 = self.credits.values().map(|n| u128::from(*n)).sum();
        assert_eq!(
            u128::from(self.balance),
            u128::from(self.reserved) + u128::from(self.unattributed) + credits
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    const BENEFICIARY: PublicId = [1; 32];
    const DONOR: PublicId = [2; 32];
    const STRANGER: PublicId = [3; 32];
    fn model() -> Escrow {
        Escrow::new(BENEFICIARY, 100).unwrap()
    }
    fn unchanged<T: std::fmt::Debug>(
        s: &mut Escrow,
        action: impl FnOnce(&mut Escrow) -> Result<T, Error>,
        expected: Error,
    ) {
        let before = s.clone();
        assert_eq!(action(s).unwrap_err(), expected);
        assert_eq!(*s, before);
    }
    #[test]
    fn exact_funding_has_no_refund_credit() {
        let mut s = model();
        s.deposit(DONOR, 100).unwrap();
        assert_eq!(s.credit(DONOR), 0);
        unchanged(
            &mut s,
            |s| s.refund(DONOR, DONOR, 1),
            Error::InsufficientCredit,
        );
    }
    #[test]
    fn excess_returns_only_to_original_donor() {
        let mut s = model();
        s.deposit(DONOR, 110).unwrap();
        assert_eq!(s.credit(DONOR), 10);
        assert_eq!(s.refund(DONOR, DONOR, 10).unwrap(), DONOR);
        assert_eq!(s.balance(), 100);
        assert_eq!(s.release(BENEFICIARY, 100).unwrap(), 100);
    }
    #[test]
    fn no_administrator_or_beneficiary_can_take_donor_credit() {
        let mut s = model();
        s.deposit(DONOR, 110).unwrap();
        for caller in [STRANGER, BENEFICIARY] {
            unchanged(&mut s, |s| s.refund(caller, DONOR, 10), Error::Unauthorized);
        }
    }
    #[test]
    fn direct_arrivals_never_create_ownership_proof() {
        let mut s = model();
        s.deposit(DONOR, 100).unwrap();
        s.observe_unattributed(50).unwrap();
        unchanged(
            &mut s,
            |s| s.refund(DONOR, DONOR, 50),
            Error::InsufficientCredit,
        );
        s.release(BENEFICIARY, 100).unwrap();
        assert_eq!(s.balance(), 50);
    }
    #[test]
    fn multiple_donors_do_not_share_refund_credit() {
        let mut s = model();
        s.deposit(DONOR, 60).unwrap();
        s.deposit(STRANGER, 70).unwrap();
        assert_eq!(s.credit(DONOR), 0);
        assert_eq!(s.credit(STRANGER), 30);
        s.refund(STRANGER, STRANGER, 30).unwrap();
        assert_eq!(s.balance(), 100);
    }
    #[test]
    fn partial_release_preserves_credit_and_nominal_entitlement() {
        let mut s = model();
        s.deposit(DONOR, 110).unwrap();
        s.release(BENEFICIARY, 40).unwrap();
        s.refund(DONOR, DONOR, 10).unwrap();
        assert_eq!(s.balance(), 60);
        assert_eq!(s.remaining(), 60);
        s.release(BENEFICIARY, 100).unwrap();
        assert_eq!(s.balance(), 0);
    }
    #[test]
    fn repeats_and_overclaims_leave_state_unchanged() {
        let mut s = model();
        s.deposit(DONOR, 110).unwrap();
        unchanged(
            &mut s,
            |s| s.refund(DONOR, DONOR, 11),
            Error::InsufficientCredit,
        );
        s.refund(DONOR, DONOR, 10).unwrap();
        unchanged(
            &mut s,
            |s| s.refund(DONOR, DONOR, 1),
            Error::InsufficientCredit,
        );
        s.release(BENEFICIARY, 50).unwrap();
        unchanged(&mut s, |s| s.release(BENEFICIARY, 50), Error::InvalidAmount);
        unchanged(&mut s, |s| s.release(BENEFICIARY, 49), Error::InvalidAmount);
    }
    #[test]
    fn unfunded_release_and_wrong_beneficiary_rejected() {
        let mut s = model();
        s.deposit(DONOR, 40).unwrap();
        unchanged(
            &mut s,
            |s| s.release(BENEFICIARY, 100),
            Error::InsufficientReserve,
        );
        unchanged(&mut s, |s| s.release(DONOR, 40), Error::Unauthorized);
        unchanged(
            &mut s,
            |s| s.release(BENEFICIARY, 101),
            Error::InvalidAmount,
        );
    }
    #[test]
    fn u64_maximum_and_nine_decimal_founder_amount() {
        for total in [
            1_000_000_000_000_000u64,
            10_000_000_000_000_000_000,
            u64::MAX - 1,
        ] {
            let mut s = Escrow::new(BENEFICIARY, total).unwrap();
            s.deposit(DONOR, total + 1).unwrap();
            s.refund(DONOR, DONOR, 1).unwrap();
            s.release(BENEFICIARY, total).unwrap();
            assert_eq!(s.balance(), 0);
        }
        let mut s = Escrow::new(BENEFICIARY, u64::MAX).unwrap();
        s.deposit(DONOR, u64::MAX).unwrap();
        unchanged(&mut s, |s| s.deposit(DONOR, 1), Error::Overflow);
        unchanged(&mut s, |s| s.observe_unattributed(1), Error::Overflow);
    }
    #[test]
    fn bounded_interleavings_conserve_reserves_and_credit() {
        for a in 1..150u64 {
            for b in 1..150u64 {
                let mut s = model();
                s.deposit(DONOR, a).unwrap();
                s.deposit(STRANGER, b).unwrap();
                let funded = s.reserved;
                if funded > 0 {
                    s.release(BENEFICIARY, funded).unwrap();
                }
                for donor in [DONOR, STRANGER] {
                    let credit = s.credit(donor);
                    if credit > 0 {
                        s.refund(donor, donor, credit).unwrap();
                    }
                }
                assert_eq!(s.balance(), 0);
                assert_eq!(s.released, funded);
            }
        }
    }
}
