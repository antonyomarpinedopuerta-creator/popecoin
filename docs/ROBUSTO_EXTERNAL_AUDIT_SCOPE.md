# ROBUSTO — expediente de auditoría independiente

NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED / OFFLINE_FIXTURE_ONLY.
Esta entrega es revisión interna y evidencia local reproducible. **No está auditado
independientemente**; el paquete no es RC de producción ni autoriza gasto o red.

El [registro de riesgos para auditoría](ROBUSTO_AUDIT_RISK_REGISTER.md) amplía
los diez hallazgos de Meteora con severidad cualitativa, responsables propuestos y
condiciones de cierre; también identifica los riesgos de vesting, custodia,
autoridades y procedencia de evidencia. Su inventario parte del HEAD inspeccionado
en esta revisión y separa registros históricos de pruebas repetidas en la revisión actual.

## Arquitectura y alcance

El programa propio `programs/popecoin_vesting` tiene initialize, deposit y release.
Anchor valida propietarios, discriminadores, PDA, mints, firmantes y destinos;
System crea cuentas y SPL Token clásico custodia/transfiere. El estado contiene
authority, beneficiary, mint, total/released u64, tres timestamps i64 y bump.
Vesting PDA: `vesting, beneficiary, mint`; vault: `vault, vesting`. Una posición
por beneficiario/mint; no upgrade del calendario, cancelación, sweep ni rescate
administrativo en las instrucciones del contrato. El loader puede tener una
upgrade authority externa: no confundir ausencia de método con inmutabilidad.

Fuentes conservan identidad histórica AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn;
el ELF ficticio adaptado usa YMN9Qj5jPNp7j14VPcML1B6xGgcPWVZUGLFU3Mnyfaf.
El IDL histórico se usa para ABI, no para afirmar que el ELF pertenece al despliegue
histórico. Registros de build y reproducibilidad previos documentan esa adaptación.

Meteora es un programa externo cp-amm 0.2.4, fuente fijada
`a85c926607433f23f0ea60f4ca7b1ae92f4156cb`, SPL clásico y Token-2022 externo para
NFT de posición. Los locks raíz, harness aislado y oficial se incluyen sin cambios.
Builders alternativos: `scripts/robusto-10b9-alternative.ts` y
`scripts/robusto-meteora-10b9.ts`; configuraciones históricas conservadas.
Journal/reconciliación son herramientas locales: no otorgan autorización ni prueban
confirmación de red. El harness InvokeContext ejecuta SBF/CPI con permisos sintéticos.

## Flujo y privilegios

La simulación propone suministro 10.000.000.000 × 10^9 = 10^19 unidades base,
menor que u64 máximo, mayor que i64 máximo y Number.MAX_SAFE_INTEGER.
Distribución 4.000M / 3.000M / 1.500M / 1.499M / 1M; suma exacta, propuesta.
El millón fundador entra en vault PDA; escenario start/cliff=365 días y end=1095
respecto de origen ficticio. No acumula durante bloqueo porque start=cliff.
No son meses calendario, fechas UTC ni beneficiario aprobados.

| Actor | Facultad | Límite/riesgo |
| --- | --- | --- |
| Payer, authority y beneficiary | Los tres permisos para initialize | Calendario validado, pero no decide aprobación económica; necesidad de coordinación |
| Authority de vesting | Completar saldo del vault exactamente hasta total, antes de cualquier release | No puede retirar ni cambiar beneficiario/calendario mediante contrato |
| Beneficiary | Reclamar lo vencido a cuenta propia del mismo mint | Debe conservar capacidad de firmar; pérdida de acceso no tiene recuperación administrativa |
| PDA | Autoriza CPI de release | No es clave privada ni firmante externo |
| Mint authority / freeze authority | Emitir/congelar si existen | Fixture alternativo sin ambas tras cierre ficticio; verificar estado final futuro |
| Trader independiente | Swap tras activación, pool habilitado | No requiere creador ni NFT; slippage, rango y reservas limitan ejecución |
| Controlador NFT posición | Aportes/retiros sujetos a permisos | Puede retirar profundidad propia; usuario no retira posición ajena |
| Operador Meteora autorizado | Status y fees según bits de permiso | Puede impedir swaps; poderes externos pendientes de comprobación final |
| Upgrade / metadata authorities | Reemplazo de código / edición de metadata según controles | Identidades finales, custodia y política siguen pendientes |

