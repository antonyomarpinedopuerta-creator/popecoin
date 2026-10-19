//! Host call to the unchanged contract's math. No runtime, accounts, signatures or network.
use std::io::{self, BufRead};
use popecoin_vesting::VestingAccount;

fn main() {
    for (index, line) in io::stdin().lock().lines().enumerate() {
        let line = line.unwrap();
        let values: Vec<&str> = line.split(',').collect();
        assert_eq!(values.len(), 5);
        let state = VestingAccount {
            authority: Default::default(), beneficiary: Default::default(), mint: Default::default(),
            total_amount: 1_000_000_000_000_000, released_amount: 0,
            start_time: values[0].parse().unwrap(), cliff_time: values[1].parse().unwrap(),
            end_time: values[2].parse().unwrap(), bump: 0,
        };
        let actual = state.vested_amount(values[3].parse().unwrap());
        let expected: u64 = values[4].parse().unwrap();
        assert_eq!(actual, expected, "native/TS mismatch at case {index}");
        println!("PARITY_CASE {index} {actual}");
    }
}
