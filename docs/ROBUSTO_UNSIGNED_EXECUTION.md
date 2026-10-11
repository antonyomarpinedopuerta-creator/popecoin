# Ejecución unsigned — continuidad 2026-10-11

NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED. OFFLINE_FIXTURE_ONLY.

## Atomicidad acotada

`tools/unsigned-runtime/src/engine.rs` ejecuta secuencias SBF en un **mismo**
InvokeContext Agave 3.1.14, compartiendo cuentas, trace y presupuesto. Devuelve
separadamente efectos raw (`staged`) y cuentas aceptadas por una política explícita
local (`committed`). Solo una secuencia completa se acepta; error/interrupción
(incluso después de la última instrucción y antes del commit ficticio) conserva
exactamente la entrada. Nada es una confirmación de red ni permite retry automático.

Ocho casos nuevos: deposit+release exitosos; release repetido; deposit repetido;
permiso signer ausente en un paso posterior; interrupciones antes de cada paso y
antes del commit; CPI release fallida por destino congelado. Conservación de tokens
comprobada sobre estados raw y aceptados. Los 24 casos anteriores siguen pasando.

**Resultado negativo relevante:** deposit+release+release fallida conserva en raw
las transferencias anteriores. InvokeContext **no revierte** la secuencia. Nuestro
descarte explícito del fixture no es una demostración de atomicidad real Solana.
Bank/SVM transaction processor, store/commit del ledger, fees, firmas, blockhash,
message privilege union y persistencia crash-safe no se prueban. Los permisos son
por instrucción ficticia; Solana normalmente compila privilegios por mensaje, por
lo que no se atribuye esta separación a mensajes reales. La interrupción se inyecta
entre pasos; no representa SIGKILL de almacenamiento en disco.

La investigación y ejecución no requieren claves, firmas, validadores ni RPC.
No cambia el contrato, sus dependencias de producción, ABI ni economía. No requiere
recompilar SBF. Se compila únicamente el harness aislado nuevo. Clippy offline
locked sin warnings. Hashes ELF siguen fijados por el harness anterior.

## Meteora ejecutado offline

Creación ficticia viable: ELF oficial `a30610058262a5c87e1b22144ef6053ff2cd8bc9f97b7e978a51e28f8ec3ea3c`
y SPL/Token-2022 locales fijados por hash. El exportador protegido sin claves reconstruye
la instrucción con el preparador canónico e IDL fijado; el harness exige SHA-256 exacto
del fixture completo. Veinte casos runtime: creación, falta de permiso payer/NFT,
autoridad/mint fuente incorrectos, fuente congelada, fondos A/B/payer insuficientes,
ambos mints no inicializados, owner mint incorrecto, liquidez cero/u128 máximo,
rango/activación/fee mode inválidos, creación repetida, vault sustituido y mismos mints.
Se exige cada error exacto, sin contabilizar errores arbitrarios como prueba aprobada.

Creación comprueba balances A/B, supply NFT=1, discriminadores/owners Pool/Position,
conservación de lamports y mints intactos. Las CPI de System/SPL/Token-2022 y eventos
son ejecutadas por SBF real, no mocks de preparador. El escenario B sin saldo demuestra
transferencia raw de A **antes** del fallo de B: descarte explícito obligatorio del
fixture; atomicidad nativa Solana sigue sin acreditarse. Para cada error se conserva
entrada aceptada y lamports raw; no se afirma ausencia de modificaciones raw.

Sin pools reales, wallets, firmas, custodia ni red. No cubre swaps/retiros/rewards,
Token-2022 como par, todo el protocolo o despliegue actual. Los tres advisories y siete
warnings del lock oficial siguen abiertos, BLOCKED_FOR_PRODUCTION_REVIEW; ejecutar
este perfil no corrige ruint ni certifica soundness universal.

Comando adicional antes del harness:

```sh
node --require ts-node/register scripts/prepare-unsigned-runtime-fixture.ts > target/unsigned-meteora-fixture.json
```

Validación: 24 casos previos + 8 de secuencias acotadas + 20 Meteora; Clippy offline
locked y TypeScript aprobados. 228 tests cliente con guard anti-claves/firma aprobados.
La primera pasada cliente encontró EPERM del sandbox al crear un subproceso ficticio
del journal; tras permiso para ejecutar fuera del sandbox, la suite completa pasó.
No se reconstruyó SBF: fuentes/ELF de los programas sin cambios.

