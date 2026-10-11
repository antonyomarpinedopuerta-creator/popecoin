// Pure host arithmetic against the unchanged, vulnerable upstream dependency.
// No validator, signer, wallet, RPC or transaction. Findings are EXPECTED.
use ruint::aliases::{U256, U512};

#[test]
fn preserves_evidence_of_wrong_discarded_limb_flag() {
    let (value, flag) = U256::ONE.overflowing_shr(128);
    assert_eq!(value, U256::ZERO);
    assert!(!flag, "Pinned vulnerable version unexpectedly changed");
    // The mathematically correct flag is true: the nonzero low limb was lost.
    assert_eq!(U256::ONE.checked_shr(128), Some(U256::ZERO));
}

#[test]
fn bounded_left_shifts_used_by_reviewed_routes_are_exact() {
    for x in [0, 1, u64::MAX as u128, u128::MAX] {
        for shift in [64usize, 128] {
            let got = U256::from(x).checked_shl(shift).unwrap();
            let expected = U256::from(x).checked_mul(U256::from(2).pow(U256::from(shift))).unwrap();
            assert_eq!(got, expected);
            assert_eq!(got.div_rem(U256::from(2).pow(U256::from(shift))).0, U256::from(x));
        }
    }
}

#[test]
fn u512_floor_shift_values_remain_correct_when_flags_are_ignored() {
    for x in [0, 1, u64::MAX as u128, u128::MAX] {
        let prod = U512::from(x).checked_mul(U512::from(x)).unwrap();
        let divisor = U512::ONE << 128usize;
        assert_eq!(prod.overflowing_shr(128).0, prod.div_rem(divisor).0);
    }
}

#[test]
fn normalized_reciprocal_inputs_stay_inside_lookup_table() {
    // All nonzero divisors have a normalized top limb with bit 63 set.
    // Check boundaries of every possible lookup bucket without invoking UB.
    for bucket in 256u64..512 {
        for d in [bucket << 55, (bucket << 55) | ((1u64 << 55) - 1)] {
            assert!(d >= 1u64 << 63);
            assert!(((d >> 55) - 256) < 256);
            let _ = ruint::algorithms::div::reciprocal_mg10(d);
        }
    }
    for bit in 0..64 {
        let divisor = 1u64 << bit;
        let normalized = divisor << divisor.leading_zeros();
        assert!(normalized >= 1u64 << 63);
    }
}

#[test]
fn division_dispatch_handles_one_two_and_many_limb_divisors() {
    for divisor in [U512::ONE, U512::from(u64::MAX), U512::from(u128::MAX),
                    U512::ONE << 128usize, (U512::ONE << 255usize) + U512::ONE] {
        let numerator = U512::MAX;
        let (q, r) = numerator.div_rem(divisor);
        assert!(r < divisor);
        assert_eq!(q.checked_mul(divisor).unwrap().checked_add(r).unwrap(), numerator);
    }
}

#[test]
fn division_identity_across_every_normalization_boundary() {
    // Never call reciprocal_mg10 with a non-normalized low-level input.
    // Exercise Uint's normalization/dispatch for every U512 high-bit position.
    for bit in 0..512usize {
        let power = U512::ONE << bit;
        for divisor in [power, power.saturating_add(U512::ONE)] {
            let (q, r) = U512::MAX.div_rem(divisor);
            assert!(r < divisor);
            assert_eq!(q.checked_mul(divisor).unwrap().checked_add(r).unwrap(), U512::MAX);
        }
    }
}

#[test]
fn pinned_pool_amount_rounding_and_max_liquidity_conversion_boundary() {
    // Exact synthetic quote=100 profile exercised in SBF; no real market quote.
    let lo = U256::from(1_638_206_933_605_675_906u128);
    let hi = U256::from(2_837_457_642_316_645_099u128);
    let denominator = lo.checked_mul(hi).unwrap();
    let amount = |liquidity: U256| {
        let numerator = liquidity.checked_mul(hi.checked_sub(lo).unwrap()).unwrap();
        numerator.checked_add(denominator - U256::ONE).unwrap().div_rem(denominator).0
    };
    let reviewed = U256::from(3_876_039_221_566_836_409_435_171_622_711u128);
    assert_eq!(amount(reviewed), U256::from(1_000_000_000_000u64));
    assert!(amount(U256::from(u128::MAX)) > U256::from(u64::MAX));
    assert_eq!(amount(U256::ZERO), U256::ZERO);
}
