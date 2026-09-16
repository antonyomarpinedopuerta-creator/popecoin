use litesvm::LiteSVM;
use anchor_lang::prelude::Pubkey;

#[test]
fn test_program_loads() {
    let program_id = Pubkey::from_str_const(
        "BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc",
    );

    let mut svm = LiteSVM::new();

    let program = include_bytes!(
        "../../../target/deploy/popecoin_vesting.so"
    );

    svm.add_program(program_id, program).unwrap();

    assert!(svm.get_account(&program_id).is_some());
}
