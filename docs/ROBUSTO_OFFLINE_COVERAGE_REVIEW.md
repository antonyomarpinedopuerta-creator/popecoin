# ROBUSTO — revisión de cobertura offline desde 9735f7f

Estado: `NOT_AUTHORIZED_FOR_MAINNET` / `MAINNET_DISABLED`. Revisión técnica cualitativa por rutas y fallos, sin medición instrumental de porcentajes de cobertura. No es auditoría independiente ni certificación del lanzamiento. Sin RPC ni conexiones a Mainnet; los endpoints y genesis que aparecen en tests son datos de mocks. No se cambiaron dependencias.

| Ruta / riesgo prioritario | Evidencia ejecutada | Límite y siguiente trabajo |
|---|---|---|
| Deployment: cuentas/autoridades reutilizadas | Builder ahora rechaza buffer igual a cualquier beneficiario, además de roles/históricos ya protegidos | No comprueba disponibilidad real de la dirección; eso requiere snapshot autorizado |
| Deployment: ELF cambiado o capacidad inconsistente al reanudar | Verificador de buffer ahora exige config válida y ELF con identidad/hash/capacidad revisados, como el builder | ELF de fixture no equivale a binario SBF ejecutable ni programa auditado |
| Deployment: fragmentos/deploy alterados o duplicados | Nuevo ensayo recorre buffer-create, dos write fragments y deploy con ELF ficticio de 701 bytes; verifica roundtrip canónico, rechazo de duplicados y modificación de bytes en cada etapa | No ejecuta loader; faltan matriz completa de fallos de transporte/runtime y guard de presupuesto/snapshot para todas las etapas |
| Distribución: emisión/transferencias alteradas y supply inconsistente | Tests existentes de cantidades/autoridades/canonical stages, supply cero antes de emitir, conservación y 12 etapas unsigned | No se ejecutaron transferencias ni se prueba efecto real; falta reconciliación/journal de ejecución tras respuesta ambigua |
| Vesting: depósito repetido, released/schedule cambiados, source delegado/congelado | Se amplió el preflight mock: vault con saldo previo, released no cero, start cambiado, delegate y estado congelado se rechazan; conserva éxito válido antes de cada perturbación | No se ejecuta CPI/Clock real ni release. Pruebas Rust/runtime históricas no se presentan como repetidas hoy |
| Meteora: mint con tags binarios inválidos | Rechazo explícito de COption mint authority distinto de 1, initialized distinto de 1 y freeze option distinto de 0; regresiones con valores 2/255 | Snapshot de mint sigue siendo fixture; no autenticidad/frescura de cadena |
| Meteora: candidato alterado tras preparación | Nuevo `validatePreparedMeteoraLocal(input,candidate)` reconstruye preparación completa y exige igualdad exacta; tests cambian bytes/programa/destino/flags/orden/cantidades/sent y quote sintético | El consumidor debe invocar este gate; no se conectó a signer ni transport. Igualdad JSON conservadora también rechaza distinto orden de propiedades |
| Flujo unsigned: journal, cancelación, timeout, datos stale y presupuesto | Se repitió suite que cubre procesos concurrentes/reinicio/corrupción, respuesta tardía, deadline, límites y snapshots ficticios | Persistencia de fixtures no es journal de ejecución; no protege borrado/rollback administrativo ni verifica estado de red |

## Cambios y resultados

205/205 tests de cliente y 63/63 Python aprobados; TypeScript `--noEmit`, `git diff --check` y scan de seguridad aprobados sin hallazgos dentro de su alcance heurístico. Tres tests nuevos y ampliación del test de snapshot/preflight de producción. Identidades nuevas del ensayo de deployment construidas con bytes públicos, sin keypairs ni firmas. Meteora usa `localPublicFixture`; no wallets reales. Sin nuevo build SBF, RC completa, simulaciones RPC ni benchmark de cobertura. Los tests de empaquetado Python usan fixtures.

Se revisaron builders/validadores de deployment, preflight canónico, flujo unsigned/journal/condiciones, tests de distribución y vesting, preparación Meteora y evidencia histórica. Esta selección prioriza fondos, duplicados y alteraciones; no afirma inspección exhaustiva de todas las funciones de la aplicación o protocolo externo.

## Pendientes priorizados

1. **Alta, técnico offline:** más escenarios binarios y de fallo en preflight de cada etapa; completar integración del guard de estado/presupuesto/validez en deployment y candidato Meteora; reconciliación simulada ante timeout ambiguo. No habilitar reenvíos automáticos.
2. **Alta, decisión + integración:** elegir dispositivo/proveedor de firma; probar conector y verificación criptográfica en una etapa separada autorizada. El flujo actual solo rechaza firmas; no tiene capacidad sign/send.
3. **Alta, verificación externa:** revisión independiente Meteora y programa propio; fuente/IDL/bytes/authority vigentes en futura etapa autorizada. **Los 3 advisories y 7 warnings históricos permanecen abiertos**, sin nuevos audits de dependencias ni actualización para silenciar advertencias. Reachability acotada no equivale a fix o auditoría completa.
4. **Alta, candidato definitivo:** decisión del programa de vesting y artefactos reproducibles/RC completa con toolchains fijadas; no inferir equivalencia del ELF ficticio ni del runtime histórico.
5. **Propietario/manual:** custodia y recuperación real, controles/estabilidad del host, fecha/beneficiarios, precios/cantidades, política NFT/retiro, presupuesto/capital y publicación Arweave verificada. Ninguna prueba offline satisface estas autorizaciones.

La preparación segura puede continuar sin fondos; el lanzamiento real permanece bloqueado. No se autorizan identidades, firmas, deploys, pagos ni Mainnet.
