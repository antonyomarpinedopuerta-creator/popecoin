# ROBUSTO — brechas de lanzamiento

2026-10-11. **NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED. OFFLINE_FIXTURE_ONLY.**
No es una RC de producción. Evidencia de partida: commit `9ccae5165e47`;
las ampliaciones de esta sesión quedan vinculadas al HEAD limpio por el gate runtime.

| Clasificación | Evidencia y pendiente |
| --- | --- |
| Completado y verificado | ELF ficticio ROBUSTO reproducido en dos builds, IDL y fuentes cotejados; initialize/deposit/release y CPI System/SPL sin firmas; creación Meteora con ELF fijado y CPI Token-2022; rechazos adversariales enumerados. Nuevas pruebas ejecutan add/remove de liquidez y swap2 con cuentas ficticias, no solo modelos. |
| Completado y verificado | Journal consume/reserva mensajes y bloquea reintentos; resultados desconocidos/interrumpidos permanecen UNCERTAIN; recibos incluyen estados raw y aceptados. Empaquetado exige HEAD/fuentes/ELF/harness/fixtures y hashes coherentes. Esto verifica integridad local, no autoría independiente. |
| Parcialmente verificado | Secuencias en un InvokeContext y descarte local; **no atomicidad transaccional nativa**. El raw conserva transferencias previas al fallo. Registro local inspeccionado sin solana-svm/solana-runtime completos; LiteSVM genera Keypair internamente. No se instaló ni ejecutó esa alternativa. |
| Parcialmente verificado | Vesting revisado: release vincula beneficiario firmante, mint, vault PDA y destino; CPI precede released_amount; checked_sub bloquea reloj regresivo/doble release; cálculo ensanchado evita overflow de timestamps válidos. Supone estado creado por initialize. No auditoría formal de todos los estados ni protección frente a upgrades maliciosos. |
| Parcialmente verificado | Meteora cubre el perfil clásico/wSOL y NFT Token-2022 fijado; no todas las extensiones, recompensas, delegados, modos swap ni estados del protocolo. Balances y lamports se conservan en fixtures conocidos. Rent/CU son locales, sin presupuesto ni cotización actuales. |
| Bloqueado por seguridad | Herramientas runtime que generan claves y rutas de compilación/firma histórica prohibidas. No desplegar, consultar redes Solana, crear identidades o publicar para completar evidencia. La atomicidad nativa requiere herramienta adicional revisada compatible con estas restricciones. |
| Requiere decisión del propietario | Custodia/firmantes, direcciones finales, beneficiarios/UTC, cantidades efectivas, capital/precio/rango, presupuesto, metadata/proveedor/URI y procedimiento de incidentes. Ver documento de decisiones. |
| Requiere revisión externa | Contrato y calendario, seguridad de integración, tres advisories/siete warnings, programas externos/procedencia/compatibilidad, custodia y versión final. Mantener BLOCKED_FOR_PRODUCTION_REVIEW. |

## Continuación vigente: compraventa y decisiones

Los doce swaps prueban B→A/A→B con trader independiente y creator ausente del inventario,
además de errores exactos de liquidez/límites, slippage, saldo, congelamiento y autoridad.
Trece casos de liquidez incluyen rechazo del retiro de una posición ajena. Ver
[revisión y matriz de permisos](ROBUSTO_AUTOMATIC_TRADING_REVIEW.md).
No hay servidor del creador en la ruta de swap; la disponibilidad de red, interfaces
externas y profundidad real no se ha verificado offline. Operadores Meteora conservan
poderes de status/fees; no prometer ausencia de controles administrativos externos.

La decisión actual deja **suministro, importes, precios, calendario y autoridades
finales pendientes**, aunque archivos históricos mantengan nombres "approved" para
fixtures. No comprar hardware wallet por ahora. Registro actual:
[restricciones](../config/robusto-owner-decisions-current.json). El
[presupuesto mínimo](ROBUSTO_MINIMUM_LAUNCH_BUDGET.md) separa gastos/capital/rent sin
inventar precios. Custodia de software requiere evaluación; riesgo residual de malware
y pérdida sin recuperación, sin certificación para fondos importantes.

