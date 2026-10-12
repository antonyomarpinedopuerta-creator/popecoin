# ROBUSTO 10B/9 — revisión técnica interna offline

**Alcance base:** `906bc9bd6570496203c6c33e085de13af831fed0` (estado limpio verificado
frente a `origin/master`). Las pruebas de esta revisión cubren los nuevos validadores
host; las cifras históricas citadas se identifican como tales y no se cuentan como
ejecuciones actuales.

**Estado obligatorio:** `NOT_AUTHORIZED_FOR_MAINNET` · `MAINNET_DISABLED` ·
`OFFLINE_FIXTURE_ONLY` · `NATIVE_ATOMICITY_NOT_VERIFIED` ·
`BLOCKED_FOR_PRODUCTION_REVIEW`.

## Matriz de trazabilidad 10B/9

| Capa | Código/ruta | Naturaleza y dependencias | Resultado de revisión |
| --- | --- | --- | --- |
| Parámetros | `config/robusto-tokenomics-10b9-alternative.json` | Fixture local, no contiene identidades operativas. | 10B/9 y cinco buckets; beneficiary, base temporal, mint, authorities, circulación, precio y liquidez siguen pendientes. |
| Manifiesto | `scripts/robusto-10b9-offline.ts`; `robusto:prepare-10b9-offline` | Ejecutable host que usa Node built-ins, lee una ruta local fija y escribe JSON a stdout. | No importa Solana SDK, no lee variables de entorno, no genera instrucciones ni acepta opciones de red. Rechaza manifiestos diferentes del perfil local. |
| Vesting abstracto | `scripts/robusto-10b9-vesting-preparation.ts`; `robusto:prepare-10b9-vesting` | Ejecutable host que depende del constructor anterior y Node built-ins. | Conserva cinco asignaciones; representa 365/730 solo como offsets. No elige mint/beneficiary/authority ni genera cuentas o instrucciones. Los validadores de depósito/liberación son modelos aritméticos, no ejecución del contrato. |
| Fixture 10B/9 | `scripts/robusto-10b9-alternative.ts` | Builder de instrucciones públicas con Anchor/Web3/SPL; carga primero `tests/offline-safety`. Usa claves públicas sintéticas deterministas. | Sirve para codificación/fixtures y tests; no es el nuevo constructor host ni una ruta de producción. No ejecutar sus rutas que excedan las pruebas permitidas. |
| Fixture Meteora 10B/9 | `scripts/robusto-meteora-10b9.ts` | Builder host de fixture; datos públicos deterministas derivados de hashes, sin keypairs privados. | Codifica parámetros/instrucción ficticios. No es un pool ni prueba disponibilidad. El programa Meteora externo y estado real no se validan en esta revisión. |
| Producto web | `app/product.ts`, `app/market-data.ts`, `app/server.ts` | Lee la propuesta local; servidor HTTP solo GET; data source de mercado `null`. | Presenta el estado NOT_DEPLOYED y no configura RPC, mint, autoridad o compra. No se modificó ni probó aquí la web. |
| Perfil histórico | `scripts/robusto-production.ts`, `config/robusto-production.json` y perfil económico histórico | Constructor operativo/host con imports Anchor, Web3, SPL y Umi. La creación de mint histórica fija 6 decimales y el validador es 1B/6/cuatro buckets; contiene rutas de cotización con `Connection`. | No es compatible como builder productivo de 10B/9. Se conserva intacto y no se ejecuta. El constructor nuevo no lo importa. |
| Liquidez/rehearsal | `scripts/robusto-meteora-local.ts`, `scripts/robusto-meteora-rehearsal.ts`, fixtures y `tools/unsigned-runtime/src/liquidity.rs` | Mezcla modelos, builders e integración local. El rehearsal contiene `Keypair.generate`, `Keypair.fromSecretKey`, `tx.sign` y envío RPC local. | No ejecutar el rehearsal: incumple esta fase. Los tests nuevos no importan este grafo. El harness InvokeContext usa permisos sintéticos, no autenticación criptográfica. |
| Programa | `programs/popecoin_vesting/src/{instructions,state,constants}.rs` | Contrato Anchor: `initialize`, `deposit`, `release`; CPI System/SPL Token clásico. | Unidades base `u64`, calendario `i64`; no fija supply global, decimales, mint ROBUSTO ni política de authorities. |
| Evidencia SBF | `tools/unsigned-runtime` y `docs/ROBUSTO_10B9_IMPLEMENTATION.md` | Harness local `InvokeContext`; loader SBF y CPI, permisos sintéticos. | El registro histórico cita 11 casos del fixture 10B/9, incluido initialize/deposit/release del millón; no se recompiló ni repitió aquí. No demuestra rollback nativo ni firmas reales. |
| Paths con red/firma | `scripts/rehearsal-*.ts`, `scripts/robusto-recovery.ts`, `scripts/robusto-cost-estimator.ts`, `scripts/devnet-*` y otros | Código host con `Connection`, `fetch`, `send*` o carga/firma de keypair en determinadas rutas. | Inspección estática solamente. Se excluyeron de ejecución; no se presenta resultado de red. |

