use anchor_lang::{
    AccountDeserialize,
    InstructionData,
    ToAccountMetas,
    prelude::Pubkey,
};
use litesvm::LiteSVM;
use solana_instruction::Instruction;
use solana_keypair::Keypair;
use solana_message::Message;
use solana_signer::Signer;
use solana_transaction::Transaction;
use solana_program_pack::Pack;
use solana_clock::Clock;
use spl_token_interface::state::{Mint, Account as TokenAccount};

use popecoin_vesting::{
    accounts,
    instruction,
    VestingAccount,
};


fn load_popecoin_program() -> (LiteSVM, Pubkey) {
    let program_id = Pubkey::from_str_const(
        "BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc"
    );

    let mut svm = LiteSVM::new();

    let program = include_bytes!(
        "../../../target/deploy/popecoin_vesting.so"
    );

    svm.add_program(program_id, program).unwrap();

    (svm, program_id)
}


struct VestingTestEnv {
    svm: LiteSVM,
    program_id: Pubkey,
    payer: Keypair,
    authority: Keypair,
    beneficiary: Keypair,
    mint: Keypair,
    authority_token: Keypair,
    vesting: Pubkey,
    vault: Pubkey,
    total_amount: u64,
}

impl VestingTestEnv {
    fn new() -> Self {
        let (mut svm, program_id) = load_popecoin_program();

        let payer = Keypair::new();
        let authority = Keypair::new();
        let beneficiary = Keypair::new();
        let mint = Keypair::new();
        let authority_token = Keypair::new();

        svm.airdrop(&payer.pubkey(), 10_000_000_000)
            .unwrap();

        let mint_len = Mint::LEN;

        let create_mint =
            solana_system_interface::instruction::create_account(
                &payer.pubkey(),
                &mint.pubkey(),
                svm.minimum_balance_for_rent_exemption(mint_len),
                mint_len as u64,
                &spl_token_interface::ID,
            );

        let initialize_mint =
            spl_token_interface::instruction::initialize_mint2(
                &spl_token_interface::ID,
                &mint.pubkey(),
                &authority.pubkey(),
                None,
                6,
            )
            .unwrap();

        let tx = Transaction::new_signed_with_payer(
            &[create_mint, initialize_mint],
            Some(&payer.pubkey()),
            &[&payer, &mint],
            svm.latest_blockhash(),
        );

        svm.send_transaction(tx).unwrap();

        let token_account_len = TokenAccount::LEN;

        let create_authority_token =
            solana_system_interface::instruction::create_account(
                &payer.pubkey(),
                &authority_token.pubkey(),
                svm.minimum_balance_for_rent_exemption(token_account_len),
                token_account_len as u64,
                &spl_token_interface::ID,
            );

        let initialize_authority_token =
            spl_token_interface::instruction::initialize_account3(
                &spl_token_interface::ID,
                &authority_token.pubkey(),
                &mint.pubkey(),
                &authority.pubkey(),
            )
            .unwrap();

        let tx = Transaction::new_signed_with_payer(
            &[create_authority_token, initialize_authority_token],
            Some(&payer.pubkey()),
            &[&payer, &authority_token],
            svm.latest_blockhash(),
        );

        svm.send_transaction(tx).unwrap();

        let total_amount: u64 = 3_000_000_000_000;

        let mint_to =
            spl_token_interface::instruction::mint_to(
                &spl_token_interface::ID,
                &mint.pubkey(),
                &authority_token.pubkey(),
                &authority.pubkey(),
                &[],
                total_amount,
            )
            .unwrap();

        let tx = Transaction::new_signed_with_payer(
            &[mint_to],
            Some(&payer.pubkey()),
            &[&payer, &authority],
            svm.latest_blockhash(),
        );

        svm.send_transaction(tx).unwrap();

        let (vesting, _) = Pubkey::find_program_address(
            &[
                b"vesting",
                beneficiary.pubkey().as_ref(),
                mint.pubkey().as_ref(),
            ],
            &program_id,
        );

        let (vault, _) = Pubkey::find_program_address(
            &[
                b"vault",
                vesting.as_ref(),
            ],
            &program_id,
        );

        Self {
            svm,
            program_id,
            payer,
            authority,
            beneficiary,
            mint,
            authority_token,
            vesting,
            vault,
            total_amount,
        }
    }
}


#[test]
fn test_vesting_test_env_creates_valid_accounts() {
    let env = VestingTestEnv::new();

    assert_ne!(env.program_id, Pubkey::default());
    assert_ne!(env.vesting, Pubkey::default());
    assert_ne!(env.vault, Pubkey::default());

    let mint_account = env
        .svm
        .get_account(&env.mint.pubkey())
        .expect("Mint no creado");

    let mint_state = Mint::unpack(&mint_account.data).unwrap();

    assert_eq!(mint_state.decimals, 6);
    assert_eq!(
        mint_state.mint_authority,
        Some(env.authority.pubkey()).into()
    );

    let authority_token_account = env
        .svm
        .get_account(&env.authority_token.pubkey())
        .expect("Token account no creada");

    let authority_token_state =
        TokenAccount::unpack(&authority_token_account.data).unwrap();

    assert_eq!(
        authority_token_state.owner,
        env.authority.pubkey()
    );

    assert_eq!(
        authority_token_state.mint,
        env.mint.pubkey()
    );

    assert_eq!(
        authority_token_state.amount,
        env.total_amount
    );

    println!("VestingTestEnv creado correctamente");
}


