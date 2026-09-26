# PAPA — handoff técnico

Actualizado: 2026-09-26. Revisión local desde `d5c2998` (árbol inicialmente limpio).

## Estado actual

Contrato funcional y candidato local fortalecido para revisión técnica. **No listo
para lanzamiento**: quedan los requisitos de producción descritos abajo. Se revisaron
historial Git, manifiestos y lockfiles, programa completo, tests, scripts, documentación
y metadata. No existía este handoff. `app/` está vacío; no había `tests/` raíz (ahora
contiene tests offline del cliente). No hay pipeline CI versionado ni frontend.

La identidad declarada por el código/IDL es
`AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn`; la identidad histórica Devnet es
`BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`. Un build no cambia de identidad
porque el provider apunte a Devnet. El binario actual no sirve como upgrade del
programa Devnet histórico sin preparar otro build con su identidad.

## Arquitectura

- Anchor Rust, tres instrucciones: `initialize`, `deposit`, `release`.
- Una PDA vesting por beneficiario + mint; vault PDA por vesting.
- `VestingAccount`: autoridad, beneficiario, mint, total/liberado, tres timestamps,
  bump. La estructura y ABI no cambiaron en esta revisión.
- Firma de payer, autoridad y beneficiario al inicializar. Depósito autorizado por
  la autoridad. Liberación firmada por el beneficiario hacia su cuenta SPL.
- SPL Token clásico; CPI `transfer_checked`; no soporte Token-2022.
- Devnet scripts con Anchor TS 0.32.1 / web3.js 1.99.0; metadata con Umi/Metaplex.
- LiteSVM carga el binario SBF generado; pruebas de cálculo llaman al método real.
- No backend ni interfaz de usuario implementados.

## Trabajo terminado en esta sesión

1. Corregido overflow de diferencias i64 en calendarios válidos: se amplía a i128
   antes de restar y se calcula con u128. Se conserva redondeo hacia abajo, cliff
   y liberación completa al final. Ningún cambio de layout, seeds o instrucciones.
2. Extraído el cálculo al método `VestingAccount::vested_amount`; eliminada la
   fórmula duplicada de tests sin eliminar los cinco casos originales.
3. Regresiones SBF: firma ausente del beneficiario; inicio igual a fin; rango
   completo i64; rollback por saldo insuficiente y reintento; sustitución de
   vault/programa token/owner/discriminador. Se comprueban errores esperados y
   conservación del estado/saldos, no solo que una transacción falle.
4. Pruebas de límites, redondeo, cliff al final, monotonía y monto u64 máximo.
5. Scripts Devnet vinculados explícitamente a la identidad Devnet, sin mutar el
   IDL de release. Pruebas offline de instrucciones y PDAs históricas.
6. Signers operativos requieren `PAPA_DEVNET_{PAYER,DEVELOPMENT,FOUNDER,RESERVE}_KEYPAIR`;
   ya no se carga implícitamente la wallet CLI ni rutas personales predeterminadas.
   Estas variables no prueban que una clave sea exclusiva de Devnet: el operador
   debe elegirla correctamente. No se ejecutaron loaders con claves reales.
7. Depósitos calculan diferencia exacta según balance del vault con bigint y
   comprueban mint/owner. El contrato vuelve a validar atómicamente al ejecutar.
8. Inspección Devnet valida propietario/discriminador/beneficiario/mint y vault.
9. Verificador de identidad de release completamente offline y sin abrir claves:
   contrasta source/config/IDL y muestra SHA-256 del binario local.
10. README y procedimiento de despliegue corregidos, errores de scripts de lectura
    devuelven estado no cero, `.env` y PEM excluidos de Git.

## Herramientas comprobadas

- Rust y Cargo 1.89.0, fijados por `rust-toolchain.toml`.
- Solana CLI 3.1.10; configuración CLI Devnet, commitment confirmed.
- Anchor CLI 1.1.2. `Cargo.toml` permite desde 1.1.2 y **Cargo.lock resuelve 1.2.0**
  para anchor-lang/anchor-spl. No se actualizaron dependencias ni lockfiles.