## Riesgos Meteora abiertos

La base local y el lock fijados permiten revisión histórica offline, no conocer cambios
upstream posteriores. La clasificación detallada permanece en
[revisión de dependencias](ROBUSTO_METEORA_DEPENDENCY_REVIEW.md).

| Hallazgo | Dependencia/versión | Camino revisado / residual |
| --- | --- | --- |
| RUSTSEC-2026-0007 | bytes 1.10.1 | Feature opcional inactiva en SBF fijado; no parche aplicado. |
| RUSTSEC-2025-0137 | ruint 1.14.0 | Activo; normalización acota condición revisada; soundness/callers requieren auditoría. |
| RUSTSEC-2026-0220 | ruint 1.14.0 | Activo; defecto de flags reproducido; flags ignorados/shifts acotados solo en rutas revisadas. |
| RUSTSEC-2025-0141 | bincode 1.3.3 | Runtime activo, mantenimiento abierto. |
| RUSTSEC-2024-0388 | derivative 2.2.0 | Opcional inactivo; mantenimiento abierto. |
| RUSTSEC-2024-0436 | paste 1.0.15 | Opcional inactivo; mantenimiento abierto. |
| RUSTSEC-2026-0190 | anyhow 1.0.97 | Host; downcast_mut no hallado en revisión previa, no exhaustiva. |
| RUSTSEC-2026-0012 | keccak 0.1.4 | Host ARM opt-in ausente en perfil fijado; otros targets pendientes. |
| RUSTSEC-2026-0097 | rand 0.8.5 | Host/dev sin feature log en perfil fijado. |
| RUSTSEC-2026-0097 | rand 0.9.1 | Opcional inactivo en perfil fijado. |

Ninguno se cierra por pasar una prueba. Cambiar dependencias críticas exige evaluar
compatibilidad, recompilar y reproducir el ELF y volver a auditar/cotejar evidencia.

Plan operativo vigente con responsables, dependencias y criterios de cierre:
[ROBUSTO_OWNER_ACTION_PLAN.md](ROBUSTO_OWNER_ACTION_PLAN.md). Mantiene las aprobaciones
finales pendientes y distingue permisos de preparación de autorización de producción.

## Camino crítico, por dependencia

1. **Custodia y alcance de revisión:** elegir responsables, recuperación y auditoría.
   Sin esto no fijar identidades ni aceptar riesgos de poderes administrativos.
2. **Cerrar diseño operativo:** beneficiarios/UTC, cantidades efectivas, liquidez y
   presupuesto; verificar custodia de roles separados en el builder definitivo. El código actual
   ya rechaza mintAuthority=distributionSourceOwner; la afirmación previa de que
   seguían acopladas era obsoleta.
   Multisig, si se elige, necesita implementación compatible y pruebas.
3. **Cerrar seguridad técnica:** auditoría y retest, tratamiento upstream/residual de
   Meteora, prueba de atomicidad con procesador transaccional compatible, procedencia
   de programas externos y cobertura del perfil realmente seleccionado.
4. **Identidad y artefactos definitivos:** solo bajo autorización futura específica,
   fijar identidades públicas y generar/verificar versión correspondiente; reproducir
   ELF/IDL/fuentes/dependencias, manifiestos, backups y revisión de secretos. El programa
   ficticio actual no tiene identidad definitiva de producción.
5. **Contenido y financiación:** aprobar JSON/hash/proveedor/URI y cotizaciones frescas,
   cubrir gastos y liquidez por separado. Publicación/pagos requieren autorización.
6. **Ceremonia autorizada por pasos:** revisión externa, mensajes concretos, simulación
   y firma externa autorizadas; reconciliación antes de avanzar. Ante incertidumbre,
   detener. Sin autorización no hay lanzamiento ni envío alguno.

No se necesita recompilar SBF por ampliar el harness/documentación: contrato, ABI,
parámetros y dependencias de producción siguen intactos. El candidato incorpora la
nueva evidencia de ejecución después de un commit limpio y verificación de hashes.
No es hermético ni una atestación independiente; sus hashes deben conservarse por un
canal independiente para comprobar autenticidad más adelante.

## Validación histórica de la tanda anterior