#[test]
fn test_deposit_rejects_prefunded_full_vault() {
    let mut env = VestingTestEnv::new();

    // Creamos la Vault mediante Initialize.
    let initialize_accounts = accounts::Initialize {
        payer: env.payer.pubkey(),
        authority: env.authority.pubkey(),
        beneficiary: env.beneficiary.pubkey(),
        mint: env.mint.pubkey(),
        vesting: env.vesting,
        vault: env.vault,
        token_program: anchor_spl::token::ID,
        system_program: anchor_lang::system_program::ID,
        rent: anchor_lang::prelude::rent::ID,
    };

    let initialize_data = instruction::Initialize {
        total_amount: env.total_amount,
        start_time: 1_000,
        cliff_time: 1_100,
        end_time: 2_000,
    };

    let initialize_ix = Instruction {
        program_id: env.program_id,
        accounts: initialize_accounts.to_account_metas(None),
        data: initialize_data.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[initialize_ix],
        Some(&env.payer.pubkey()),
        &[&env.payer, &env.authority, &env.beneficiary],
        env.svm.latest_blockhash(),
    );

    env.svm.send_transaction(tx).unwrap();

    // Un tercero/prefunder deposita TODO el saldo directamente en la Vault.
    let prefund_ix =
        spl_token_interface::instruction::transfer_checked(
            &spl_token_interface::ID,
            &env.authority_token.pubkey(),
            &env.mint.pubkey(),
            &env.vault,
            &env.authority.pubkey(),
            &[],
            env.total_amount,
            6,
        )
        .unwrap();

    env.svm.expire_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[prefund_ix],
        Some(&env.payer.pubkey()),
        &[&env.payer, &env.authority],
        env.svm.latest_blockhash(),
    );

    env.svm.send_transaction(tx).unwrap();

    let vault_account =
        env.svm.get_account(&env.vault).unwrap();

    let vault_state =
        TokenAccount::unpack(&vault_account.data).unwrap();

    assert_eq!(vault_state.amount, env.total_amount);

    // Intentamos ejecutar Deposit.
    // Como la Vault ya contiene exactamente el total,
    // no debe mover ningún token adicional.
    let deposit_accounts = accounts::Deposit {
        vesting: env.vesting,
        vault: env.vault,
        authority: env.authority.pubkey(),
        mint: env.mint.pubkey(),
        authority_token_account: env.authority_token.pubkey(),
        token_program: anchor_spl::token::ID,
    };

    let deposit_data = instruction::Deposit {
        amount: env.total_amount,
    };

    let deposit_ix = Instruction {
        program_id: env.program_id,
        accounts: deposit_accounts.to_account_metas(None),
        data: deposit_data.data(),
    };

    env.svm.expire_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[deposit_ix],
        Some(&env.payer.pubkey()),
        &[&env.payer, &env.authority],
        env.svm.latest_blockhash(),
    );

    let result = env.svm.send_transaction(tx);

    assert!(
        result.is_err(),
        "FALLO: Deposit permitió financiar nuevamente una Vault ya llena"
    );

    let vault_after =
        env.svm.get_account(&env.vault).unwrap();

    let vault_after_state =
        TokenAccount::unpack(&vault_after.data).unwrap();

    assert_eq!(
        vault_after_state.amount,
        env.total_amount
    );

    println!("Pre-funding total rechazado correctamente");
}