Rutas adicionales revisadas: `robusto-preflight.ts` y `robusto-network-verification.ts`
leen estado vía RPC; `robusto-program-deployment.ts` prepara despliegue; `robusto-external-signing.ts`
inspecciona handoffs unsigned sin firmar; `robusto-metadata-publication.ts` tiene modos
de publicación; `robusto-meteora-rehearsal.ts` sí genera keypairs, firma y envía a RPC
local. Se excluyeron todas. El nombre “local” o el guard de fixture no se usó como
permiso para ejecutar dichas rutas.

No se define todavía un **mint esperado** para ROBUSTO 10B/9. El manifest y el plan
mantienen las authorities/address como `null`; una prueba de “mint correcto” no puede
certificar una identidad que el propietario no ha elegido. Sí se rechazan fields de mint,
beneficiario o authority inyectados en un manifiesto, y cualquier digest distinto al
derivado del fixture local. El programa de vesting acepta un mint SPL clásico suministrado
por quien inicializa; verifica consistencia posterior con el mint almacenado, pero no
puede decidir si ese mint era el ROBUSTO previsto.

## Contrato y riesgos de fondos

La revisión de `initialize`, `deposit`, `release`, `state` y seeds no encontró una ruta
de retiro no autorizado reproducible, por lo que **no se modificó el contrato**.

- `initialize` requiere firmantes payer, authority y beneficiary; exige amount mayor que
  cero, `start < end` y `start <= cliff <= end`. Guarda el `authority` que se le presente;
  no fuerza que sea payer o beneficiary. La decisión de quién puede depositar debe
  coincidir con el origen de tokens, o el calendario puede quedar sin financiación.
- `initialize` acepta cualquier `Mint` del Token Program clásico: el contrato no compara
  con una dirección ROBUSTO ni exige `decimals == 9`, mint authority cerrada o freeze
  authority ausente. `deposit`/`release` usan el `mint.decimals` aportado y ligan luego
  mint, vault y estado. La selección inicial equivocada no se corrige automáticamente.
- `deposit` requiere authority signer, source owner/mint correctos, `released_amount == 0`,
  vault balance no mayor al total y transferencia exactamente igual al remanente. Una
  donación directa superior al total hace fallar el depósito; el exceso no tiene rescue.
  Una donación posterior al depósito puede permanecer bloqueada por encima del derecho
  de vesting. El modelo host añadido comprueba esta regla, pero no es una CPI ni demuestra
  el comportamiento del SPL/contrato.
- `release` requiere firmante beneficiary y destino suyo con el mint correspondiente.
  El cálculo se redondea hacia abajo y no supera `total_amount`; el estado se actualiza
  después de la CPI. El titular del vesting no puede cambiarse ni existe recuperación
  administrativa: perder el acceso del beneficiario puede inmovilizar el saldo restante.
- Los tiempos son `i64`; el contrato valida orden, no exige timestamps no negativos ni
  futuros. Un start/cliff pasado puede dejar tokens disponibles inmediatamente tras
  depositar. Para un grant de fundador esto es un riesgo de configuración: las firmas
  de inicialización y las fechas finales requieren verificación separada. No se elevó a
  defecto que requiera cambio de ABI sin una decisión de diseño/auditoría.
- El vesting PDA usa `[b"vesting", beneficiary, mint]`; el vault usa `[b"vault", vesting]`.
  Por pareja beneficiario/mint solo existe un calendario. La verificación host de seeds
  protege el supuesto de tests, pero no deriva una PDA ni crea identidad.
- La aritmética `vested_amount` amplía diferencias temporales a `i128` y multiplica en
  `u128`; timestamps válidos y `u64` total caben en el producto. `release` aplica
  `checked_sub` y `checked_add`. No se encontró desbordamiento reproducible en el flujo
  inicializado válido.

## Pruebas adversariales añadidas

El adaptador nuevo ahora cubre: manifest alterado o de perfil 1B/6, decimals/supply y
autoridades/mint/beneficiarios inyectados, founder distinto de `1e15`, sumas, límites
`u64`/`i64`, valores host Number, calendario 365/730 inválido, referencia de beneficiary
vacía, cota de liberación, depósito parcial/repetido/excedente/post-release, conservación
de cinco asignaciones, política PDA de una pareja y grafo importado sin dependencias de
red/solicitud de claves/firma. Los tests de depósito y release comprueban modelos
aritméticos host y se etiquetan como tales; no sustituyen las pruebas SBF históricas.

Comandos seguros ejecutados en esta revisión:

```sh
npm run test:robusto-10b9-offline
npm run test:robusto-10b9-vesting-preparation
./node_modules/.bin/tsc --noEmit
git diff --check
```

