use anchor_lang::prelude::Pubkey;
use popecoin_vesting::VestingAccount;

fn vested_amount(
    total_amount: u64,
    start_time: i64,
    cliff_time: i64,
    end_time: i64,
    now: i64,
) -> u64 {
    VestingAccount {
        authority: Pubkey::default(),
        beneficiary: Pubkey::default(),
        mint: Pubkey::default(),
        total_amount,
        released_amount: 0,
        start_time,
        cliff_time,
        end_time,
        bump: 0,
    }
    .vested_amount(now)
}

#[test]
fn test_before_cliff() {
    let total = 3_000_000_000_000u64;
    assert_eq!(vested_amount(total, 100, 200, 300, 150), 0);
}

#[test]
fn test_at_cliff() {
    let total = 3_000_000_000_000u64;
    assert_eq!(vested_amount(total, 100, 200, 300, 200), 1_500_000_000_000);
}

#[test]
fn test_halfway_after_cliff() {
    let total = 3_000_000_000_000u64;
    assert_eq!(vested_amount(total, 100, 200, 300, 250), 2_250_000_000_000);
}

#[test]
fn test_at_end() {
    let total = 3_000_000_000_000u64;
    assert_eq!(vested_amount(total, 100, 200, 300, 300), 3_000_000_000_000);
}

#[test]
fn test_after_end() {
    let total = 3_000_000_000_000u64;
    assert_eq!(vested_amount(total, 100, 200, 300, 500), 3_000_000_000_000);
}

#[test]
fn test_full_timestamp_range_and_max_amount() {
    assert_eq!(
        vested_amount(u64::MAX, i64::MIN, i64::MIN, i64::MAX, 0),
        1u64 << 63
    );
    assert_eq!(
        vested_amount(u64::MAX, i64::MIN, i64::MIN, i64::MAX, i64::MIN),
        0
    );
    assert_eq!(
        vested_amount(u64::MAX, i64::MIN, i64::MIN, i64::MAX, i64::MAX),
        u64::MAX
    );
}

#[test]
fn test_rounding_and_one_unit_final_release() {
    assert_eq!(vested_amount(1, 0, 0, 3, 2), 0);
    assert_eq!(vested_amount(1, 0, 0, 3, 3), 1);
    assert_eq!(vested_amount(10, 0, 0, 3, 1), 3);
    assert_eq!(vested_amount(10, 0, 0, 3, 2), 6);
}

#[test]
fn test_cliff_at_end() {
    assert_eq!(vested_amount(100, -10, 10, 10, 9), 0);
    assert_eq!(vested_amount(100, -10, 10, 10, 10), 100);
}

#[test]
fn test_monotonic_bounded_accrual() {
    for total in [1, 3, 100, 3_000_000_000_000, u64::MAX] {
        for cliff in [-100, 0, 100] {
            let mut previous = 0;
            for now in -101..=101 {
                let current = vested_amount(total, -100, cliff, 100, now);
                assert!(current >= previous && current <= total);
                if now < cliff {
                    assert_eq!(current, 0);
                }
                previous = current;
            }
            assert_eq!(previous, total);
        }
    }
}

#[test]
fn test_wide_deterministic_schedules_preserve_floor_bounds_and_monotonicity() {
    let mut seed = 0x50415041_u64;
    let mut next = || {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        seed
    };
    for _ in 0..2048 {
        let a = next() as i64;
        let b = next() as i64;
        if a == b { continue; }
        let start = a.min(b);
        let end = a.max(b);
        let duration = (i128::from(end) - i128::from(start)) as u128;
        let cliff = (i128::from(start) + (u128::from(next()) % (duration + 1)) as i128) as i64;
        let total = next().max(1);
        let midpoint = (i128::from(start) + (duration / 2) as i128) as i64;
        let mut times = [i64::MIN, start, cliff.saturating_sub(1), cliff, midpoint, end.saturating_sub(1), end, i64::MAX];
        times.sort();
        let mut previous = 0;
        for now in times {
            let vested = vested_amount(total, start, cliff, end, now);
            assert!(vested >= previous && vested <= total);
            if now < cliff { assert_eq!(vested, 0); }
            else if now >= end { assert_eq!(vested, total); }
            else {
                let elapsed = (i128::from(now) - i128::from(start)) as u128;
                let numerator = u128::from(total) * elapsed;
                assert!(u128::from(vested) * duration <= numerator);
                assert!((u128::from(vested) + 1) * duration > numerator);
            }
            previous = vested;
        }
        assert_eq!(previous, total);
    }
}
