use litesvm::LiteSVM;

#[test]
fn test_program_loads() {
    let program_id = popecoin_vesting::ID;

    let mut svm = LiteSVM::new();

    let program = include_bytes!(
        "../../../target/deploy/popecoin_vesting.so"
    );

    svm.add_program(program_id, program).unwrap();

    assert!(svm.get_account(&program_id).is_some());
}
