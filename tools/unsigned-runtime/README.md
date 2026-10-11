# Runtime offline sin claves ni firmas

NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED.

Alternativa a LiteSVM 0.10.0: `solana-program-runtime` 3.1.14
`invoke_context::mock_process_instruction`, con loader SBF real y cuentas públicas
deterministas. No construye transacciones, keypairs, wallets ni validadores; no RPC.
El lock aislado no contiene LiteSVM ni solana-keypair. No modifica el contrato,
el lock del producto ni las dependencias upstream.

Ejecutar desde la raíz, con un ELF ficticio compilado previamente:

```sh
node --require ts-node/register scripts/prepare-unsigned-runtime-fixture.ts > target/unsigned-meteora-fixture.json
CARGO_TARGET_DIR=target cargo run --offline --locked \
  --manifest-path tools/unsigned-runtime/Cargo.toml -- \
  "$PWD" "$PWD/target/rehearsal-builds/WORKSPACE/program.so"
```

El programa exige el hash SBF ficticio reproducido `e932987ffdb686dcffd3563ca2bbccdfcf51dc89debefb6d6cb046e5f5bf7ecb`
y SPL Token `8190d3f7ceb6cb7a7a8d8924bff89f9f611e15ce1f806f2b6237f3311a98f697`
en `target/robusto-final-public-programs/token.so`. Ningún fallback descarga bytes.
La identidad ficticia pública está fijada. El ELF contiene esa identidad y usa las
fuentes verificadas por build-rehearsal.py; no es el candidato de producción.

Veinticuatro casos ejecutan las instrucciones Anchor y sus CPI SPL reales: release parcial
/final, precliff, permiso signer ausente, vault congelado, fondos insuficientes;
deposit completo, completar financiación parcial, ya financiado, importe incorrecto,
permiso signer ausente y vault congelado. Se cotejan saldos y released_amount o
inmutabilidad de cuentas para los errores concretos comprobados. Los errores exactos
se contrastan con el runtime, no con mocks del handler.

Se añaden initialize con CPI System Program/SPL, tres ausencias de signer
(payer/authority/beneficiary), rent y conservación de lamports. El lifecycle
secuencial reutiliza las cuentas creadas: deposit, repetición rechazada, release
parcial, repetición rechazada, Clock regresivo rechazado, release final y repetición
rechazada. Se conserva el total de tokens y se coteja released_amount con el destino.
No se recrean las cuentas entre estos pasos.

Los flags signer son permisos ficticios de instrucción. Esto prueba constraints y
PDA invoke_signed en runtime, **no autenticación criptográfica de un usuario**.
El contexto usa Clock sintético slot 10 (un programa cargado en slot 0 se hace visible
en slot 1), loader clásico y features all_enabled de Agave 3.1.14. No equivale a un
cluster, fees, rent de transacciones, capacidad de producción ni rollback de una
transacción con múltiples instrucciones. CPI Meteora y variantes adversariales adicionales siguen pendientes. SPL corresponde a bytes
públicos históricos fijados; no hay atestación independiente de sus fuentes.

Investigación local: LiteSVM `Default -> new_inner` genera `airdrop_kp` mediante
`Keypair::new()` antes de aplicar opciones. Desactivar sigverify no evita eso.
Mollusk no está en el registro local inspeccionado. La API alternativa usada no
requiere LiteSVM ni el test module upstream que importa Keypair: se compilan librerías
normales y nuestro binario aislado. No se ejecutan los tests de dependencias.


## Cobertura ampliada y evidencia actual

24 casos de instrucciones previos, 8 secuencias con descarte explícito, 20 Meteora,
15 escenarios adversariales ROBUSTO (14 rechazos SBF y 1 preflight imposible con
reproducción raw diagnóstica). Cinco tests host del engine. Los errores se cotejan
exactamente; el programa externo no se sustituye por un mock. Detalles y límites:
[ROBUSTO_UNSIGNED_EXECUTION](../../docs/ROBUSTO_UNSIGNED_EXECUTION.md).

El harness NO prueba rollback nativo de transacciones: se observan efectos raw
parciales tanto en doble release como en fallo tardío de CPI Meteora. El engine
separa esos efectos de la política de aceptación del fixture. Receipts/journal
no autorizan, confirman redes, liberan reservas ni habilitan reintentos.

Sobre HEAD limpio, `python3 scripts/check-unsigned-runtime.py --fixture-elf RUTA_ELF`
produce target/unsigned-runtime-report.json ligado al inventario Git/HEAD y cuatro
ELF. `offline-fixture-candidate.py --with-runtime-evidence` lo exige actual y adjunta
reporte, fixture, fuentes del harness y ELF revisados al candidato OFFLINE_FIXTURE_ONLY.
Los hashes no constituyen atestación independiente ni RC de producción.