#[test]
fn test_popecoin_integration_setup() {
    // Programa POPE Vesting + entorno local de Solana
    let (mut svm, program_id) = load_popecoin_program();

    // Wallets FICTICIAS para la prueba
    let payer = Keypair::new();
    let authority = Keypair::new();
    let beneficiary = Keypair::new();

    // SOL ficticio
    svm.airdrop(&payer.pubkey(), 10_000_000_000)
        .unwrap();

    // Mint SPL ficticio de POPE
    let mint = Keypair::new();
    let mint_len = Mint::LEN;

    let create_mint =
        solana_system_interface::instruction::create_account(
            &payer.pubkey(),
            &mint.pubkey(),
            svm.minimum_balance_for_rent_exemption(mint_len),
            mint_len as u64,
            &spl_token_interface::ID,
        );

    let initialize_mint =
        spl_token_interface::instruction::initialize_mint2(
            &spl_token_interface::ID,
            &mint.pubkey(),
            &authority.pubkey(),
            None,
            6,
        )
        .unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[create_mint, initialize_mint],
        Some(&payer.pubkey()),
        &[&payer, &mint],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let mint_account =
        svm.get_account(&mint.pubkey()).unwrap();

    let mint_state =
        Mint::unpack(&mint_account.data).unwrap();

    assert_eq!(mint_state.decimals, 6);

    assert_eq!(
        mint_state.mint_authority,
        Some(authority.pubkey()).into()
    );


    println!("Mint POPE ficticio creado correctamente");

    // Cuenta SPL ficticia propiedad de authority
    let authority_token = Keypair::new();
    let token_account_len = TokenAccount::LEN;

    let create_authority_token =
        solana_system_interface::instruction::create_account(
            &payer.pubkey(),
            &authority_token.pubkey(),
            svm.minimum_balance_for_rent_exemption(token_account_len),
            token_account_len as u64,
            &spl_token_interface::ID,
        );

    let initialize_authority_token =
        spl_token_interface::instruction::initialize_account3(
            &spl_token_interface::ID,
            &authority_token.pubkey(),
            &mint.pubkey(),
            &authority.pubkey(),
        )
        .unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[create_authority_token, initialize_authority_token],
        Some(&payer.pubkey()),
        &[&payer, &authority_token],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    // Acuñamos exactamente 3,000,000 POPE ficticios
    let simulated_reserve: u64 = 3_000_000_000_000;

    let mint_to =
        spl_token_interface::instruction::mint_to(
            &spl_token_interface::ID,
            &mint.pubkey(),
            &authority_token.pubkey(),
            &authority.pubkey(),
            &[],
            simulated_reserve,
        )
        .unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[mint_to],
        Some(&payer.pubkey()),
        &[&payer, &authority],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    // Verificamos el saldo real dentro de LiteSVM
    let token_account =
        svm.get_account(&authority_token.pubkey()).unwrap();

    let token_state =
        TokenAccount::unpack(&token_account.data).unwrap();

    assert_eq!(token_state.mint, mint.pubkey());
    assert_eq!(token_state.owner, authority.pubkey());
    assert_eq!(token_state.amount, simulated_reserve);

    println!("3,000,000 POPE ficticios acuñados correctamente");

    // PDA del vesting:
    // ["vesting", beneficiary, mint]
    let (vesting, _vesting_bump) =
        Pubkey::find_program_address(
            &[
                b"vesting",
                beneficiary.pubkey().as_ref(),
                mint.pubkey().as_ref(),
            ],
            &program_id,
        );

    // PDA de la vault
    let (vault, _vault_bump) =
        Pubkey::find_program_address(
            &[
                b"vault",
                vesting.as_ref(),
            ],
            &program_id,
        );

    // 3,000,000 POPE con 6 decimales
    let total_amount: u64 = 3_000_000_000_000;

    assert_eq!(
        total_amount,
        3_000_000 * 1_000_000
    );

    // Las wallets deben ser distintas
    assert_ne!(
        payer.pubkey(),
        authority.pubkey()
    );

    assert_ne!(
        authority.pubkey(),
        beneficiary.pubkey()
    );

    // Las PDAs deben ser válidas
    assert_ne!(
        vesting,
        Pubkey::default()
    );

    assert_ne!(
        vault,
        Pubkey::default()
    );

    // Construimos la instrucción Initialize
    let initialize_accounts = accounts::Initialize {
        payer: payer.pubkey(),
        authority: authority.pubkey(),
        beneficiary: beneficiary.pubkey(),
        mint: mint.pubkey(),
        vesting,
        vault,
        token_program: anchor_spl::token::ID,
        system_program: anchor_lang::system_program::ID,
        rent: anchor_lang::prelude::rent::ID,
    };

    let initialize_data = instruction::Initialize {
        total_amount,
        start_time: 1_000,
        cliff_time: 1_100,
        end_time: 2_000,
    };

    let ix = Instruction {
        program_id,
        accounts: initialize_accounts.to_account_metas(None),
        data: initialize_data.data(),
    };

    // Comprobamos que Anchor generó correctamente la instrucción
    assert!(!ix.accounts.is_empty());
    assert!(!ix.data.is_empty());

    // Ejecutamos realmente Initialize dentro de LiteSVM.
    // Payer paga la creación de las cuentas y authority también firma.
    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[&payer, &authority, &beneficiary],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    // Comprobamos que el programa creó realmente las dos PDAs.
    let vesting_account = svm
        .get_account(&vesting)
        .expect("Initialize no creó la cuenta Vesting");

    let vault_account = svm
        .get_account(&vault)
        .expect("Initialize no creó la Vault");

    assert_eq!(vesting_account.owner, program_id);
    assert_eq!(vault_account.owner, spl_token_interface::ID);

    // La Vault debe ser una cuenta SPL vacía en este momento.
    let vault_state =
        TokenAccount::unpack(&vault_account.data).unwrap();

    assert_eq!(vault_state.mint, mint.pubkey());
    assert_eq!(vault_state.owner, vesting);
    assert_eq!(vault_state.amount, 0);

    println!("Initialize ejecutado correctamente");
    println!("Vesting PDA creada correctamente");

    println!("Vault SPL creada correctamente con saldo 0");


    // PRUEBA DE SEGURIDAD:
    // Intentamos inicializar por segunda vez exactamente
    // el mismo vesting (mismo beneficiary + mint).
    // Las PDAs ya existen, por lo que debe ser rechazado.
    let duplicate_initialize_accounts = accounts::Initialize {
        payer: payer.pubkey(),
        authority: authority.pubkey(),
        beneficiary: beneficiary.pubkey(),
        mint: mint.pubkey(),
        vesting,
        vault,
        token_program: anchor_spl::token::ID,
        system_program: anchor_lang::system_program::ID,
        rent: anchor_lang::prelude::rent::ID,
    };

    let duplicate_initialize_data = instruction::Initialize {
        total_amount,
        start_time: 1_000,
        cliff_time: 1_100,
        end_time: 2_000,
    };

    let duplicate_initialize_ix = Instruction {
        program_id,
        accounts: duplicate_initialize_accounts.to_account_metas(None),
        data: duplicate_initialize_data.data(),
    };

    svm.expire_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[duplicate_initialize_ix],
        Some(&payer.pubkey()),
        &[&payer, &authority, &beneficiary],
        svm.latest_blockhash(),
    );

    let duplicate_initialize_result = svm.send_transaction(tx);

    assert!(
        duplicate_initialize_result.is_err(),
        "FALLO DE SEGURIDAD: se permitió inicializar dos veces el mismo vesting"
    );

    // Las cuentas originales deben seguir existiendo e intactas.
    let vesting_after_duplicate =
        svm.get_account(&vesting).unwrap();

    let vault_after_duplicate =
        svm.get_account(&vault).unwrap();

    let vault_state_after_duplicate =
        TokenAccount::unpack(&vault_after_duplicate.data).unwrap();

    assert_eq!(vesting_after_duplicate.owner, program_id);
    assert_eq!(vault_state_after_duplicate.amount, 0);
    assert_eq!(vault_state_after_duplicate.owner, vesting);
    assert_eq!(vault_state_after_duplicate.mint, mint.pubkey());

    println!("Segunda inicialización del mismo vesting rechazada correctamente");
    println!("Vesting PDA y Vault originales permanecen intactas");

    // PRUEBA DE SEGURIDAD:
    // intentamos depositar una cantidad distinta al total del vesting.
    let wrong_deposit_accounts = accounts::Deposit {
        vesting,
        vault,
        authority: authority.pubkey(),
        mint: mint.pubkey(),
        authority_token_account: authority_token.pubkey(),
        token_program: anchor_spl::token::ID,
    };

    let wrong_deposit_data = instruction::Deposit {
        amount: total_amount - 1,
    };

    let wrong_deposit_ix = Instruction {
        program_id,
        accounts: wrong_deposit_accounts.to_account_metas(None),
        data: wrong_deposit_data.data(),
    };

    svm.expire_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[wrong_deposit_ix],
        Some(&payer.pubkey()),
        &[&payer, &authority],
        svm.latest_blockhash(),
    );

    let wrong_deposit_result = svm.send_transaction(tx);

    assert!(
        wrong_deposit_result.is_err(),
        "FALLO DE SEGURIDAD: se aceptó un depósito incorrecto"
    );

    // Confirmamos que el intento fallido no movió tokens.
    let authority_after_wrong_deposit =
        svm.get_account(&authority_token.pubkey()).unwrap();

    let authority_state_after_wrong_deposit =
        TokenAccount::unpack(
            &authority_after_wrong_deposit.data
        ).unwrap();

    let vault_after_wrong_deposit =
        svm.get_account(&vault).unwrap();

    let vault_state_after_wrong_deposit =
        TokenAccount::unpack(
            &vault_after_wrong_deposit.data
        ).unwrap();

    assert_eq!(
        authority_state_after_wrong_deposit.amount,
        total_amount
    );

    assert_eq!(
        vault_state_after_wrong_deposit.amount,
        0
    );

    println!("Depósito con cantidad incorrecta rechazado correctamente");
    println!("Authority conserva 3,000,000 POPE");
    println!("Vault conserva 0 POPE");

    // PRUEBA DE SEGURIDAD:
    // una wallet distinta intenta hacerse pasar por authority.
    let fake_authority = Keypair::new();

    let fake_authority_deposit_accounts = accounts::Deposit {
        vesting,
        vault,
        authority: fake_authority.pubkey(),
        mint: mint.pubkey(),
        authority_token_account: authority_token.pubkey(),
        token_program: anchor_spl::token::ID,
    };

    let fake_authority_deposit_data = instruction::Deposit {
        amount: total_amount,
    };

    let fake_authority_deposit_ix = Instruction {
        program_id,
        accounts: fake_authority_deposit_accounts.to_account_metas(None),
        data: fake_authority_deposit_data.data(),
    };

    svm.expire_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[fake_authority_deposit_ix],
        Some(&payer.pubkey()),
        &[&payer, &fake_authority],
        svm.latest_blockhash(),
    );

    let fake_authority_result = svm.send_transaction(tx);

    assert!(
        fake_authority_result.is_err(),
        "FALLO DE SEGURIDAD: una authority falsa pudo depositar"
    );

    // El ataque fallido no debe haber movido ningún token.
    let authority_after_fake =
        svm.get_account(&authority_token.pubkey()).unwrap();

    let authority_state_after_fake =
        TokenAccount::unpack(&authority_after_fake.data).unwrap();

    let vault_after_fake =
        svm.get_account(&vault).unwrap();

    let vault_state_after_fake =
        TokenAccount::unpack(&vault_after_fake.data).unwrap();

    assert_eq!(authority_state_after_fake.amount, total_amount);
    assert_eq!(vault_state_after_fake.amount, 0);

    println!("Authority falsa rechazada correctamente");
    println!("Ningún POPE fue movido por la wallet no autorizada");

    // PRUEBA DE SEGURIDAD: pre-funding del Vault.
    // Un tercero puede transferir tokens SPL directamente a una cuenta token.
    // Simulamos que 1 unidad mínima llega al Vault antes del depósito oficial.
    // Esto no debe bloquear permanentemente el vesting.
    svm.expire_blockhash();

    let prefund_ix =
        spl_token_interface::instruction::transfer_checked(
            &spl_token_interface::ID,
            &authority_token.pubkey(),
            &mint.pubkey(),
            &vault,
            &authority.pubkey(),
            &[],
            1,
            6,
        )
        .unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[prefund_ix],
        Some(&payer.pubkey()),
        &[&payer, &authority],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let vault_prefunded =
        svm.get_account(&vault).unwrap();

    let vault_prefunded_state =
        TokenAccount::unpack(&vault_prefunded.data).unwrap();

    assert_eq!(vault_prefunded_state.amount, 1);

    println!("Pre-funding simulado: Vault recibió 1 unidad antes del depósito");

    // El programa debe calcular el saldo faltante y depositar únicamente
    // total_amount - saldo_actual.
    let deposit_accounts = accounts::Deposit {
        vesting,
        vault,
        authority: authority.pubkey(),
        mint: mint.pubkey(),
        authority_token_account: authority_token.pubkey(),
        token_program: anchor_spl::token::ID,
    };

    let deposit_data = instruction::Deposit {
        amount: total_amount - 1,
    };

    let deposit_ix = Instruction {
        program_id,
        accounts: deposit_accounts.to_account_metas(None),
        data: deposit_data.data(),
    };

    svm.expire_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[deposit_ix],
        Some(&payer.pubkey()),
        &[&payer, &authority],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    // Verificamos los saldos después del depósito
    let authority_token_after =
        svm.get_account(&authority_token.pubkey()).unwrap();

    let authority_state_after =
        TokenAccount::unpack(&authority_token_after.data).unwrap();

    let vault_after =
        svm.get_account(&vault).unwrap();

    let vault_state_after =
        TokenAccount::unpack(&vault_after.data).unwrap();

    assert_eq!(authority_state_after.amount, 0);
    assert_eq!(vault_state_after.amount, total_amount);

    println!("Deposit ejecutado correctamente");
    println!("Authority: 0 POPE");


    println!("Vault: 3,000,000 POPE ficticios");

    // PRUEBA DE SEGURIDAD:
    // intentamos realizar un segundo depósito mientras
    // la Vault ya contiene el total del vesting.

    // Damos nuevamente POPE ficticios a authority para
    // que el rechazo no se deba a falta de saldo.
    let remint_second_deposit_ix =
        spl_token_interface::instruction::mint_to(
            &anchor_spl::token::ID,
            &mint.pubkey(),
            &authority_token.pubkey(),
            &authority.pubkey(),
            &[],
            total_amount,
        ).unwrap();

    svm.expire_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[remint_second_deposit_ix],
        Some(&payer.pubkey()),
        &[&payer, &authority],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let second_deposit_accounts = accounts::Deposit {
        vesting,
        vault,
        authority: authority.pubkey(),
        mint: mint.pubkey(),
        authority_token_account: authority_token.pubkey(),
        token_program: anchor_spl::token::ID,
    };

    let second_deposit_data = instruction::Deposit {
        amount: total_amount,
    };

    let second_deposit_ix = Instruction {
        program_id,
        accounts: second_deposit_accounts.to_account_metas(None),
        data: second_deposit_data.data(),
    };

    svm.expire_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[second_deposit_ix],
        Some(&payer.pubkey()),
        &[&payer, &authority],
        svm.latest_blockhash(),
    );

    let second_deposit_result = svm.send_transaction(tx);

    assert!(
        second_deposit_result.is_err(),
        "FALLO DE SEGURIDAD: se permitió un segundo depósito"
    );

    let authority_after_second_deposit =
        svm.get_account(&authority_token.pubkey()).unwrap();

    let authority_state_after_second_deposit =
        TokenAccount::unpack(
            &authority_after_second_deposit.data
        ).unwrap();

    let vault_after_second_deposit =
        svm.get_account(&vault).unwrap();

    let vault_state_after_second_deposit =
        TokenAccount::unpack(
            &vault_after_second_deposit.data
        ).unwrap();

    assert_eq!(
        authority_state_after_second_deposit.amount,
        total_amount
    );

    assert_eq!(
        vault_state_after_second_deposit.amount,
        total_amount
    );

    println!("Segundo depósito rechazado correctamente");
    println!("Authority conserva 3,000,000 POPE de prueba");
    println!("Vault permanece en 3,000,000 POPE");

    // Creamos la cuenta SPL del beneficiario.
    // Debe comenzar con 0 POPE.
    let beneficiary_token = Keypair::new();

    let create_beneficiary_token =
        solana_system_interface::instruction::create_account(
            &payer.pubkey(),
            &beneficiary_token.pubkey(),
            svm.minimum_balance_for_rent_exemption(TokenAccount::LEN),
            TokenAccount::LEN as u64,
            &spl_token_interface::ID,
        );

    let initialize_beneficiary_token =
        spl_token_interface::instruction::initialize_account3(
            &spl_token_interface::ID,
            &beneficiary_token.pubkey(),
            &mint.pubkey(),
            &beneficiary.pubkey(),
        )
        .unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[create_beneficiary_token, initialize_beneficiary_token],
        Some(&payer.pubkey()),
        &[&payer, &beneficiary_token],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let beneficiary_account =
        svm.get_account(&beneficiary_token.pubkey()).unwrap();

    let beneficiary_state =
        TokenAccount::unpack(&beneficiary_account.data).unwrap();

    assert_eq!(beneficiary_state.mint, mint.pubkey());
    assert_eq!(beneficiary_state.owner, beneficiary.pubkey());
    assert_eq!(beneficiary_state.amount, 0);

    println!("Cuenta SPL del beneficiario creada correctamente");

    println!("Beneficiario: 0 POPE");

    // Colocamos el reloj antes del cliff.
    // start = 1000, cliff = 1100, ahora = 1050.
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = 1_050;
    svm.set_sysvar(&clock);

    let clock_check = svm.get_sysvar::<Clock>();
    assert_eq!(clock_check.unix_timestamp, 1_050);

    println!("Reloj LiteSVM configurado en 1050");

    println!("Estamos antes del cliff 1100");

    // Intentamos Release ANTES del cliff.
    // Debe fallar porque todavía no hay POPE disponibles.
    let release_accounts = accounts::Release {
        vesting,
        vault,
        beneficiary: beneficiary.pubkey(),
        mint: mint.pubkey(),
        beneficiary_token_account: beneficiary_token.pubkey(),
        token_program: anchor_spl::token::ID,
    };

    let release_data = instruction::Release {};

    let release_ix = Instruction {
        program_id,
        accounts: release_accounts.to_account_metas(None),
        data: release_data.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[release_ix],
        Some(&payer.pubkey()),
        &[&payer, &beneficiary],
        svm.latest_blockhash(),
    );

    let release_before_cliff = svm.send_transaction(tx);

    assert!(
        release_before_cliff.is_err(),
        "ERROR: Release permitió retirar antes del cliff"
    );

    // Confirmamos que ningún token se movió.
    let vault_before_cliff =
        svm.get_account(&vault).unwrap();

    let vault_state_before_cliff =
        TokenAccount::unpack(&vault_before_cliff.data).unwrap();

    let beneficiary_before_cliff =
        svm.get_account(&beneficiary_token.pubkey()).unwrap();

    let beneficiary_state_before_cliff =
        TokenAccount::unpack(&beneficiary_before_cliff.data).unwrap();

    assert_eq!(vault_state_before_cliff.amount, total_amount);
    assert_eq!(beneficiary_state_before_cliff.amount, 0);

    println!("Release antes del cliff rechazado correctamente");
    println!("Vault conserva 3,000,000 POPE");


    println!("Beneficiario conserva 0 POPE");

    // PRUEBA DE SEGURIDAD:
    // una wallet distinta intenta hacerse pasar por el beneficiario.
    let attacker = Keypair::new();

    let attacker_release_accounts = accounts::Release {
        vesting,
        vault,
        beneficiary: attacker.pubkey(),
        mint: mint.pubkey(),
        beneficiary_token_account: beneficiary_token.pubkey(),
        token_program: anchor_spl::token::ID,
    };

    let attacker_release_data = instruction::Release {};

    let attacker_release_ix = Instruction {
        program_id,
        accounts: attacker_release_accounts.to_account_metas(None),
        data: attacker_release_data.data(),
    };

    svm.expire_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[attacker_release_ix],
        Some(&payer.pubkey()),
        &[&payer, &attacker],
        svm.latest_blockhash(),
    );

    let attacker_result = svm.send_transaction(tx);

    assert!(
        attacker_result.is_err(),
        "FALLO DE SEGURIDAD: una wallet no autorizada pudo ejecutar Release"
    );

    // Confirmamos que el ataque no movió ningún POPE.
    let vault_after_attack =
        svm.get_account(&vault).unwrap();

    let vault_state_after_attack =
        TokenAccount::unpack(&vault_after_attack.data).unwrap();

    let beneficiary_after_attack =
        svm.get_account(&beneficiary_token.pubkey()).unwrap();

    let beneficiary_state_after_attack =
        TokenAccount::unpack(&beneficiary_after_attack.data).unwrap();

    assert_eq!(vault_state_after_attack.amount, total_amount);
    assert_eq!(beneficiary_state_after_attack.amount, 0);

    println!("Ataque con wallet no autorizada rechazado correctamente");
    println!("Ningún POPE fue robado");

    // Avanzamos el reloj hasta 1500.
    // Vesting esperado:
    // 3,000,000 * (1500-1000)/(2000-1000)
    // = 1,500,000 POPE.
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = 1_500;
    svm.set_sysvar(&clock);

    // Generamos un blockhash nuevo para la siguiente transacción.
    svm.expire_blockhash();

    let clock_check = svm.get_sysvar::<Clock>();
    assert_eq!(clock_check.unix_timestamp, 1_500);

    // PRUEBA DE SEGURIDAD:
    // El beneficiario legítimo intenta retirar hacia una cuenta SPL
    // que pertenece a otra wallet. Debe ser rechazado.
    let wrong_owner = Keypair::new();
    let wrong_destination = Keypair::new();

    let create_wrong_destination =
        solana_system_interface::instruction::create_account(
            &payer.pubkey(),
            &wrong_destination.pubkey(),
            svm.minimum_balance_for_rent_exemption(TokenAccount::LEN),
            TokenAccount::LEN as u64,
            &spl_token_interface::ID,
        );

    let initialize_wrong_destination =
        spl_token_interface::instruction::initialize_account3(
            &spl_token_interface::ID,
            &wrong_destination.pubkey(),
            &mint.pubkey(),
            &wrong_owner.pubkey(),
        )
        .unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[create_wrong_destination, initialize_wrong_destination],
        Some(&payer.pubkey()),
        &[&payer, &wrong_destination],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    svm.expire_blockhash();

    let wrong_release_accounts = accounts::Release {
        vesting,
        vault,
        beneficiary: beneficiary.pubkey(),
        mint: mint.pubkey(),
        beneficiary_token_account: wrong_destination.pubkey(),
        token_program: anchor_spl::token::ID,
    };

    let wrong_release_data = instruction::Release {};

    let wrong_release_ix = Instruction {
        program_id,
        accounts: wrong_release_accounts.to_account_metas(None),
        data: wrong_release_data.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[wrong_release_ix],
        Some(&payer.pubkey()),
        &[&payer, &beneficiary],
        svm.latest_blockhash(),
    );

    let wrong_destination_result = svm.send_transaction(tx);

    assert!(
        wrong_destination_result.is_err(),
        "FALLO DE SEGURIDAD: Release permitió una cuenta SPL de otra wallet"
    );

    // Comprobamos que el intento fallido no movió POPE.
    let vault_after_wrong_destination =
        svm.get_account(&vault).unwrap();

    let vault_state_after_wrong_destination =
        TokenAccount::unpack(&vault_after_wrong_destination.data).unwrap();

    let wrong_destination_after =
        svm.get_account(&wrong_destination.pubkey()).unwrap();

    let wrong_destination_state =
        TokenAccount::unpack(&wrong_destination_after.data).unwrap();

    assert_eq!(vault_state_after_wrong_destination.amount, total_amount);
    assert_eq!(wrong_destination_state.amount, 0);

    println!("Cuenta SPL de otra wallet rechazada correctamente");
    println!("Vault conserva 3,000,000 POPE y destino incorrecto conserva 0");

    svm.expire_blockhash();

    let release_accounts = accounts::Release {
        vesting,
        vault,
        beneficiary: beneficiary.pubkey(),
        mint: mint.pubkey(),
        beneficiary_token_account: beneficiary_token.pubkey(),
        token_program: anchor_spl::token::ID,
    };

    let release_data = instruction::Release {};

    let release_ix = Instruction {
        program_id,
        accounts: release_accounts.to_account_metas(None),
        data: release_data.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[release_ix],
        Some(&payer.pubkey()),
        &[&payer, &beneficiary],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    // Comprobamos los saldos reales después de Release.
    let vault_at_1500 =
        svm.get_account(&vault).unwrap();

    let vault_state_at_1500 =
        TokenAccount::unpack(&vault_at_1500.data).unwrap();

    let beneficiary_at_1500 =
        svm.get_account(&beneficiary_token.pubkey()).unwrap();

    let beneficiary_state_at_1500 =
        TokenAccount::unpack(&beneficiary_at_1500.data).unwrap();

    let half: u64 = 1_500_000_000_000;

    assert_eq!(beneficiary_state_at_1500.amount, half);
    assert_eq!(vault_state_at_1500.amount, half);

    // Verificamos también el estado interno del contrato.
    let vesting_account_at_1500 =
        svm.get_account(&vesting).unwrap();

    let vesting_state_at_1500 =
        VestingAccount::try_deserialize(
            &mut &vesting_account_at_1500.data[..]
        ).unwrap();

    assert_eq!(vesting_state_at_1500.released_amount, half);

    println!("Estado interno released_amount = 1,500,000 POPE correcto");
    println!("Release en 1500 ejecutado correctamente");
    println!("Beneficiario recibió 1,500,000 POPE");

    println!("Vault conserva 1,500,000 POPE");

    // Avanzamos hasta el final del vesting: 2000.
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = 2_000;
    svm.set_sysvar(&clock);

    svm.expire_blockhash();

    let clock_check = svm.get_sysvar::<Clock>();
    assert_eq!(clock_check.unix_timestamp, 2_000);

    let release_accounts = accounts::Release {
        vesting,
        vault,
        beneficiary: beneficiary.pubkey(),
        mint: mint.pubkey(),
        beneficiary_token_account: beneficiary_token.pubkey(),
        token_program: anchor_spl::token::ID,
    };

    let release_data = instruction::Release {};

    let release_ix = Instruction {
        program_id,
        accounts: release_accounts.to_account_metas(None),
        data: release_data.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[release_ix],
        Some(&payer.pubkey()),
        &[&payer, &beneficiary],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    // Verificamos el estado final.
    let vault_final =
        svm.get_account(&vault).unwrap();

    let vault_state_final =
        TokenAccount::unpack(&vault_final.data).unwrap();

    let beneficiary_final =
        svm.get_account(&beneficiary_token.pubkey()).unwrap();

    let beneficiary_state_final =
        TokenAccount::unpack(&beneficiary_final.data).unwrap();

    assert_eq!(vault_state_final.amount, 0);
    assert_eq!(beneficiary_state_final.amount, total_amount);

    // Verificamos el estado interno final del vesting.
    let vesting_account_final =
        svm.get_account(&vesting).unwrap();

    let vesting_state_final =
        VestingAccount::try_deserialize(
            &mut &vesting_account_final.data[..]
        ).unwrap();

    assert_eq!(vesting_state_final.released_amount, total_amount);

    println!("Estado interno released_amount = 3,000,000 POPE correcto");
    println!("Release final en 2000 ejecutado correctamente");
    println!("Beneficiario acumuló 3,000,000 POPE");

    println!("Vault terminó con 0 POPE");

    // PRUEBA DE SEGURIDAD:
    // intentamos ejecutar Release otra vez después
    // de haber liberado el 100% del vesting.
    svm.expire_blockhash();

    let second_release_accounts = accounts::Release {
        vesting,
        vault,
        beneficiary: beneficiary.pubkey(),
        mint: mint.pubkey(),
        beneficiary_token_account: beneficiary_token.pubkey(),
        token_program: anchor_spl::token::ID,
    };

    let second_release_data = instruction::Release {};

    let second_release_ix = Instruction {
        program_id,
        accounts: second_release_accounts.to_account_metas(None),
        data: second_release_data.data(),
    };

    let tx = Transaction::new_signed_with_payer(
        &[second_release_ix],
        Some(&payer.pubkey()),
        &[&payer, &beneficiary],
        svm.latest_blockhash(),
    );

    let second_release_result = svm.send_transaction(tx);

    assert!(
        second_release_result.is_err(),
        "FALLO DE SEGURIDAD: se permitió cobrar dos veces"
    );

    // Verificamos que los saldos sigan intactos.
    let vault_after_second_release =
        svm.get_account(&vault).unwrap();

    let vault_state_after_second_release =
        TokenAccount::unpack(
            &vault_after_second_release.data
        ).unwrap();

    let beneficiary_after_second_release =
        svm.get_account(&beneficiary_token.pubkey()).unwrap();

    let beneficiary_state_after_second_release =
        TokenAccount::unpack(
            &beneficiary_after_second_release.data
        ).unwrap();

    assert_eq!(vault_state_after_second_release.amount, 0);
    assert_eq!(
        beneficiary_state_after_second_release.amount,
        total_amount
    );

    println!("Doble retiro rechazado correctamente");
    println!("Beneficiario sigue con 3,000,000 POPE");
    println!("Vault sigue con 0 POPE");

    // PRUEBA DE SEGURIDAD:
    // intentamos volver a financiar el mismo vesting después
    // de que ya terminó y liberó el 100%.
    //
    // Primero damos nuevamente tokens ficticios a authority
    // para asegurarnos de que el rechazo venga del contrato
    // y no de una falta de saldo.

    // Authority ya conserva 3,000,000 POPE de la prueba
    // de segundo depósito. No necesitamos acuñar otros 3M.
    let authority_refunded =
        svm.get_account(&authority_token.pubkey()).unwrap();

    let authority_refunded_state =
        TokenAccount::unpack(&authority_refunded.data).unwrap();

    assert_eq!(authority_refunded_state.amount, total_amount);

    // Intentamos redepositar los 3,000,000 POPE.
    let redeposit_accounts = accounts::Deposit {
        vesting,
        vault,
        authority: authority.pubkey(),
        mint: mint.pubkey(),
        authority_token_account: authority_token.pubkey(),
        token_program: anchor_spl::token::ID,
    };

    let redeposit_data = instruction::Deposit {
        amount: total_amount,
    };

    let redeposit_ix = Instruction {
        program_id,
        accounts: redeposit_accounts.to_account_metas(None),
        data: redeposit_data.data(),
    };

    svm.expire_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[redeposit_ix],
        Some(&payer.pubkey()),
        &[&payer, &authority],
        svm.latest_blockhash(),
    );

    let redeposit_result = svm.send_transaction(tx);

    assert!(
        redeposit_result.is_err(),
        "FALLO DE SEGURIDAD: el vesting permitió un redepósito"
    );

    // Los tokens deben seguir en authority y la Vault en cero.
    let authority_after_redeposit =
        svm.get_account(&authority_token.pubkey()).unwrap();

    let authority_state_after_redeposit =
        TokenAccount::unpack(
            &authority_after_redeposit.data
        ).unwrap();

    let vault_after_redeposit =
        svm.get_account(&vault).unwrap();

    let vault_state_after_redeposit =
        TokenAccount::unpack(
            &vault_after_redeposit.data
        ).unwrap();

    assert_eq!(
        authority_state_after_redeposit.amount,
        total_amount
    );

    assert_eq!(vault_state_after_redeposit.amount, 0);

    println!("Redepósito después del vesting rechazado correctamente");
    println!("Authority conserva los 3,000,000 POPE de prueba");
    println!("Vault continúa con 0 POPE");

    println!("POPE integration setup OK");
    println!(
        "Total ficticio: {} unidades base",
        total_amount
    );
    println!("Vesting PDA: {}", vesting);
    println!("Vault PDA: {}", vault);

    let _ = Message::new(
        &[],
        Some(&payer.pubkey())
    );

    let _phantom_tx: Option<Transaction> = None;
}