- Runtime SBF: 24 casos previos, ocho secuencias acotadas, 20 creación/adversariales
  Meteora, 12 add/remove, cinco swap2 y 15 escenarios adversariales ROBUSTO aprobados.
- Rust host del harness: cinco pruebas; Clippy all-targets sin warnings.
- Python: 85 pruebas aprobadas, incluidas integridad y evidencia de candidato.
- TypeScript: tsc sin errores y 234 pruebas protegidas aprobadas. Una primera pasada
  encontró EPERM del sandbox en un subproceso de prueba; se repitió con permiso del
  entorno y pasó completa. No se relajaron controles de firma o claves.
- Auditoría lock Meteora offline: tres advisories/siete warnings, exit 1 esperado;
  ningún hallazgo cerrado. Las siete regresiones aritméticas debug/release previas
  siguen siendo evidencia histórica; no se repitieron porque no cambió aritmética.
- Metadata local verificada, JSON/URI definitivos pendientes. Escáner público sin
  hallazgos heurísticos; no equivale a garantía universal de ausencia de secretos.
- No compilación SBF nueva: solo compilación del harness. Reproducción previa de los
  dos ELF ROBUSTO vuelve a cotejarse al construir el candidato de HEAD final.

El reporte runtime y el archivo candidato finales se escriben en target (no Git):
contienen el HEAD exacto y hashes verificables. Para evitar autorreferencia, el hash
del paquete final se comunica en el informe de sesión, sin reescribir sus fuentes.


## Validación de esta continuación

92 casos/escenarios runtime: 24 instrucciones ROBUSTO, ocho secuencias acotadas,
20 creación/adversariales Meteora, 13 liquidez, 12 swaps y 15 adversariales ROBUSTO.
Rust host: cinco aprobados; Clippy all-targets sin warnings. Ocho pruebas Python
pertinentes (evidencia/candidato) y seis TypeScript (recibos/reconciliación) aprobadas
con protección anti-claves/firma. Las 85 Python/234 TypeScript completas de la tanda
anterior no se repitieron: sus cifras son evidencia histórica, no ejecuciones nuevas.

Lock Meteora auditado de nuevo --no-fetch: tres advisories/siete warnings, estado
BLOCKED_FOR_PRODUCTION_REVIEW. Sin cambios upstream o dependencias críticas.
No defectos nuevos verificados en contrato/journal que justifiquen cambios de SBF;
la evidencia final se reempaqueta ligada a HEAD limpio sin recompilar el contrato.

Si el propietario elige economía distinta de las referencias históricas, se deberá
adaptar y validar la configuración/builders que hoy fijan supply/reparto/duraciones,
y renovar los fixtures y artefactos afectados. No interpretar que el candidato actual
implementa cualquier suministro o calendario. Su valor es evidencia del perfil probado.

## Alternativa 10B/9 con USDC ficticio

[Integración y límites](ROBUSTO_METEORA_10B9_OFFLINE.md): builder separado, creación,
liquidez y swaps A→B/B→A ejecutados contra ELF Meteora local fijado, comprador
independiente y 9/6 decimales. El gate integrado enlaza 47 casos nuevos, 11 de
suministro/vesting y 92 históricos a HEAD limpio. No sustituye el candidato histórico.
Continúan pendientes atomicidad nativa, 3 advisories/7 warnings, auditoría,
financiación y aprobación económica/operativa; no hay RC de producción.

## Entrega para revisión independiente

[Expediente](ROBUSTO_EXTERNAL_AUDIT_SCOPE.md) y empaquetador local verifican fuentes,
locks, programas fijados, fixtures y reportes de HEAD limpio. Incluyen los diez avisos
abiertos del audit offline; no convierten revisión interna en auditoría. La revisión
no encontró defecto nuevo que justifique modificar el contrato. Donaciones excedentes
al vault, pérdida de acceso del beneficiario y upgrade authority son limitaciones o
riesgos que debe evaluar el auditor, sin añadir rescates administrativos por omisión.
[Financiación](ROBUSTO_EXTERNAL_FINANCING.md): sin contraparte comprometida ni precios
actuales, las vías externas siguen condicionadas; capital LP separado de gasto.
