# ROBUSTO — revisión de cobertura offline desde 9735f7f

Estado: `NOT_AUTHORIZED_FOR_MAINNET` / `MAINNET_DISABLED`. Revisión técnica cualitativa por rutas y fallos, sin medición instrumental de porcentajes de cobertura. No es auditoría independiente ni certificación del lanzamiento. Sin RPC ni conexiones a Mainnet; los endpoints y genesis que aparecen en tests son datos de mocks. No se cambiaron dependencias.

## Ampliación desde ee70f80: integración de condiciones

La integración básica del guard en deployment y creación Meteora queda implementada y probada; supera ese pendiente específico de la revisión histórica siguiente. `createGuardedFixtureSession(...).prepare(...)` acepta buffer-create, cada fragmento y deploy; `createGuardedMeteoraFixtureSession(...).prepare(...)` admite únicamente creación de pool reconstruida desde `prepareMeteoraLocal`, con scope público ficticio. Ambos reutilizan `validateFixtureConditions`, un ticket común de revalidación y la misma lógica de deduplicación/reserva persistente y handoff unsigned. No se duplicaron validadores de presupuesto, antigüedad o blockhash. Los helpers de menor alcance siguen sin adquirir automáticamente estos gates.

En preparación se exige wire exacto y snapshot completo, estado esperado, payer/saldo/reserva, límites fee/rent/total, ventana de altura simulada y snapshot reciente. Antes/después del adaptador se repiten esos controles y el fingerprint de configuración/candidato. Deployment exige nuevas cuentas ausentes y buffers existentes no ejecutables del loader. Meteora exige ausencia de cuentas nuevas de pool/posición/vault/NFT, mints/fuentes existentes no ejecutables bajo SPL clásico y hash del mint coherente con sus bytes revisados. El fixture de éxito usa datos diferentes por etapa; no representa una secuencia ejecutada que actualice realmente la cadena.

Las reservas sobreviven éxito, cancelación, timeout y error cuando se usa la misma ruta de journal; dos sesiones simultáneas compiten por la misma reserva. Sin ruta, solo se deduplica dentro de la sesión. Respuestas sustituidas, cambios posteriores y expiración durante revisión se rechazan; un fallo posterior no libera la reserva. No es un sistema de autorizaciones ni de ejecución.

Validación: **212/212 tests cliente**, **63/63 Python**, TypeScript, formato y scan de seguridad aprobados (heurístico, sin hallazgos). Siete tests nuevos recorren las cuatro etapas ficticias de deployment (create, dos writes, deploy) y creación Meteora: válido, datos faltantes/alterados/stale, expiración, saldo/presupuesto, estados ocupados/owner incorrecto, concurrencia entre sesiones con journal, duplicado después de nueva sesión, cancelación/timeout/error en todas las etapas y sustitución de respuesta. Los tests existentes del journal repiten concurrencia entre procesos y corrupción. No hubo RPC, wallets reales, firmas, fondos, cambios de dependencias ni RC/SBF nuevos.

**Limitaciones pendientes:** no se integró decodificación binaria del buffer/cursor dentro del nuevo ticket (el verificador especializado existe por separado); tampoco balance/mint/delegate/estado binario completo de cuentas fuente SPL, estado real de metadata o autenticidad de snapshots. El presupuesto comprueba lamports declarados y débitos System explícitos, no deduce fees/rent por CPI ni inventario/contraparte del pool. `programData` rent y costes Meteora siguen siendo estimaciones sintéticas aportadas por el llamador. No hay cobertura del guard para swaps, depósitos posteriores, retiradas, locks o gestión de posiciones Meteora. No ejecutar esas rutas asumiendo que están protegidas por este adaptador. No se validan cambios reales de red ni efecto de instrucciones.

Siguen pendientes reconciliación/journal de ejecución real, fuente verificable de snapshots y cotizaciones en etapa autorizada, dispositivo/conector, RC definitiva, custodia y Arweave. Los **3 advisories y 7 warnings históricos de Meteora permanecen abiertos**, sin verificación independiente nueva. `NOT_AUTHORIZED_FOR_MAINNET` continúa vigente.

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

## Refuerzo del buffer desde 2257b45

El ticket guarded exige ahora bytes base64 canónicos acotados y ligados al SHA-256 del snapshot para program-write y program-deploy. Reutiliza verifiedPrefix: comprueba cabecera, autoridad, tamaño, prefijo ELF y cola cero; cada write debe corresponder exactamente al cursor observado y deploy al ELF completo. Se repite antes y después de revisión. También se rechaza suma de débitos/reserva fuera de u64. Esto supera únicamente la limitación binaria del buffer descrita arriba.