#[test]
fn test_initialize_rejects_zero_amount() {
    let program_id = Pubkey::from_str_const(
        "BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc"
    );

    let mut svm = LiteSVM::new();

    let program = include_bytes!(
        "../../../target/deploy/popecoin_vesting.so"
    );

    svm.add_program(program_id, program).unwrap();

    let payer = Keypair::new();
    let authority = Keypair::new();
    let beneficiary = Keypair::new();
    let mint = Keypair::new();

    svm.airdrop(&payer.pubkey(), 10_000_000_000)
        .unwrap();

    // Creamos un mint SPL ficticio.
    let rent = svm.minimum_balance_for_rent_exemption(Mint::LEN);

    let create_mint =
        solana_system_interface::instruction::create_account(
            &payer.pubkey(),
            &mint.pubkey(),
            rent,
            Mint::LEN as u64,
            &spl_token_interface::ID,
        );

    let initialize_mint =
        spl_token_interface::instruction::initialize_mint2(
            &spl_token_interface::ID,
            &mint.pubkey(),
            &authority.pubkey(),
            None,
            6,
        ).unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[create_mint, initialize_mint],
        Some(&payer.pubkey()),
        &[&payer, &mint],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let (vesting, _) = Pubkey::find_program_address(
        &[
            b"vesting",
            beneficiary.pubkey().as_ref(),
            mint.pubkey().as_ref(),
        ],
        &program_id,
    );

    let (vault, _) = Pubkey::find_program_address(
        &[b"vault", vesting.as_ref()],
        &program_id,
    );

    let initialize_accounts = accounts::Initialize {
        payer: payer.pubkey(),
        authority: authority.pubkey(),
        beneficiary: beneficiary.pubkey(),
        mint: mint.pubkey(),
        vesting,
        vault,
        token_program: anchor_spl::token::ID,
        system_program: anchor_lang::system_program::ID,
        rent: anchor_lang::prelude::rent::ID,
    };

    // Ataque/configuración inválida:
    // intentamos crear un vesting con cantidad total = 0.
    let initialize_data = instruction::Initialize {
        total_amount: 0,
        start_time: 1_000,
        cliff_time: 1_100,
        end_time: 2_000,
    };

    let ix = Instruction {
        program_id,
        accounts: initialize_accounts.to_account_metas(None),
        data: initialize_data.data(),
    };

    svm.expire_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[&payer, &authority, &beneficiary],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);

    assert!(
        result.is_err(),
        "FALLO DE SEGURIDAD: Initialize aceptó total_amount = 0"
    );

    // La transacción fallida no debe dejar creadas las PDAs.
    assert!(svm.get_account(&vesting).is_none());
    assert!(svm.get_account(&vault).is_none());

    println!("Initialize con total_amount = 0 rechazado correctamente");
    println!("No se creó Vesting PDA ni Vault");
}