## Modelo de amenazas y matriz priorizada

Severidades son prioridades de revisión interna, no CVSS ni exploit confirmado.
Amenazas: actores sustituyen cuentas/beneficiarios/mints, repiten releases, provocan
CPI fallidas, exageran cantidades, manipulan supuestos del builder, pierden claves o
comprometen autoridades; tercero altera artefactos/evidencia; liquidez desaparece.

| ID / prioridad | Evidencia, mitigación local y residual | Estado |
| --- | --- | --- |
| A1 Alta | Falta Bank/transaction processor completo sin firmas. InvokeContext conserva efectos crudos tras CPI fallida, copia inicial como committed. No prueba rollback de Solana | No demostrado, bloquea cierre de evidencia |
| A2 Alta | ruint 1.14.0 está activo SBF; división normalizada y shifts acotados en callers revisados. Defecto de flag reproducido; cambiar perfil exige revisar límites | Sin fix upstream aplicado, revisión externa |
| A3 Alta | Poderes status/fees/upgrade externos; independencia del creador demostrada no elimina poderes del protocolo | Identidades/despliegue final sin verificar |
| A4 Alta | Autoridades definitivas, recuperación y financiación no elegidas; wallet software expuesta a malware/phishing | Decisión y revisión operativa pendientes |
| A5 Media | Depositar requiere saldo pendiente exacto y released=0. Transferencias SPL directas al vault pueden dejar excedentes; no hay sweep. Release no supera total pero excedente puede quedar atrapado | Limitación de diseño, no corregida automáticamente |
| A6 Media | Calendario no editable y sin rescate si beneficiary pierde acceso. Vesting no garantiza depósito financiado por initialize solamente | Verificar financiación completa y custodia antes de lanzamiento |
| A7 Media | Price 9/6 con racional bigint, montos u64, liquidez u128 y redondeo comprobados para fixtures; no prueba todos los parámetros posibles | Revisión económica y aritmética global pendiente |
| A8 Media | Journal bloquea reintentos y conserva incertidumbre; hashes locales pueden ser sustituidos junto con sus manifiestos | Auditor debe retener hash por canal independiente y reconstruir |

No se encontró defecto nuevo del contrato que justifique cambiar ABI o recompilar.
Esto es resultado de una revisión acotada, no prueba de ausencia de vulnerabilidades.
El auditor debe revisar especialmente alias de cuentas, invariantes sobre estados
malformados, privilegios combinados entre instrucciones, supply cerrado y donaciones.

## Tres advisories y siete warnings

No se cierran ni suprimen. Detalle de versiones, paths, features, funciones y
mitigaciones: [revisión de dependencias](ROBUSTO_METEORA_DEPENDENCY_REVIEW.md).
Prioridad alta para ruint activo, media para mantenimiento de bincode y herramientas
host; baja **para este artefacto** para edges opcionales excluidos, sin cerrar aviso.

| Aviso / paquete | Alcance y riesgo residual | Acción exigida |
| --- | --- | --- |
| 2026-0007 bytes 1.10.1 | Edge Borsh opcional inactivo en build revisado | Revalidar features; fix upstream pendiente |
| 2025-0137 ruint 1.14.0 | Función alcanzable, condición inválida acotada por normalización | Auditor revisar callers/unsafe; no ejecutar PoC UB |
| 2026-0220 ruint 1.14.0 | Flag defectuoso alcanzable; ignorado/acotado según helper | Revisar también nuevo perfil 9/6; no afirmar corregido |
| 2025-0141 bincode 1.3.3 | Activo SBF, sin mantenimiento | Plan upstream/compatibilidad |
| 2024-0388 derivative 2.2.0 | Opcional inactivo, proc macro si activado | Conservar aviso y revisar features |
| 2024-0436 paste 1.0.15 | Opcional inactivo | Igual, no supresión |
| 2026-0190 anyhow 1.0.97 | Host; downcast_mut no encontrado en consumidores revisados | Revisar herramientas y actualización compatible |
| 2026-0012 keccak 0.1.4 | Host, ARM opt-in no habilitado | Revisar otro host/flags antes de usar |
| 2026-0097 rand 0.8.5 | Host/dev, log ausente en perfil revisado | Revisar features/logger; no usar generadores prohibidos |
| 2026-0097 rand 0.9.1 | Edge opcional inactivo | Mantener hallazgo del lock |

