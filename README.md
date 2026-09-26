# PAPA vesting

Programa Solana/Anchor para vesting lineal de tokens SPL clásicos. Requiere firma del beneficiario al crear y liberar; la autoridad financia el vault. No tiene cancelación, retiro administrativo ni recuperación de excedentes. La acumulación comienza en `start_time` y se puede reclamar desde `cliff_time`.

## Validación local

Herramientas verificadas: Rust/Cargo 1.89.0, Solana CLI 3.1.10, Anchor CLI 1.1.2, Node 24.10.0, npm 11.6.1, Yarn 1.22.22. `Cargo.lock` resuelve Anchor Rust 1.2.0 y LiteSVM 0.10.0; el cliente usa Anchor TS 0.32.1. Las pruebas de cliente comprueban la construcción de las tres instrucciones con el IDL generado.

```sh
yarn install --frozen-lockfile
npm run check
npm run verify:release
```

`check` compila SBF con `--ignore-keys`, ejecuta Rust/LiteSVM, verifica TypeScript y ejecuta las pruebas de cliente offline. No despliega ni utiliza wallets. Se debe compilar antes de los tests Rust porque incluyen el binario de `target/deploy`; `npm run test:rust` hace ambas cosas. `target/` es generado y no se versiona. Los tests LiteSVM usan signers efímeros y tokens ficticios en memoria.

## Identidades

- Código/IDL de release: `AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn`.
- Programa Devnet histórico: `BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`.
- Los scripts Devnet vinculan explícitamente el IDL al programa Devnet mediante `scripts/devnet-config.ts`. Esto cambia el destino del cliente, **no** el ID incorporado en el binario.
- El binario actual no se debe desplegar sobre el programa Devnet histórico. Consultar [procedimiento](docs/DEPLOYMENT_PROCEDURE.md).

## Scripts operativos

Los scripts `devnet-initialize`, `devnet-*-vesting`, `devnet-*-deposit`, `devnet-release`, `create-metadata` y `update-metadata` modifican Devnet si se ejecutan. No forman parte de `check`. Exigen rutas explícitas a signers exclusivos de Devnet mediante `PAPA_DEVNET_PAYER_KEYPAIR` y, según el rol, `PAPA_DEVNET_DEVELOPMENT_KEYPAIR`, `PAPA_DEVNET_FOUNDER_KEYPAIR` o `PAPA_DEVNET_RESERVE_KEYPAIR`. No se deben colocar claves en el repositorio. La configuración explícita evita cargar silenciosamente la wallet predeterminada de Solana; el operador sigue siendo responsable de escoger una clave exclusivamente de pruebas.

Los scripts de depósito consultan el vault y calculan la diferencia exacta. Un cambio concurrente de saldo puede hacer que el contrato rechace la operación; inspeccionar y volver a calcular. Un vesting con liberaciones previas no admite otro depósito mediante esta instrucción.

`inspect-planned-vestings.ts`, `read-metadata.ts` y `devnet-test.ts` consultan Devnet. `verify-mainnet-release.ts`, pese a su nombre histórico, solo comprueba archivos locales; no verifica custodia, despliegue ni correspondencia criptográfica entre fuente y binario.

## Estado y revisión final

Ver [PAPA_WORK_HANDOFF.md](PAPA_WORK_HANDOFF.md) para resultados actuales y pendientes. `app/` está vacío: este repositorio ofrece contrato y scripts, no una interfaz de usuario. Los registros Devnet de `docs/` son históricos y no afirman el estado actual de la red. Quedan pendientes auditoría independiente, custodia final, metadata duradera, mint y fechas finales de producción. No hay autorización de lanzamiento implícita.