Resultado: 17 + 13 tests host aprobados, TypeScript y diff limpio. No se ejecutó Rust/SBF,
LiteSVM, ningún builder histórico, ruta Meteora de transacción, comando `Connection`/RPC,
ni una suite que importe la lógica de generación de identidades. No hubo cambios de Rust,
IDL, seeds, configuración económica ni web.

## Meteora y autoridades

Los diez findings `M-01..M-10` del [registro de riesgos](ROBUSTO_AUDIT_RISK_REGISTER.md)
se revisaron contra la clasificación local fijada en
[revisión de dependencias](ROBUSTO_METEORA_DEPENDENCY_REVIEW.md). Estado individual,
sin cierres en esta revisión:

| Hallazgo | Dependencia fijada | Situación conservada |
| --- | --- | --- |
| M-01 `RUSTSEC-2026-0007` | `bytes 1.10.1` | Edge Borsh opcional; no activo según fingerprints registrados; abierto hasta verificar edge/fix en build nuevo. |
| M-02 `RUSTSEC-2025-0137` | `ruint 1.14.0` | La aritmética es alcanzable; caller revisado normaliza divisor. Advisory abierto, UB no tiene PoC del proyecto. |
| M-03 `RUSTSEC-2026-0220` | `ruint 1.14.0` | Shifts y flag defectuoso alcanzables; no impacto económico demostrado. Abierto, fix upstream no incorporado. |
| M-04 `RUSTSEC-2025-0141` | `bincode 1.3.3` | Runtime/build; warning de mantenimiento/compatibilidad abierto. |
| M-05 `RUSTSEC-2024-0388` | `derivative 2.2.0` | Edge opcional `ark-ff` inactivo en build fijado; abierto ante cambios de feature/build. |
| M-06 `RUSTSEC-2024-0436` | `paste 1.0.15` | Edge opcional `ark-ff` inactivo en build fijado; abierto ante cambios de feature/build. |
| M-07 `RUSTSEC-2026-0190` | `anyhow 1.0.97` | Host/build; no `downcast_mut` hallado en búsqueda histórica parcial. Residual abierto. |
| M-08 `RUSTSEC-2026-0012` | `keccak 0.1.4` | Condicional host ARM/feature; target x86_64 registrado. Abierto para otros targets. |
| M-09 `RUSTSEC-2026-0097` | `rand 0.8.5` | Host/dev; condición de logger reentrante no demostrada. Abierto. |
| M-10 `RUSTSEC-2026-0097` | `rand 0.9.1` | Edge `rand-09` opcional inactivo en perfil fijado. Abierto. |

En particular `ruint 1.14.0` (`RUSTSEC-2025-0137` y `RUSTSEC-2026-0220`)
entra en aritmética de swap/liquidez; los controles estáticos/callers previos no son un
fix upstream ni auditoría externa. `bincode 1.3.3` es advertencia de mantenimiento para
runtime/build; los demás warnings son condicionales a host/feature/target según ese
análisis. No se actualizaron locks ni se rebajó ningún hallazgo. Estas fuentes locales
no se volvieron a consultar en RustSec durante esta sesión offline.

Las autoridades del token (mint, freeze, metadata y upgrade) permanecen pendientes, no
se deducen del plan de vesting. El propietario de la posición/NFT de Meteora controla la
liquidez depositada según la ruta documentada; operadores del protocolo pueden afectar
status/fees/activación. Ninguna de esas facultades equivale a una autorización del
fundador por swap, pero sí afecta disponibilidad y profundidad. No existe un pool ROBUSTO
real que permita probar los poderes actuales.

La atomicidad nativa continúa **`NATIVE_ATOMICITY_NOT_VERIFIED`**. No se usó un simulador
como sustituto de transacción completa ni se repitió el harness; el registro actual
explica que sus efectos fallidos se descartan por política del engine y no demuestra
rollback nativo del ledger.

## Defectos y límites finales

**Vulnerabilidades nuevas confirmadas:** ninguna reproducida en esta revisión.

**Riesgos de diseño/configuración confirmados:** excedentes de vault sin rescate, pérdida
de acceso de beneficiary, authority de depósito arbitraria almacenada en inicialización,
ausencia de binding al mint ROBUSTO esperado/decimales nueve, timestamps pasados válidos,
y una sola PDA por beneficiario/mint. Son límites explícitos del diseño actual; no se
introdujo una función de recuperación ni se tocó ABI/IDL/seeds.

**Bloqueos externos:** auditoría independiente de Anchor/SBF y la integración Meteora,
resolución o aceptación formal de los diez hallazgos con versión/ELF fijados, decisiones
del propietario sobre identities/beneficiario/authority/fechas/custodia, prueba de
rollback transaccional nativo dentro de una ruta autorizada, selección/verificación del
mint y correspondencia de builders productivos con 10B/9. El perfil histórico productivo
continúa siendo 1B/6 y no se debe usar para desplegar la propuesta.