Base RustSec es snapshot local; no se investigó actualidad online ni versiones futuras.
Clasificación conservada: BLOCKED_FOR_PRODUCTION_REVIEW. Mitigación local no es
corrección upstream. Hashes/build-record propios no son attestation independiente.

## Atomicidad: evidencia concreta faltante

Registro local contiene componentes solana-svm 3.1.14 (feature-set, transaction,
callback, etc.), pero no crate completa solana-svm ni solana-runtime/Bank.
LiteSVM 0.10.0 `src/lib.rs:434` construye airdrop_kp con Keypair::new en new_inner;
no se ejecutó. No hay prueba de imposibilidad teórica: falta herramienta revisada.

Un ensayo compatible futuro debe ejecutar procesador transaccional nativo con
verificación de firmas omitida explícitamente y permisos sintéticos sin generar claves,
cuentas iniciales deterministas y programas fijados. Debe probar éxito, CPI fallida
después de transferencia, fallo posterior a release y fallo posterior a creación de
pool; verificar almacenamiento final completo, datos/lamports/tokens y permisos
compilados globalmente. Distinguir fee debida por transacción fallida de efectos de
instrucciones revertidos. Blockhash/fees/feature set del entorno deben ser explícitos.
No se autoriza instalar o ejecutar herramientas que generen claves para conseguirlo.

## Reproducción segura y paquete

Requisitos: dependencias locales con locks, Node/ts-node, Rust y los ELF públicos ya
fijados. No restaurar ni ejecutar identidades históricas. No usar `cargo test` global,
LiteSVM, validator, scripts de deploy o suites históricas que firman.

```sh
python3 -m unittest tests/test_external_audit_package.py tests/test_10b9_runtime_evidence.py tests/test_unsigned_runtime_evidence.py
node --require ts-node/register tests/robusto-10b9-alternative.test.ts
node --require ts-node/register tests/robusto-meteora-10b9.test.ts
node --require ts-node/register tests/runtime-reconciliation.test.ts
cargo test --offline --locked -p popecoin_vesting --test test_vesting
CARGO_TARGET_DIR=target cargo test --offline --locked --manifest-path tools/unsigned-runtime/Cargo.toml
python3 scripts/check-10b9-runtime.py --fixture-elf target/rehearsal-builds/YMN9Qj5jPNp7j14VPcML1B6xGgcPWVZUGLFU3Mnyfaf-nhw26q4u/program.so
python3 scripts/package-external-audit.py
```

Gate exige HEAD limpio, repite 157 casos, liga fuentes/ELF/fixtures a hashes y no
acredita atomicidad nativa. Paquete incluye fuentes públicas versionadas, fuentes
oficiales según los 129 hashes del build-record, locks, IDL, cuatro ELF fijados,
fuentes del harness y reportes/fixtures. El ejecutable host (51 MiB) no se incluye;
se verifica su hash antes de empaquetar y se reconstruye con Cargo offline. Orden, gzip y timestamps son deterministas;
rechaza evidencia obsoleta y artefactos modificados. Verificación no extrae archivos:
`python3 scripts/backup-public.py --verify ARCHIVO --trusted-sha256 HASH_RETENIDO`.

Dependencias instaladas/toolchains no se empaquetan: reproducir en otra máquina puede
requerir aprovisionamiento independiente revisado; no se garantiza bootstrap sin red.
SHA-256 detecta sustitución respecto de hash retenido; no prueba autoría por sí solo.
No entregar el paquete a terceros automáticamente ni contratar auditoría en esta fase.

Criterio de auditoría: informe independiente con commit/artefactos exactos, alcance,
hallazgos/severidad, fixes y retest, discrepancias de fuente/ELF, pruebas nativas y
riesgo residual aceptado explícitamente. Propietario decide después de revisar informe,
financiación/capital, custodia y autorización por etapas; no hay aprobación implícita.

Ampliación: [atomicidad y custodia](ROBUSTO_ATOMICITY_AND_CUSTODY_REVIEW.md) documenta
herramientas instaladas/ausentes, criterio de rollback nativo y siete nuevos casos de
excedentes/permisos. Gate actual: 157 casos; custodyCases=7 obligatorio en paquete.
Los diez hallazgos incluyen ahora acción de mitigación/cambio por cada componente;
ninguna actualización upstream ni cierre se presume.

