# ROBUSTO — finalización técnica offline desde 5af7313

NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED. Restricción vigente: no generar wallets, keypairs o secretos ni firmar/enviar transacciones. No hay autorizaciones de producción derivadas de estos resultados.

## Diagnóstico y clasificación

| Requisito | Clasificación | Evidencia / siguiente paso |
|---|---|---|
| Compilación Rust y cálculo vesting | REQUIERE PRUEBAS O VERIFICACIÓN | Ejecutadas 10 pruebas host test_vesting con Cargo offline/locked; aprobadas. |
| SBF reproducible, identidad pública ficticia | REQUIERE PRUEBAS O VERIFICACIÓN | Compilador directo build-rehearsal.py, frozen/offline; dos compilaciones completas e idénticas. IDL ficticio adaptado del release; posteriormente se regeneraron secciones del IDL release con Cargo y coincidieron con el artefacto. |
| Integración runtime vesting/CPI | REQUIERE PRUEBAS O VERIFICACIÓN | LiteSVM 0.10.0 new_inner llama Keypair::new; airdrop firma internamente y los tests existentes firman. No ejecutados bajo la prohibición actual. Se requiere harness que no genere claves ni firme o autorización específica posterior. |
| Reconciliación simulada | IMPLEMENTABLE AHORA | Implementada: confirmación con estado posterior exacto; fallo con estado previo exacto; incoherencia/ausencia/corrupción/stale = incierto. Ningún resultado permite retry. |
| Estado auténtico, fees/rent/CPI efectivos | REQUIERE PRUEBAS O VERIFICACIÓN | Fixtures y hashes declarados no autentican snapshots ni cotizaciones. No se consulta ninguna red. |
| Meteora: 3 advisories/7 warnings históricos | REQUIERE REVISIÓN INDEPENDIENTE | Evidencia local conservada; cinco tests aritméticos aprobados en dependencia sin actualizar, incluidos comportamiento defectuoso esperado y límites mitigados. No resolución. |
| Custodia y firmantes | REQUIERE DECISIÓN DEL PROPIETARIO | Ceremonia/identidades y dispositivo no autorizados. |
| Beneficiarios, fechas, mercado, Arweave | REQUIERE DECISIÓN DEL PROPIETARIO | No se cambian economía ni decisiones existentes. Direcciones, importes efectivos, precio, presupuesto, proveedor/URI y publicación pendientes. |
| Programa, integración y RC de producción | REQUIERE REVISIÓN INDEPENDIENTE | Revisión externa, artefactos definitivos y autorización expresa pendientes. |

## Reconciliación ficticia de ejecución

reconcileFixtureOutcome consulta el journal existente sin escribir. Solo acepta OFFLINE_FIXTURE_ONLY, SIMULATED, authorization=false y evidencia completa. Exige reserva íntegra, digest del mensaje coincidente, observación reciente/no futura, slot no anterior a preparación y fee dentro del máximo. Estados previos/posteriores iguales se consideran ambiguos. CONFIRMED requiere digest posterior exacto; FAILED requiere digest previo exacto. UNKNOWN, claim incompleto o contradicciones devuelven UNCERTAIN. Conserva retryAllowed=false y productionExecutionVerified=false siempre.

No es comprobante de ejecución: evidencia sintética suministrada por el llamador, sin autenticidad criptográfica externa. Tras un reinicio se puede repetir la consulta con evidencia fresca sin mutar ni liberar claims. Borrados/rollback privilegiados y reconciliación real siguen fuera del alcance. No se almacenan observaciones como autorizaciones ni se habilita transporte.

Validación: 224 pruebas cliente aprobadas, TypeScript, diff --check y scan heurístico sin hallazgos. Los tests cubren resultados tras reapertura, estado desconocido, claims ausentes/corruptos, digest contradictorio, efecto incompatible con fallo, antigüedad, futuro, slot, fee, ambigüedad y rechazo de scope de producción/datos incompletos.

## Compilación y candidato ficticio reproducible

Dos workspaces nuevos con el Program ID público determinista `YMN9Qj5jPNp7j14VPcML1B6xGgcPWVZUGLFU3Mnyfaf` compilaron mediante platform-tools v1.52, Cargo directo `--release --target sbpf-solana-solana --lib --frozen`, CARGO_NET_OFFLINE=true y objcopy strip-all. Ambas compilaciones produjeron exactamente **232528 bytes**, SHA-256 **e932987ffdb686dcffd3563ca2bbccdfcf51dc89debefb6d6cb046e5f5bf7ecb**. No se invocaron build-sbf, deploy, airdrop ni firmas. Versiones host consultadas: Rust 1.89.0, Anchor CLI 1.1.2, Solana CLI 3.1.10, Node 24.10.0. No se instalaron herramientas.