Limitación: el cursor inferido de bytes cero puede ser ambiguo cuando un fragmento del ELF contiene ceros; se rechaza la discrepancia, sin inventar historial de escritura. Se requiere historial independiente para resolverla. No prueba efectos del loader, CPI, estado de producción ni reanudación real.

Validación de este conjunto: 214 pruebas cliente, 63 Python, TypeScript, diff --check, metadata y scan heurístico de seguridad. Fixtures de bytes ausentes, hash incorrecto, autoridad incorrecta, cola no cero, prefijo alterado, tamaño y desbordamiento agregado. NOT_AUTHORIZED_FOR_MAINNET.

## Diagnóstico conservador del journal

`openFixtureJournal(...).inspect(digest)` consulta únicamente el claim ficticio: UNRESERVED, CONSUMED_NOT_AUTHORIZED o UNCERTAIN. Ningún estado permite retry ni concede autorización. Detecta archivos incompletos, corrupción, digest restaurado diferente, permisos incorrectos, symlinks y entradas adicionales, sin reparar ni eliminar. Un root inválido produce error; apertura no bloqueante evita esperar indefinidamente sobre un archivo especial sustituido.

La consulta no prueba ejecución ni reconciliación on-chain. Un claim consumido solo acredita reserva local. Snapshot diagnóstico sujeto a concurrencia; la exclusión sigue dependiendo del mkdir atómico en reserve. Borrado/rollback por el mismo usuario o administrador no se detecta de forma universal. No se habilitan reintentos automáticos ni restauraciones de producción.

Validación del journal: 217 pruebas cliente aprobadas con el guard de fuentes integrado; TypeScript, diff --check y escaneo heurístico sin hallazgos. La prueba de subproceso/FIFO recibió EPERM dentro del sandbox y pasó al repetir fuera del sandbox con permiso; no se desactivó ningún control Git.

## Fuentes SPL de Meteora y prioridades de continuidad

El ticket de creación Meteora integra `validateTokenSourceFixture`: bytes clásicos de 165, mint y autoridad payer exactos, estado inicializado, ausencia de delegado/close authority y payloads de opciones limpios, saldo token suficiente para el inventario calculado y semilla B. wSOL exige native option y lamports que respalden reserva más amount. Se revalida alrededor del adaptador unsigned. Exclusivo de fixtures públicos; no admite Token-2022, swaps, depósitos posteriores ni retiradas.

Validación ejecutada: **221/221 cliente** (9 más que la línea base), **63/63 Python**, TypeScript, diff --check, metadata local y escaneo heurístico sin hallazgos. No se ejecutó nueva compilación SBF, tests Rust de runtime, reproducción ni RC completa. Las pruebas Python de empaquetado usan fixtures y no certifican un artefacto compilado del HEAD. No se modificaron dependencias, economía ni programas on-chain.

| Prioridad | Estado y dependencia |
|---|---|
| Buffer binario y cursor en guard | Completado en el modelo; ceros ambiguos requieren historial independiente. |
| Diagnóstico persistente de claims | Completado; no acredita ejecución ni impide rollback privilegiado. |
| Fuentes token de creación Meteora | Completado en fixtures; falta autenticidad del snapshot, semántica completa de ambos mints/metadata y runtime CPI. |
| Reconciliación de ejecución | Pendiente: máquina de estados y evidencia independiente; nunca liberar una reserva incierta. |
| Costes CPI y presupuestos | Pendiente: modelo de rent/fees por etapa contrastado con runtime en futura etapa autorizada. |
| RC reproducible definitiva | Pendiente: revisar herramientas para impedir generación automática de keypairs antes de ejecutar builds; construir y verificar artefactos en alcance autorizado. |
| Distribución/vesting | Invariantes cliente existentes pasan; no se repitió ejecución Rust/SBF ni revisión independiente. Direcciones/calendario definitivos pendientes. |
| Riesgo Meteora | 3 advisories/7 warnings históricos abiertos; no hubo verificación independiente nueva. |
| Custodia y firma externa | Decisión del propietario y autorización específica. Solo adaptador ficticio implementado. |
| Metadata/Arweave/mercado | PNG y contenido local preparados; proveedor, coste, URI, precio, fondos y publicación pendientes de decisión/autorización. |

Estado obligatorio: NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED. Los snapshots son suministrados por el llamador; coincidir con una expectativa ficticia no prueba estado real. No se recomienda lanzamiento hasta revisión independiente, RC verificable, custodia y autorizaciones explícitas.
