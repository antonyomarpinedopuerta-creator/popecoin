# ROBUSTO — finalización técnica offline desde 5af7313

NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED. No se generan wallets, keypairs o secretos ni se firman/envían transacciones. No hay autorizaciones de producción derivadas de estos resultados.

## Diagnóstico y clasificación

| Requisito | Clasificación | Evidencia / siguiente paso |
|---|---|---|
| Compilación Rust y cálculo vesting | REQUIERE PRUEBAS O VERIFICACIÓN | Ejecutadas 10 pruebas host test_vesting con Cargo offline/locked; aprobadas. |
| SBF reproducible, identidad pública ficticia | REQUIERE PRUEBAS O VERIFICACIÓN | Compilador directo build-rehearsal.py, frozen/offline; primera compilación completa, segunda en curso. IDL adaptado del release existente, no regenerado independientemente. |
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