`offline-fixture-candidate.py --first WORKSPACE_A --second WORKSPACE_B --program-id PUBLIC_FIXTURE_ID` verifica los dos manifests con el compilador existente, correspondencia de fuentes/herramientas/ELF, árbol limpio y revalidación antes de escribir. Empaqueta únicamente fuentes copiadas explícitas, ELF, IDL adaptado, tres archivos de metadata pública y reporte. Tar/gzip determinista, checksum externo y verificación sin extracción mediante backup-public.py. Salida en un directorio nuevo de target/offline-fixture-candidates. El reporte conserva HEAD y limitaciones; no es RC de producción ni paquete completo del repositorio. Hash de referencia debe conservarse separadamente para autenticar restauración.

Cuatro tests Python nuevos cubren determinismo/lectura del paquete, workspace repetido, herramienta/binary alterados, árbol sucio y cambio de metadata durante empaquetado. Suite completa Python: 71 aprobados. El candidato real de esta sesión se generará después del commit limpio; sus paths/hashes quedan en el reporte local. No se afirma que el IDL adaptado haya sido generado independientemente ni que el runtime haya sido validado.

Para reproducir sin generar claves: ejecutar build-rehearsal.py dos veces con ese Program ID y `--build --platform-tools RUTA_INSTALADA`; después ejecutar el empaquetador anterior con las dos rutas nuevas. Evitar npm run check/check:rc/build:safe y los tests LiteSVM bajo las restricciones actuales: sus rutas invocan herramientas no aprobadas para este alcance o generación/firma de identidades.

## Restricción activa de identidades en la suite cliente

La primera pasada de la suite heredada ejecutó un helper de robusto-production.test.ts que generaba keypairs efímeros en memoria y conservaba solo la dirección pública; no persistía claves ni firmaba. Se detectó después de esa ejecución y se sustituyó por hashes públicos deterministas filtrados on-curve, sin derivación de claves privadas. tests/run.ts carga ahora primero offline-safety.ts, que bloquea Keypair.generate/fromSeed/fromSecretKey y las funciones de firma de transacciones legacy/versionadas. El guard falla si una ruta futura intenta usarlas. Esto no certifica todas las bibliotecas criptográficas ni vuelve segura la suite Rust LiteSVM, que permanece omitida.

El candidato local del commit d725d59 se generó y verificó sin extracción: SHA-256 730ce8eae77e8a2fc91d08d37fe9630d1025ab97936f8adcc59d7f49605491ff. Su manifest conserva ese HEAD; no se presenta como candidato de commits posteriores. Inspección ROBUSTO inspect-offline confirmó contenido/logo aprobados, uploadConfigured=false, publicationVerified=false y URI/JSON final pendientes.

Validación con el guard activo: 225/225 cliente, TypeScript, diff --check y escaneo heurístico aprobados. No se ejecutaron firmas ni las rutas Rust de generación de identidades. La generación efímera de la primera pasada se registra arriba como desviación corregida, sin convertirla en evidencia de custodia.

## Mints y riesgos Meteora

El guard de creación exige ahora bytes del mint ROBUSTO idénticos a los ya revisados por prepareMeteoraLocal y bytes canónicos del mint wSOL clásico (82 bytes, inicializado, 9 decimales, supply cero, sin mint/freeze authorities ni payloads ambiguos). Se repite antes/después de revisión junto con cuentas fuente, balances y presupuesto. Tests de bytes ausentes, longitud, supply, decimales, autoridad y estado alterados. Suite cliente protegida: **226/226**, TypeScript, diff --check y escaneo heurístico aprobados.

La evidencia histórica local conserva bytes 1.10.1 (RUSTSEC-2026-0007) y ruint 1.14.0 (RUSTSEC-2025-0137, RUSTSEC-2026-0220); warnings: bincode, derivative y paste sin mantenimiento; anyhow, keccak y rand 0.8.5/0.9.1 con avisos de unsoundness. Son tres advisories y siete entradas warning históricas, sin actualización del advisory database en esta sesión. Los cinco tests aritméticos ejecutados usan ruint=1.14.0, con fuente comparada byte a byte con tests/meteora_advisory_arithmetic.rs; uno conserva explícitamente un resultado de overflow flag incorrecto. Límites de normalización/reachability o ausencia de una dependencia opcional en una ruta no equivalen a resolución. No se cambiaron dependencias ni se concluyó seguridad del programa desplegado.