## Estados adversariales y conservación del fixture

Quince escenarios adicionales ROBUSTO: beneficiario/mint/vault sustituidos, owner
vault/destino, mint destino, owner/discriminador/longitud/bump de vesting alterados,
released_amount superior al devengado, destino u64 máximo, cuentas readonly y programa
SPL sustituido. Catorce rechazos SBF se cotejan con códigos exactos y estado raw intacto.
El escenario u64 máximo se rechaza como fixture imposible antes de aceptar ejecución.

**Hallazgo conservado, sin atribuir explotabilidad:** con mint supply=100, vault=100
y destino=u64::MAX, el ELF SPL fijado devolvió éxito y destino=49. La suma inicial
excede el suministro y no representa un estado legal derivado del lifecycle SPL.
La ruta diagnóstica `execute_raw` reproduce ese comportamiento; no lo presenta como
seguro. `execute` rechaza balances clásicos conocidos superiores al supply (suma en
u128), wSOL sin respaldo y exención native con otro mint. Sin cambios al contrato o
SPL externo. No basta para declarar exploit real ni seguridad de todas las entradas.

Cinco tests host del engine prueban suma u128, respaldo/exención native, digest de
estado completo independiente del orden, interrupción vacía y cuentas duplicadas.
La primera prueba de duplicados también excedía supply y era rechazada antes: se
corrigió el fixture para aislar la duplicación, sin quitar el control de supply.

El preflight no autentica snapshots ni exige inventario completo de holders. Mints
ausentes y layouts malformados siguen requiriendo rechazo por el programa/rutas
correspondientes. La conservación acota fixtures conocidos; no sustituye validación
de owner/discriminador/autoridad ni una revisión independiente del SPL real.

## Recibos runtime y journal

El engine emite cinco recibos públicos derivados de las ejecuciones: éxito, secuencia
con doble release, permiso ausente después de deposit, interrupción antes de commit
y CPI fallida tras deposit. Incluyen digest de instrucciones/permisos y digests
separados before/committed/staged, conteos y CU locales. Nunca son firmas o atestaciones.
La referencia de tests conserva los hashes exactos de las fuentes del harness usadas.

`reconcileRuntimeFixture` conecta esos recibos con el journal existente. Exige scope,
flags anti-autorización, conteos y hashes válidos. Solo éxito completo cotejado con
expectativa externa y claim íntegro produce SIMULATED_CONFIRMED; fallo con entrada
aceptada intacta produce SIMULATED_FAILED_NO_EFFECT. Expone rawEffectsDiscarded para
que ese resultado no se confunda con ausencia de efectos raw. Interrupciones, incluso
tras el último paso, retornan UNCERTAIN. No libera claims ni permite retries.

Seis pruebas TypeScript con recibos reales capturados cubren reapertura, corrupción,
expectativa contradictoria, antigüedad, claims ausentes, flags alterados y doble
contabilización. Tres pruebas Python rechazan evidencia runtime incompleta/contradictoria.
No se autentica la procedencia criptográfica de un recibo suministrado por el llamador.

`check-unsigned-runtime.py --fixture-elf target/rehearsal-builds/WORKSPACE/program.so`
exige HEAD limpio, fija los cuatro ELF y todo el inventario Git público, comprueba que
el árbol normal aislado excluye LiteSVM/solana-keypair, reconstruye el fixture protegido
y ejecuta Cargo offline/locked. Liga resultados, recibos, ELF, binario del harness y
fuentes a HEAD en target/unsigned-runtime-report.json; cambios durante verificación o
salidas incompletas invalidan el resultado. Un fallo reemplaza el reporte vigente con
FAILED_INCOMPLETE_EVIDENCE. Es evidencia local, no una atestación independiente.

## Revisión residual Meteora y candidato