Prototipo aislado de [excedentes con procedencia](ROBUSTO_VESTING_SURPLUS_OPTIONS.md):
10 tests host sin dependencias, separados de los 157 casos runtime. No modifica contrato,
ABI o parámetros, no demuestra propiedad retrospectiva ni rollback. El gate/paquete
exigen nivel HOST_MODEL_ONLY_NOT_SBF para evitar confundir el alcance de esta evidencia.

## Inventario local reproducible para el auditor

En un checkout local con herramientas ya instaladas, ejecutar:

```sh
python3 scripts/audit-inventory.py
python3 -m unittest tests/test_audit_inventory.py
```

El primer comando emite JSON a stdout y no escribe archivos: fija HEAD/rama y la
referencia local de seguimiento, versiones de herramientas disponibles, SHA-256
de entradas y artefactos críticos, coincidencia del build record, digest del source
Meteora y estado de locks/evidencia. No consulta GitHub: `origin/master` es solo la
referencia local y el informe lo marca expresamente. No compila ni ejecuta programas.
El segundo comando comprueba el contrato de solo lectura, la correspondencia de
hashes y que reportes de runtime ligados a HEADs antiguos no se presenten como
pruebas actuales. El snapshot RustSec local conserva tres vulnerabilidades y siete
warnings; el generador no consulta ni actualiza esa base.

En esta revisión el build record conserva hashes coincidentes para sus 14 entradas
fuente y los hashes registrados de ELF, IDL y tipos también coinciden. El registro
no contiene commit; por eso el inventario verifica igualdad de bytes declarados,
pero no atribuye el build a un commit ni sustituye una reconstrucción independiente.
El inventario también separa las dos copias Meteora que coinciden con el registro
de build de otra salida local bajo `cargo-build/.../cp_amm.so`, cuyo SHA-256 difiere.
Esa copia discrepante no se trata como artefacto verificado ni se atribuye a una
causa sin reproducir su procedencia. Los manifiestos JS usan rangos semver, con
resolución registrada en `yarn.lock`; Cargo depende de `Cargo.lock`.

### Criterios de aceptación que siguen pendientes

| Área | Evidencia que debe obtener o revisar el auditor independiente | Estado actual |
| --- | --- | --- |
| Vesting | Revisar initialize/deposit/release, invariantes, cuentas alias, PDA, mint/beneficiary, reloj y casos límite; reproducir sobre el artefacto exacto | Fuentes y ELF hasheados; revisión externa pendiente |
| Depósitos excedentes | Demostrar contabilidad cuando el vault recibe transferencias directas y definir aceptación explícita de fondos potencialmente atrapados | Riesgo de diseño conocido; sin rescate administrativo |
| Custodia/recuperación | Analizar claves, beneficiario perdido, permisos combinados y ausencia de recuperación confiscatoria; verificar custodios elegidos | Direcciones/beneficiarios no fijados; decisión y revisión pendientes |
| Identidad/decimales del mint | Verificar mint real, programa propietario, decimales, supply y autoridades contra evidencia de estado autenticada en etapa autorizada | Sin mint real; pendiente y no ejecutado |
| M-03 `ruint` | Revisar callgraph completo, shifts y flags para cada modo permitido; comparar límites y resultados con versión corregida | Flag defectuoso reproducido; impacto económico no demostrado; abierto |
| M-04 `bincode` | Revisar deserialización loader, controles de owner/forma, compatibilidad upstream y política de soporte | Dependencia presente/compilada vía Anchor; callsite runtime cp-amm no demostrado; aviso de mantenimiento sin exploit concreto; abierto |
| Otros hallazgos Meteora | Resolver o aceptar por escrito los otros ocho IDs contra lock, features, ELF exacto y perfil de operaciones; revisar actualización compatible | Clasificaciones locales, ninguno declarado cerrado |
| Atomicidad nativa | Ejecutar transacción de varias instrucciones con fallo tardío en runtime/Bank transaccional y contrastar almacenamiento completo antes/después bajo procedimiento autorizado | `NATIVE_ATOMICITY_NOT_VERIFIED`; InvokeContext no equivale a rollback de Bank |
| Compatibilidad operativa 10B/9 | Confirmar configuración económica y mint real, cuentas/autoridades, aritmética y prueba SBF con artefactos exactos | Preparación offline histórica; identidad y evidencia de ejecución actual pendientes |

La salida de inventario es evidencia de integridad local, no firma del auditor ni
atestación de origen. Conservar el JSON y su hash por un canal independiente cuando
se encargue la revisión; no se entrega ni publica automáticamente en esta fase.