No hay verificación nueva de costes CPI, consumo de compute, instrucciones del loader ejecutadas ni swaps/depósitos/retiros del guard. Las rutas históricas de rehearsal que sí firman permanecen sin ejecutar y no aportan cobertura nueva a esta sesión.

## Checklist final vigente

- [x] Reconciliación ficticia conservadora sin liberar reservas ni permitir retry.
- [x] Suite cliente con guard activo de no generación/importación/firma; cuentas/mints/bytes/presupuestos ficticios validados.
- [x] Diez tests Rust host de vesting; cinco de aritmética advisory; dos SBF ficticios bit-idénticos.
- [x] Paquete ficticio local verificable y determinista; metadata/logo locales inspeccionados.
- [ ] Harness runtime sin generación de keypairs ni firmas, o autorización específica posterior para otro alcance. No modificar dependencias críticas para eludirlo.
- [x] Secciones IDL release regeneradas con Cargo y comparadas con el artefacto existente.
- [ ] RC con identidad definitiva; reproducibilidad y revisión de todos los artefactos finales.
- [ ] Autenticidad independiente de snapshots, cotizaciones, costes CPI y reconciliación de ejecución real.
- [ ] Revisión independiente del programa propio y Meteora, con tratamiento de cada advisory/warning.
- [ ] Decisiones del propietario: custodia/firmantes, direcciones, beneficiarios, calendario, precio/importes/presupuesto, proveedor y URI Arweave.
- [ ] Autorización expresa por operación real. NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED permanecen vigentes.

Siguiente acción técnica: disponer de un harness local que no construya identidades secretas ni firme y contrastar lifecycle/CPI contra los artefactos; el LiteSVM instalado no cumple ese requisito. La RC ficticia no sustituye esa prueba ni una auditoría independiente.

## Cierre de compilación host y correspondencia IDL

Cargo build --offline --locked -p popecoin_vesting --lib aprobado. Cargo test --lib sin features ejecutó cero tests; no se contabiliza como cobertura. test_vesting ejecutó 10 pruebas; idl-build ejecutó 5 tests generados de impresión (no son pruebas de lógica financiera). Rust/Anchor lock resuelve anchor-lang/anchor-spl 1.2.0 aunque manifest pide versión compatible 1.1.2 y CLI instalada es 1.1.2; no se cambió el lock. La compilación directa usa las dependencias fijadas.

Se ejecutó Cargo offline/locked --lib --features idl-build __anchor_private_print_idl -- --show-output --quiet, con ANCHOR_IDL_BUILD_PROGRAM_PATH explícito y resolución TRUE. --lib evita compilar/ejecutar integración LiteSVM. verify-offline-idl.py normaliza nombres de tipos únicos y orden de definiciones como el builder Anchor; exige secciones completas/no duplicadas y generación exitosa. El IDL resultante coincide estructuralmente con target/idl/popecoin_vesting.json, hash canónico **40c9187346e68fde15522a6282b39704814154373468d08c3c83f15269bf668e**. No se sobrescribió el IDL original. Cuatro tests Python cubren ABI alterada, secciones corruptas/incompletas/duplicadas, fallo de generación y colisión de nombres.

llvm-readelf verificó ELF64 little-endian DYN, máquina Solana Bytecode Format, entrypoint 0x155C8. No hubo warnings/errors en las dos compilaciones SBF ni en test_vesting; los advisories históricos siguen abiertos. Últimas suites: **226 cliente**, **75 Python**, **10 Rust vesting**, **5 Rust aritmética Meteora** y **5 tests generados IDL**, aprobados. TypeScript, metadata ROBUSTO inspect-offline, diff --check y scan heurístico aprobados. Las pruebas de runtime omitidas y sus causas siguen indicadas arriba.

El alcance técnico restante incluye harness runtime/CPI que respete la prohibición de keypairs/firmas, identidad y RC de producción, autenticidad de datos, revisión independiente y decisiones del propietario. No se afirma que todos los desarrollos posibles hayan terminado ni que exista autorización de lanzamiento.