Auditoría --no-fetch repetida contra el lock oficial intacto y la base local: tres
advisories/siete warnings, exit 1, BLOCKED_FOR_PRODUCTION_REVIEW. Los 129 inputs de
fuentes Meteora siguen coincidiendo con el registro histórico. No se consultó upstream
ni despliegues. [Clasificación por dependencia/versión y mitigación](ROBUSTO_METEORA_DEPENDENCY_REVIEW.md#revalidación-offline--2026-10-11).

Regresiones aritméticas ampliadas de cinco a siete, **debug y release** contra ruint
1.14.0: identidad q*d+r para cada una de 512 fronteras de normalización, y cálculo
ceil del inventario del perfil realmente ejecutado, incluyendo liquidez u128 máxima
que supera conversión a u64 (el ELF Meteora la rechaza con Custom(6000)). Nunca se
invoca low-level reciprocal con entradas UB. Se conserva la prueba que demuestra
flag defectuoso de shift. Mitigaciones acotadas, ningún fix upstream aplicado.

| Dependencia / hallazgo | Camino y riesgo residual |
| --- | --- |
| bytes 1.10.1 / 2026-0007 | Feature opcional inactiva en SBF fijado; no corregido, revisar si cambia build. |
| ruint 1.14.0 / 2025-0137 | Activo; normalización acota condición inválida revisada; revisión externa de callers pendiente. |
| ruint 1.14.0 / 2026-0220 | Activo, defecto reproducido; flags ignorados y shifts acotados en perfil revisado; no seguridad universal. |
| bincode 1.3.3 / 2025-0141 | Runtime activo; mantenimiento abierto. |
| derivative 2.2.0 / 2024-0388 | Opcional inactivo; mantenimiento abierto. |
| paste 1.0.15 / 2024-0436 | Opcional inactivo; mantenimiento abierto. |
| anyhow 1.0.97 / 2026-0190 | Host, downcast_mut no encontrado en consumidores históricamente revisados; no auditoría exhaustiva. |
| keccak 0.1.4 / 2026-0012 | Host ARM opt-in ausente en perfil fijado; revisar otros targets/features. |
| rand 0.8.5 / 2026-0097 | Host/dev, feature log ausente en perfil fijado. |
| rand 0.9.1 / 2026-0097 | Opcional inactivo en perfil fijado. |

Paquete `--with-runtime-evidence`: exige scope/flags, HEAD/fuentes exactos, suites y
recibos completos, cuatro ELF fijados, digest del fixture y binario harness actual;
revalida antes de escribir. Incluye las fuentes públicas del harness, el fixture y
los ELF exactos junto con el reporte. Scope OFFLINE_FIXTURE_ONLY explícito. Sigue
requiriendo Git checkout/herramientas/dependencias instaladas para reproducir todo;
no es un entorno hermético ni una certificación de procedencia.

## Checklist vigente de lanzamiento

| Clasificación | Elementos |
| --- | --- |
| TERMINADO Y VERIFICADO | Harness unsigned de initialize/deposit/release y lifecycle; creación Meteora y CPI System/SPL/Token-2022/eventos; rechazos adversariales enumerados; conservación de fixtures conocidos; recibos/journal sin retry; evidencia HEAD/hashes y empaquetado ficticio verificable. Alcance exclusivamente local. |
| PARCIALMENTE VERIFICADO | Atomicidad: un InvokeContext compartido más commit/descarte del fixture, sin rollback nativo. Datos públicos locales sin autenticidad independiente. Modelos de rent/CU/límites, sin cotizaciones/fees reales actuales. ELF/IDL/reproducción ficticia no equivalen a identidad final. Swaps/retiros Meteora y mayor cobertura adversarial siguen disponibles para otra sesión. |
| BLOQUEADO TÉCNICAMENTE | No hay harness completo de Bank/transaction processor unsigned disponible en el registro local inspeccionado (`solana-svm`/`solana-runtime` completos no encontrados). LiteSVM sigue excluido por generación interna de claves. Esto no demuestra imposibilidad teórica; requiere herramientas o implementación adicional revisada. |
| REQUIERE DECISIÓN DEL PROPIETARIO | Custodia/dispositivos/firmantes, beneficiarios/calendario, importes/precio/presupuesto, proveedor y URI Arweave; ceremonia y autorizaciones expresas separadas. |
| REQUIERE AUDITORÍA EXTERNA | Programa propio/integración, callers y riesgos residuales Meteora, procedencia/compatibilidad de programas externos, entorno de custodia y RC definitiva. Tres advisories/siete warnings abiertos. |

No se agotaron todas las ampliaciones offline posibles. Continuar por swaps/retiros
y atomicidad con herramientas compatibles; no repetir suites o compilaciones sin
cambios pertinentes. NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED permanecen vigentes.