#[test]
fn test_initialize_rejects_start_after_end() {
    let program_id = Pubkey::from_str_const(
        "BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc"
    );

    let mut svm = LiteSVM::new();

    let program = include_bytes!(
        "../../../target/deploy/popecoin_vesting.so"
    );

    svm.add_program(program_id, program).unwrap();

    let payer = Keypair::new();
    let authority = Keypair::new();
    let beneficiary = Keypair::new();
    let mint = Keypair::new();

    svm.airdrop(&payer.pubkey(), 10_000_000_000)
        .unwrap();

    // Creamos un mint SPL ficticio.
    let rent = svm.minimum_balance_for_rent_exemption(Mint::LEN);

    let create_mint =
        solana_system_interface::instruction::create_account(
            &payer.pubkey(),
            &mint.pubkey(),
            rent,
            Mint::LEN as u64,
            &spl_token_interface::ID,
        );

    let initialize_mint =
        spl_token_interface::instruction::initialize_mint2(
            &spl_token_interface::ID,
            &mint.pubkey(),
            &authority.pubkey(),
            None,
            6,
        ).unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[create_mint, initialize_mint],
        Some(&payer.pubkey()),
        &[&payer, &mint],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let (vesting, _) = Pubkey::find_program_address(
        &[
            b"vesting",
            beneficiary.pubkey().as_ref(),
            mint.pubkey().as_ref(),
        ],
        &program_id,
    );

    let (vault, _) = Pubkey::find_program_address(
        &[b"vault", vesting.as_ref()],
        &program_id,
    );

    let initialize_accounts = accounts::Initialize {
        payer: payer.pubkey(),
        authority: authority.pubkey(),
        beneficiary: beneficiary.pubkey(),
        mint: mint.pubkey(),
        vesting,
        vault,
        token_program: anchor_spl::token::ID,
        system_program: anchor_lang::system_program::ID,
        rent: anchor_lang::prelude::rent::ID,
    };

    // Ataque/configuración inválida:
    // intentamos crear un vesting donde start_time >= end_time.
    let initialize_data = instruction::Initialize {
        total_amount: 3_000_000_000_000,
        start_time: 2_000,
        cliff_time: 2_000,
        end_time: 1_000,
    };

    let ix = Instruction {
        program_id,
        accounts: initialize_accounts.to_account_metas(None),
        data: initialize_data.data(),
    };

    svm.expire_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[&payer, &authority, &beneficiary],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);

    assert!(
        result.is_err(),
        "FALLO DE SEGURIDAD: Initialize aceptó start_time >= end_time"
    );

    // La transacción fallida no debe dejar creadas las PDAs.
    assert!(svm.get_account(&vesting).is_none());
    assert!(svm.get_account(&vault).is_none());

    println!("Initialize con start_time >= end_time rechazado correctamente");
    println!("No se creó Vesting PDA ni Vault");
}

