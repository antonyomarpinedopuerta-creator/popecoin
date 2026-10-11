# Runtime offline sin claves ni firmas

NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED.

Alternativa a LiteSVM 0.10.0: `solana-program-runtime` 3.1.14
`invoke_context::mock_process_instruction`, con loader SBF real y cuentas públicas
deterministas. No construye transacciones, keypairs, wallets ni validadores; no RPC.
El lock aislado no contiene LiteSVM ni solana-keypair. No modifica el contrato,
el lock del producto ni las dependencias upstream.

Ejecutar desde la raíz, con un ELF ficticio compilado previamente:

```sh
CARGO_TARGET_DIR=target cargo run --offline --locked \
  --manifest-path tools/unsigned-runtime/Cargo.toml -- \
  "$PWD" "$PWD/target/rehearsal-builds/WORKSPACE/program.so"
```

El programa exige el hash SBF ficticio reproducido `e932987ffdb686dcffd3563ca2bbccdfcf51dc89debefb6d6cb046e5f5bf7ecb`
y SPL Token `8190d3f7ceb6cb7a7a8d8924bff89f9f611e15ce1f806f2b6237f3311a98f697`
en `target/robusto-final-public-programs/token.so`. Ningún fallback descarga bytes.
La identidad ficticia pública está fijada. El ELF contiene esa identidad y usa las
fuentes verificadas por build-rehearsal.py; no es el candidato de producción.

Doce casos ejecutan las instrucciones Anchor y sus CPI SPL reales: release parcial
/final, precliff, permiso signer ausente, vault congelado, fondos insuficientes;
deposit completo, completar financiación parcial, ya financiado, importe incorrecto,
permiso signer ausente y vault congelado. Se cotejan saldos y released_amount o
inmutabilidad de cuentas para los errores concretos comprobados. Los errores exactos
se contrastan con el runtime, no con mocks del handler.

Los flags signer son permisos ficticios de instrucción. Esto prueba constraints y
PDA invoke_signed en runtime, **no autenticación criptográfica de un usuario**.
El contexto usa Clock sintético slot 10 (un programa cargado en slot 0 se hace visible
en slot 1), loader clásico y features all_enabled de Agave 3.1.14. No equivale a un
cluster, fees, rent de transacciones, capacidad de producción ni rollback de una
transacción con múltiples instrucciones. Initialize, lifecycle secuencial, Meteora
y variantes adversariales adicionales siguen pendientes. SPL corresponde a bytes
públicos históricos fijados; no hay atestación independiente de sus fuentes.

Investigación local: LiteSVM `Default -> new_inner` genera `airdrop_kp` mediante
`Keypair::new()` antes de aplicar opciones. Desactivar sigverify no evita eso.
Mollusk no está en el registro local inspeccionado. La API alternativa usada no
requiere LiteSVM ni el test module upstream que importa Keypair: se compilan librerías
normales y nuestro binario aislado. No se ejecutan los tests de dependencias.
