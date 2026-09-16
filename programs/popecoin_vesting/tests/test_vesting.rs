fn vested_amount(
    total_amount: u64,
    start_time: i64,
    cliff_time: i64,
    end_time: i64,
    now: i64,
) -> u64 {
    if now < cliff_time {
        return 0;
    }

    if now >= end_time {
        return total_amount;
    }

    let elapsed = now - start_time;
    let duration = end_time - start_time;

    ((total_amount as u128 * elapsed as u128) / duration as u128) as u64
}

#[test]
fn test_before_cliff() {
    let total = 3_000_000_000_000u64;
    assert_eq!(vested_amount(total, 100, 200, 300, 150), 0);
}

#[test]
fn test_at_cliff() {
    let total = 3_000_000_000_000u64;
    assert_eq!(
        vested_amount(total, 100, 200, 300, 200),
        1_500_000_000_000
    );
}

#[test]
fn test_halfway_after_cliff() {
    let total = 3_000_000_000_000u64;
    assert_eq!(
        vested_amount(total, 100, 200, 300, 250),
        2_250_000_000_000
    );
}

#[test]
fn test_at_end() {
    let total = 3_000_000_000_000u64;
    assert_eq!(
        vested_amount(total, 100, 200, 300, 300),
        3_000_000_000_000
    );
}

#[test]
fn test_after_end() {
    let total = 3_000_000_000_000u64;
    assert_eq!(
        vested_amount(total, 100, 200, 300, 500),
        3_000_000_000_000
    );
}