#[test]
fn test_initialize_rejects_cliff_before_start() {
    let program_id = Pubkey::from_str_const(
        "BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc"
    );

    let mut svm = LiteSVM::new();

    let program = include_bytes!(
        "../../../target/deploy/popecoin_vesting.so"
    );

    svm.add_program(program_id, program).unwrap();

    let payer = Keypair::new();
    let authority = Keypair::new();
    let beneficiary = Keypair::new();
    let mint = Keypair::new();

    svm.airdrop(&payer.pubkey(), 10_000_000_000)
        .unwrap();

    // Creamos un mint SPL ficticio.
    let rent = svm.minimum_balance_for_rent_exemption(Mint::LEN);

    let create_mint =
        solana_system_interface::instruction::create_account(
            &payer.pubkey(),
            &mint.pubkey(),
            rent,
            Mint::LEN as u64,
            &spl_token_interface::ID,
        );

    let initialize_mint =
        spl_token_interface::instruction::initialize_mint2(
            &spl_token_interface::ID,
            &mint.pubkey(),
            &authority.pubkey(),
            None,
            6,
        ).unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[create_mint, initialize_mint],
        Some(&payer.pubkey()),
        &[&payer, &mint],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let (vesting, _) = Pubkey::find_program_address(
        &[
            b"vesting",
            beneficiary.pubkey().as_ref(),
            mint.pubkey().as_ref(),
        ],
        &program_id,
    );

    let (vault, _) = Pubkey::find_program_address(
        &[b"vault", vesting.as_ref()],
        &program_id,
    );

    let initialize_accounts = accounts::Initialize {
        payer: payer.pubkey(),
        authority: authority.pubkey(),
        beneficiary: beneficiary.pubkey(),
        mint: mint.pubkey(),
        vesting,
        vault,
        token_program: anchor_spl::token::ID,
        system_program: anchor_lang::system_program::ID,
        rent: anchor_lang::prelude::rent::ID,
    };

    // Ataque/configuración inválida:
    // intentamos crear un vesting con cliff anterior al inicio.
    let initialize_data = instruction::Initialize {
        total_amount: 3_000_000_000_000,
        start_time: 1_000,
        cliff_time: 900,
        end_time: 2_000,
    };

    let ix = Instruction {
        program_id,
        accounts: initialize_accounts.to_account_metas(None),
        data: initialize_data.data(),
    };

    svm.expire_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[&payer, &authority, &beneficiary],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);

    assert!(
        result.is_err(),
        "FALLO DE SEGURIDAD: Initialize aceptó cliff_time < start_time"
    );

    // La transacción fallida no debe dejar creadas las PDAs.
    assert!(svm.get_account(&vesting).is_none());
    assert!(svm.get_account(&vault).is_none());

    println!("Initialize con cliff_time < start_time rechazado correctamente");
    println!("No se creó Vesting PDA ni Vault");
}