- Node 24.10.0, npm 11.6.1, Yarn 1.22.22, TypeScript 5.9.3.
- Anchor TS 0.32.1 y Rust Anchor 1.2.0 tienen versiones diferentes: la compilación
  y construcción offline de las tres instrucciones pasan; no se afirma que todos
  los comportamientos de ambas librerías sean intercambiables.

## Pruebas realizadas

- Baseline `npm run check`: build Anchor + 23 tests Rust funcionales + tsc OK.
- Candidato: 22 tests de integración LiteSVM, 1 carga SBF, 9 de cálculo = **32 Rust**.
- **5 tests cliente offline**: identidad/PDAs, initialize/signers/u64, deposit/release,
  ausencia de signer explícito y top-up exacto con donaciones/montos grandes.
- `cargo clippy --locked --lib -- -D warnings`: OK.
- `npm run verify:release`: source/config/IDL coinciden; sin acceso a red o keys.
- `git diff --check`: OK.
- SHA-256 binario local:
  `1c3b71a2b792fa986b2a9264861d2bc58654e85370f2bb348cea4dcccaff8492`.
- SHA-256 logo coincide con la documentación:
  `7be34ed33f6fd2fe52946d43a4eccfd8e41055190bbc29d46a3e285858ee55eb`.

Reproducir con `npm run check` (reconstruye antes de probar) y
`npm run verify:release`. No ejecutar `cargo test` sobre un binario antiguo ni
interpretar un hash aislado como prueba de correspondencia con un despliegue.
Los tests cliente se ejecutan directamente con ts-node/register y node:test;
en este entorno la variante Node `--test` reportaba solo el archivo, por lo que
se usa el comando que muestra y ejecuta explícitamente los cinco casos.

## Límites y pendientes

- No auditoría independiente. Este trabajo es revisión interna, no certificación.
- No se consultó Mainnet ni se enviaron transacciones a ninguna red. No se leyó,
  copió ni imprimió material de wallet; tests con signers efímeros en memoria.
- No se revalidó el checkpoint Devnet remoto ni sus balances. El código local
  ahora incluye cambios funcionales posteriores al binario histórico desplegado.
- La documentación afirma backups de producción verificados anteriormente;
  esta sesión no verificó custodia o backups ni abrió sus archivos.
- Pendientes: revisión final de custodia, auditoría, URI duradera de logo/metadata,
  mint definitivo, fecha UTC de lanzamiento y timestamps explícitos, estrategia
  de liquidez y revisión legal. Requieren decisiones/servicios fuera del código.
- Programa upgradeable, una sola posición por beneficiario/mint, sin cancelación,
  cierre ni rescate de excedentes. No añadir esos poderes sin revisión de producto.
- El programa no limita suministro del mint ni impide que su freeze authority
  congele el vault. Comprobar suministro/decimales/ausencia de freeze al preparar
  producción según la política existente.
- Un vault parcialmente financiado puede pagar si cubre la cantidad devengada;
  tras la primera liberación, `deposit` queda bloqueado. Transferencias SPL directas
  siguen siendo posibles. Inicializar no garantiza financiación futura.
- Cliente operativo todavía usa archivos de signers explícitos; no hay integración
  wallet/hardware/multisig de producción. `app/` permanece sin requisitos de UI.
- No se instaló un servidor MCP global ni se alteró configuración personal: la
  revisión se apoyó en fuentes locales y pruebas ejecutables.

## Próximo paso

Revisar el diff y este candidato con un revisor independiente. Antes de una prueba
remota, preparar un build Devnet aislado con identidad correcta y contrastar el
estado histórico mediante lecturas Devnet. Antes de producción, completar los
pendientes de metadata, fecha, mint y custodia. Ninguna instrucción de este documento
autoriza Mainnet, fondos reales, revocaciones o publicación.