#[test]
fn test_initialize_rejects_cliff_after_end() {
    let program_id = Pubkey::from_str_const(
        "BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc"
    );

    let mut svm = LiteSVM::new();

    let program = include_bytes!(
        "../../../target/deploy/popecoin_vesting.so"
    );

    svm.add_program(program_id, program).unwrap();

    let payer = Keypair::new();
    let authority = Keypair::new();
    let beneficiary = Keypair::new();
    let mint = Keypair::new();

    svm.airdrop(&payer.pubkey(), 10_000_000_000)
        .unwrap();

    // Creamos un mint SPL ficticio.
    let rent = svm.minimum_balance_for_rent_exemption(Mint::LEN);

    let create_mint =
        solana_system_interface::instruction::create_account(
            &payer.pubkey(),
            &mint.pubkey(),
            rent,
            Mint::LEN as u64,
            &spl_token_interface::ID,
        );

    let initialize_mint =
        spl_token_interface::instruction::initialize_mint2(
            &spl_token_interface::ID,
            &mint.pubkey(),
            &authority.pubkey(),
            None,
            6,
        ).unwrap();

    let tx = Transaction::new_signed_with_payer(
        &[create_mint, initialize_mint],
        Some(&payer.pubkey()),
        &[&payer, &mint],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx).unwrap();

    let (vesting, _) = Pubkey::find_program_address(
        &[
            b"vesting",
            beneficiary.pubkey().as_ref(),
            mint.pubkey().as_ref(),
        ],
        &program_id,
    );

    let (vault, _) = Pubkey::find_program_address(
        &[b"vault", vesting.as_ref()],
        &program_id,
    );

    let initialize_accounts = accounts::Initialize {
        payer: payer.pubkey(),
        authority: authority.pubkey(),
        beneficiary: beneficiary.pubkey(),
        mint: mint.pubkey(),
        vesting,
        vault,
        token_program: anchor_spl::token::ID,
        system_program: anchor_lang::system_program::ID,
        rent: anchor_lang::prelude::rent::ID,
    };

    // Ataque/configuración inválida:
    // intentamos crear un vesting con cliff posterior al final.
    let initialize_data = instruction::Initialize {
        total_amount: 3_000_000_000_000,
        start_time: 1_000,
        cliff_time: 2_100,
        end_time: 2_000,
    };

    let ix = Instruction {
        program_id,
        accounts: initialize_accounts.to_account_metas(None),
        data: initialize_data.data(),
    };

    svm.expire_blockhash();

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&payer.pubkey()),
        &[&payer, &authority, &beneficiary],
        svm.latest_blockhash(),
    );

    let result = svm.send_transaction(tx);

    assert!(
        result.is_err(),
        "FALLO DE SEGURIDAD: Initialize aceptó cliff_time > end_time"
    );

    // La transacción fallida no debe dejar creadas las PDAs.
    assert!(svm.get_account(&vesting).is_none());
    assert!(svm.get_account(&vault).is_none());

    println!("Initialize con cliff_time > end_time rechazado correctamente");
    println!("No se creó Vesting PDA ni Vault");
}
