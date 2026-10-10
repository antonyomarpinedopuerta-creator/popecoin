# ROBUSTO — plan futuro de ejecución de producción

**Estado:** plan preparado; `MAINNET_DISABLED` / `NOT_AUTHORIZED_FOR_MAINNET`. No contiene comandos de firma/envío y ningún paso se activa por generar este archivo. No reutilizar las identidades de rehearsal ni el global Solana keypair. Ninguna aprobación económica local constituye autorización de operación.

## Avance offline desde d9f3387 — 2026-10-10

### Integración unsigned canónica desde 1aeed59 — 2026-10-10

`createCanonicalFixtureSession().review(...)` une la configuración pública validada, IDL/program, `validatePreparedStage`, construcción canónica con payer y blockhash del mensaje y revisión independiente de hash/firmantes. Exige igualdad exacta del wire unsigned; una revisión de hash que incluya instrucciones extra no basta para pasar el gate canónico. Solo permite `OFFLINE_FIXTURE_ONLY`, sin firmar/enviar ni RPC. El helper de handoff básico sigue siendo de bajo nivel y no certifica etapas canónicas por sí solo.

La sesión consume el hash del mensaje antes de invocar al adaptador: bloquea duplicados concurrentes, repetidos y reintentos tras error, cancelación o timeout. No hay reintento automático; un ensayo nuevo requiere una sesión nueva y revisión nueva. Esta protección vive en memoria: no sustituye journal persistente, control entre procesos ni autorización de producción; cambiar blockhash cambia el mensaje. Copias inmutables de los campos revisados y snapshots de label/kind evitan que el adaptador cambie el resultado mutando objetos del llamador.

Se corrigió el timeout cuando el adaptador bloquea el event loop: además del timer se verifica tiempo transcurrido monotónico antes de aceptar respuesta. Las excepciones síncronas del adaptador se canalizan por la misma promesa; las respuestas/fallos tardíos no convierten una solicitud cancelada o vencida en éxito. AbortSignal notifica cancelación, pero no puede forzar la detención de un adaptador no cooperativo.

Validación offline: **190 tests cliente y 63 Python aprobados**, TypeScript `--noEmit`, `git diff --check` y scan de seguridad sin hallazgos dentro de su alcance heurístico. Cinco tests nuevos cubren las 12 etapas de token/distribución/vesting, sustitución de etapa, IDL incorrecto, instrucciones extra, duplicados, mutación del llamador, timeout con event loop bloqueado, cancelación pendiente, excepciones síncronas y fallos tardíos. Direcciones nuevas de estos tests construidas únicamente con bytes públicos ficticios; no keypairs ni firmas criptográficas. No se reconstruyó SBF ni RC completa.

Límites pendientes: no se declara ensayo extremo a extremo de deployment ELF/buffer ni Meteora mediante este puente. El validador canónico no sustituye revisión independiente de rent/presupuesto, snapshot/genesis, blockhash/expiry o estado de cuentas. Hardware/conector, verificación de firmas reales/parciales, transporte real y journal persistente requieren trabajo posterior y decisiones/autorizaciones. Metadata/Arweave, custodia y riesgos históricos Meteora permanecen abiertos. `NOT_AUTHORIZED_FOR_MAINNET` / `MAINNET_DISABLED` continúan vigentes.

### Revisión técnica desde f21ffae — 2026-10-10

La laptop permanecerá conectada al cargador por decisión del propietario; el diagnóstico de batería queda pendiente. Esto no certifica estabilidad ni cierra la recuperación fallida de hibernación. Internet permanece activo para desarrollo. `NOT_AUTHORIZED_FOR_MAINNET` se conserva.

| Clasificación | Estado y siguientes pasos |
|---|---|
| Terminado y probado en su alcance | Builders unsigned y guards; aritmética/políticas locales; logo y contenido aprobados; prueba física ficticia S22; preflight Linux. El nuevo ensayo de revisión externa mantiene bytes/hash exactos y rechaza firmas, alteraciones, cancelación, timeout y fallos de transporte |
| Completado autónomamente en esta revisión | Cancelación mediante AbortSignal y timeout de revisión de 30 segundos por defecto (rango 1–60000 ms), notificación al adaptador, rechazo aun si ignora cancelación y limpieza de temporizador/listeners. Cuatro regresiones nuevas sin keypairs, firmas ni RPC. Revalidación de metadata e inventario público vacío |
| Trabajo técnico que sigue siendo posible offline | Ampliar escenarios unsigned y revisar enlace con etapas canónicas; preparar/reproducir el candidato definitivo tras fijar alcance del programa. Estas tareas no cierran compatibilidad de dispositivo, revisión independiente ni controles físicos. No hace falta generar identidades para esos ensayos |
| Bloqueos técnicos de producción | Conector de firma real y validación criptográfica todavía ausentes; compatibilidad del dispositivo, firmas parciales/múltiples y UX real pendientes. Falta RC completa/reproducción del candidato final y verificación actual autorizada del deployment externo. Metadata final depende de URI de imagen publicada; no hay uploader seleccionado/integrado. Findings Meteora históricos continúan sin resolver |
| Decisiones/autorización del propietario | Dispositivo y diseño de custodia/recuperación de ocho roles; identidades/mint/program públicos; programa de vesting y autoridad de upgrade; fecha/beneficiarios; P0/Pmax y cantidades efectivas, circulación y política NFT/retiro; proveedor Arweave, presupuesto y capital; autorización separada de publicación/pago y de cada operación real |
| Verificación externa/manual | Revisión independiente de código/riesgos Meteora y evidencia de artefactos; recuperación en otro equipo; historial/transcripción, hibernación, telemetría, backup/sync y estabilidad sostenida del host. Red conectada es válida para desarrollo, pero bloquea una ceremonia offline |

Resultados ejecutados en esta revisión: **185/185 tests cliente**, **63/63 tests Python**, `tsc --noEmit`, inspección offline de publicación y `check:metadata` aprobados; inventario `EMPTY_NO_IDENTITIES` (0/8 roles). `git diff --check` y scan de seguridad sin hallazgos dentro de su alcance heurístico. Sin nuevo build SBF, RC completa ni audit de dependencias actualizado; los tests Python de RC usan fixtures. La evidencia histórica de Meteora (3 advisories/7 warnings) no se refrescó mediante red.

El timeout nuevo limita la espera del ensayo local: no comprueba expiración de blockhash on-chain ni garantiza detener operaciones internas de un adaptador que ignore AbortSignal. El adaptador sigue sin capacidad sign/send y `productionSignerIntegrated=false`. Integrarlo con un dispositivo de producción requiere diseño/revisión y autorización posteriores. El lanzamiento no queda desbloqueado por pruebas ficticias ni por mantener el cargador conectado.

| Área | Completado y probado | Bloqueado o pendiente |
|---|---|---|
| Software base | Builders unsigned, guards, aritmética y evidencia histórica de rehearsal; nuevo ensayo de handoff externo | Nueva RC/reproducción del candidato definitivo y revisión independiente; no inferir vigencia de artefactos anteriores |
| Firma externa | Contrato `prepareExternalHandoff` y adaptador ficticio `reviewUnsigned`: mensaje/hash, payer y lista ordenada de firmantes ligados a revisión independiente; rechazo de alteraciones y cualquier firma | Elegir dispositivo/proveedor/derivaciones; implementar conector y verificación criptográfica de respuestas; probar firma parcial/múltiple, cancelación, expiración, transporte y rechazo de mensajes alterados con el dispositivo elegido |
| Custodia | Fixture físico S22 completado con hashes/descifrado verificados y transporte USB confirmado por el propietario | Controles y estabilidad del host, diseño/custodios y ceremonia privada expresamente autorizada; ocho direcciones, mint/program y recuperación real aún pendientes |
| Metadata | PNG oficial validado; nueva inspección offline coteja nombre/símbolo/descripción/logo contra aprobación de contenido y mantiene pagos/uploads desautorizados | Proveedor/cuenta/cotización Arweave; autorización de publicación/pago, URI de imagen, bytes/hash JSON final, URI metadata y verificación desde gateway independiente |
| Meteora | Revisión de evidencia fijada y tests offline del perfil concentrado OnlyB; preflight de red ahora exige opt-in explícito antes de consultar o reemplazar evidencia | Findings sin corregir; revisión externa y revalidación futura autorizada de fuente, lock/features, IDL, binario y upgrade authority; sin consulta actual de red en esta etapa |
| Economía y vesting | Supply/distribución/duraciones y perfil de preparación conservados | Precio P0/Pmax en SOL, cotización SOL/USD, cantidades efectivas, circulación, fecha base/beneficiarios y política de posición/NFT |
| Ejecución | Ningún envío ni firma habilitado por esta preparación | Decisión de programa propio, presupuesto/capital, simulaciones y preflight frescos, autorización específica de cada mensaje y reconciliación/journal |

### Prioridad técnica y límites de la firma externa

1. Ejecutar las suites offline y la inspección de metadata. El ensayo nuevo solo usa direcciones públicas ficticias y un adaptador simulado; no crea keypairs ni usa un validador.
2. El handoff soporta transacciones legacy de hasta 1232 bytes. Rechaza base64 no canónico, instrucciones/payer/firmantes/blockhash distintos del mensaje revisado y firmas presentes. Su scope es `OFFLINE_FIXTURE_ONLY`; no consume aprobación de producción, no prueba posesión ni firma Ed25519 y no sustituye una wallet/hardware real. `productionSignerIntegrated=false` sigue siendo obligatorio.
3. No conectar ese adaptador de ensayo a un firmante de producción. La futura integración debe verificar canonical stage (`validatePreparedStage`), snapshot/genesis, blockhash/expiry, presupuesto, dispositivo/rol y aprobación exacta antes de solicitar firmas. Debe validar criptográficamente cada firma devuelta contra los mismos bytes y conservar firmas parciales sin permitir instrucciones adicionales. Versioned transactions/multisig requieren diseño y pruebas separados.
4. Solo después de elegir el dispositivo se pueden cerrar compatibilidad, derivaciones, transporte y UX de confirmación. Ninguna prueba ficticia permite declarar esos gates completados. Evitar añadir dependencias o escoger un proveedor sin esa decisión.

Comandos actuales sin red ni subida:

```bash
npm run test:client
python3 -m unittest discover -s tests -p 'test_*.py'
./node_modules/.bin/tsc --noEmit
node --require ts-node/register scripts/robusto-metadata-publication.ts inspect-offline
npm run check:security
```

La inspección de metadata no escribe JSON final mientras `imageUri=null`: informa `finalBytesReady=false` y hash final pendiente. No usa IDs ficticios como artefactos publicables. `prepare`/`verify` existentes siguen separados de cualquier uploader; `verify` coteja bytes descargados, no certifica permanencia ni pago.

Validación de este avance: 181 pruebas de cliente y 63 de Python aprobadas; TypeScript `--noEmit`, `check:metadata`, `check:security` y `git diff --check` aprobados. El inventario de custodia continúa `EMPTY_NO_IDENTITIES` (ocho roles sin dirección). El scan es heurístico, sin hallazgos; no demuestra ausencia absoluta de secretos. No se reconstruyó SBF ni se generó una RC completa nueva; las pruebas de RC dentro de la suite Python usan fixtures, no artefactos de lanzamiento.

### Riesgos Meteora revisados offline

La evidencia de 2026-10-07 fija `cp-amm 0.2.4`, commit `a85c926607433f23f0ea60f4ca7b1ae92f4156cb`: **3 advisories y 7 warnings históricos permanecen**. `bytes 1.10.1` es dependencia opcional desactivada en el build revisado; el recíproco vulnerable de `ruint 1.14.0` recibe divisores normalizados en los callers revisados; el defecto de flags de shifts se alcanza, pero sus resultados problemáticos se descartan en esos callers acotados. Son argumentos de alcance, no fixes ni auditoría completa. El scanner histórico sigue `BLOCKED_FOR_PRODUCTION_REVIEW`.

No se afirmó que upstream o deployment estén sin cambios hoy. No se ejecutó `robusto-meteora-readonly-preflight.py`: ese script consulta Mainnet y queda fuera del alcance actual. Ahora rechaza ejecución accidental sin el opt-in explícito de lectura; dicho opt-in requeriría autorización futura y nunca autoriza firmas, envíos ni producción. Riesgos no cubiertos por los ensayos: upgrades, cambios de features/callers, otras instrucciones, economía global, slippage/liquidez real y custodia del NFT.

**Criterio de salida:** cerrar todas las decisiones y gates de la tabla, demostrar recuperación de custodia y firma externa real en una etapa autorizada, obtener revisión independiente, fijar artefactos/metadata verificables, disponer de presupuesto/capital y revisar/simular cada mensaje actualizado. No es posible completar lanzamiento sin identidades, fondos y operaciones reales expresamente autorizadas. Hasta entonces: `NOT_AUTHORIZED_FOR_MAINNET`.

## Baseline aprobado para preparación; ejecución pendiente

Decisiones registradas por el propietario para preparación: Meteora DAMM v2 unilateral; par ROBUSTO/SOL; SPL clásico; OnlyB; fee fija 25 bps; dynamic fee NO; inventario objetivo 1.000.000 ROBUSTO; rango objetivo 3×; sin permanent lock; metadata mutable; conservar metadata update authority y mint authority; Arweave preferido. El propietario acepta continuar la preparación con los tres advisories y siete warnings documentados, sin tratarlos como resueltos. Vesting aprobado: equipo 365 días sin acceso + 730 lineales; reserva 180 días sin acceso + 1.095 lineales; `start=cliff=base+espera`, `end=start+linealidad`.

El objetivo de inventario no autoriza depósito. La política concreta de retiradas sigue pendiente. Los P0/Pmax USD usados en rehearsal fueron **TEST_ONLY**, ligados a SOL/USD sintético=100: no son precio definitivo ni se copian a config de producción. Antes de Mainnet se requiere cotización USD/SOL vigente, tick conversion/rounding y aprobación expresa de precio P0/Pmax finales. Cambios de protocolo, bytes, lock, ABI/IDL, fee path o deploy público requieren detener y reevaluar advisories/reachability.

**Recomendación de riesgo:** continuar preparación con Meteora conforme a la decisión del propietario, manteniendo los findings visibles. El binario público es actualizable; antes de cualquier firma/pool debe refrescarse la comparación fuente/deployment y verificar autoridad. La rehearsal local no es auditoría independiente ni demuestra seguridad universal/demanda; su runtime y metadata Metaplex no son equivalentes completos a producción.

## Fase 0 — aprobaciones y cierre de decisiones

1. Recibir hoja `ROBUSTO_FINAL_OWNER_APPROVAL.md` con las decisiones restantes: precio P0/Pmax y conversión final a SOL, cantidad efectiva depositada/circulación, política de retiro concreta, custodios y recuperación de las ocho funciones, fecha base/beneficiarios, presupuesto máximo y autorización separada de upload/pagos Arweave.
2. Las selecciones Meteora/ROBUSTO-SOL/OnlyB/1M objetivo/fixed25bps/no-dynamic/rango3x, no-permanent-lock, metadata mutable, autoridades retenidas y Arweave preferido están aprobadas solo para preparación. Supply 1B, decimals 6, freeze None y distribución 50/15/30/5 siguen siendo parámetros económicos aprobados. Ninguno de estos approvals autoriza operaciones.
3. Mantener documentados los tres advisories/siete warnings aceptados para continuar preparación; no se marcan corregidos ni aceptados como seguros. Se recomienda revisión independiente antes de lanzamiento. Si fuente, lock, IDL, binary SHA, upgrade authority, deployment o instrucciones cambió, detener y reevaluar advisories, alcance, ABI y economía antes de preparar firmas. Hallazgo nuevo material o verificación no concluyente implica abortar esa etapa.
4. Confirmar si se necesita desplegar el programa de vesting propio; verificar IDL real, ELF reproducible, address, upgrade authority, compatibilidad de custodia/beneficiario. No confundir con upgrade authority del programa Meteora, que no controla ROBUSTO.

## Fase 1 — custodia de identidades

Seguir [ROBUSTO_MAINNET_IDENTITY_CUSTODY.md](ROBUSTO_MAINNET_IDENTITY_CUSTODY.md). El builder separa mint authority de distribution/source: la wallet market recibe inicialmente el supply completo en su ATA, después distribuye cantidades exactas y retiene 500M. `distributionSourceOwner` debe ser la wallet market ya definida; no crea un noveno rol.

1. Solo tras aprobación específica de custodia, generar ocho identidades de producción distintas en dispositivo aislado/seguro; no copiar claves por shell, variables, chat, evidencia, Git o backup público. La política de backup privado requiere medios cifrados independientes, control de acceso, inventario sellado y prueba de restauración sin exponer seeds.
2. Para market, community, reserve y team, documentar por separado control/recuperación/beneficiarios y doble comprobación de pubkeys. Wallet del NFT de posición pertenece a función market o custodia designada, no al payer.
3. Payer separado, fondos mínimos con límite acordado y seguimiento. Mint, metadata-update y upgrade authorities separadas. El equipo no obtiene mint authority por ser beneficiario.
4. El multisig no está integrado en builders actuales; no usar una dirección multisig/PDA sin adaptar y probar cada ruta y su signer semantics. Preferir control hardware individual bajo procedimiento de doble revisión hasta que multisig compatible esté implementado y auditado. Guardar solo pubkeys y checksums públicos en repositorio.
5. Validar que ninguna dirección coincide con PAPA/Devnet/rehearsal/históricas, que roles son distintos según política y que todos recuperan control. Si alguna identidad fue expuesta, duplicada o no restaurable, abortar.

## Fase 2 — revisión de código, artefactos y programas

1. Checkout commit aprobado; árbol limpio; toolchains/dependencies fijadas. Ejecutar suite completa, scan, dependency audit conservando findings y reproducción SBF/IDL/TypeScript. Backup público verificable antes de ejecución.
2. Obtener nueva fuente oficial Meteora, tag/commit, IDL e instrucciones; verificar hash y bytes del deployment público con lecturas públicas finalized y autoridad de upgrade. Confirmar independientemente la interpretación del fee, OnlyB, token order, ticks/rango, max price y retiro del NFT.
3. Obtener SOL/USD live quote solo como dato de conversión documentado por fuente, timestamp, mercado y método. Cotizar tick rounding a P0/Pmax, fee efectiva y slippage. Si el quote queda obsoleto o rango deja de ser 3× por redondeos, recalcular y pedir aprobación nueva. No decidir precio a partir de la cotización de ensayo.
4. Construir el programa propio solo si hace falta; comparar byte por byte ELF/IDL frente al build reproducible y publicar hashes. Confirmar permisos/upgrade authority y método de recovery. No desplegar el programa Meteora externo ni modificarlo.

## Fase 3 — metadata off-chain y cotizaciones

1. Revalidar PNG exacto `metadata/robusto/robusto-logo.png`, SHA-256 `32c93f1971eb4a03f5c9b0fc6a5e87b1dc20f3028b5b73d01eeabd29cf5355ce`. No reescribirlo. Preparar JSON con solo name, symbol, description, image, `properties.files`, `properties.category`; external_url omitido. Comparar descripción aprobada y bytes/hashes.
2. Después de autorización de hosting y cotización, publicar ambos bytes en Arweave; descargar por gateway independiente, validar content-type, JSON/PNG, tamaño, hash y URIs. Persistir manifest público. Hosting durable puede tener tarifa de servicio y/o red; `REQUIRES_LIVE_QUOTE`. Fallo de lectura/hash o URI mutable/no recuperable implica abortar.
3. Completar tabla de presupuesto con valores observados, slot/timestamp, payer y cotización. No gastar el payer de producción para cotizar ni publicar sin autorización.

| Clase | Coste a medir justo antes de ejecución | Estado |
|---|---|---|
| **REQUIRED** | Rent/exención de rent para mint (82 bytes), cada ATA (165 bytes), metadata account según longitud serializada, vesting PDA/vault (145/165 bytes), programa propio/buffer/ProgramData si se decide desplegar (tamaño ELF + overhead), cuentas del pool/vault/position NFT según programa | `REQUIRES_LIVE_QUOTE` por red, tamaño y parámetros |
| **REQUIRED** | Fee base de cada mensaje: deploy/write, mint/init, ATA, emisión, transfer, vesting initialize/deposit, metadata create, pool initialize/deposit; nuevas cotizaciones al cambiar mensajes | `REQUIRES_LIVE_QUOTE` vía `getFeeForMessage` en mensajes exactos |
| **REQUIRED si hosting/operación elegidos** | Arweave de imagen+JSON, gateway/servicio, RPC, custodia/hardware, revisión independiente | `REQUIRES_LIVE_QUOTE` del proveedor |
| **OPTIONAL** | Priority fees, auditoría adicional, multisig/adaptación, domain/site, monitorización, relayer, marketing/servicios | Cotizar; no incluir por defecto ni autorizar |
| **MARKET CAPITAL** | SOL contraparte real para ROBUSTO/SOL o USDC para par alternativo; inventario del token no lo sustituye. El modo unilateral solo requiere mínimo técnico de contraparte más fondos para rent/transacciones; compradores aportan contraparte útil. Capital objetivo no se infiere del modelo local | `REQUIRES_LIVE_QUOTE` y decisión económica; ningún nivel garantiza mercado funcional |

Rent recuperable no equivale necesariamente a gasto neto, pero exige capital bloqueado mientras existan cuentas. El coste de buffer puede ser temporal si programa devuelve rent; reservar fondos brutos hasta confirmar el refund. No inventar SOL/USD ni tarifa.

## Fase 4 — preflight final, preparación de mensajes unsigned

Cada mensaje se construye desde un snapshot finalized fresco y config aprobada. Especificar cluster genesis, RPC, programa/mint, owners, token program, payer, autoridades, instrucciones/bytes, amounts, máximo de SOL, fee, blockhash/expiry y hash SHA-256 del mensaje. Simular sin firma, revisar logs y efecto post-state. Mostrar al propietario destino/cantidad/fees/hashes en formato legible.

Abortar si: red/genesis no es la aprobada; cualquier RPC o signer histórico/global; identities no distintas/recuperables; supply no está en el estado esperado; decimals o freeze incorrectos; authorities/delegates inesperados; metadata no mutable/URI hash mismatch; no hay rent/fees presupuestados; blockhash vence; simulación falla; estado cambió desde el snapshot; programa o hash cambió; cualquier instrucción extra; token order equivocada; rango/precio/fee fuera de aprobación; slippage mayor que límite; control del NFT/position no coincide; requiere lock, revoke o dynamic fee no aprobado; transacción no coincide exactamente con hash aprobado.

Una nueva aprobación debe cubrir **una etapa y mensaje exactos**. No existe blanket permission. La revisión por el propietario sucede después de construir y simular el mensaje; sin ella, el plan se detiene en unsigned.

## Fase 5 — secuencia de producción, una etapa por vez

Toda firma/envío requiere autorización explícita separada, previa, del mensaje exacto y su coste. Entre cada punto esperar finalized, cotejar firma/slot y balances; persistir journal antes del envío. Nunca reenviar ante timeout ambiguo.

1. (Opcional y previamente aprobado) desplegar programa de vesting propio desde ELF reproducible. Verificar Program/ProgramData, ELF SHA exacto, loader y upgrade authority antes de avanzar.
2. Crear el mint SPL clásico con 6 decimals, freeze authority `None`, mint authority designada. Confirmar supply cero, mint owner/program y autoridades.
3. Crear el ATA market, que es también el source ATA y el destino final del bucket market. Confirmar owner y mint por cuenta.
4. Crear metadata Metaplex mutable apuntando a JSON Arweave verificado, URI ≤ estándar; nombre/símbolo/description/logo exactos. La instrucción `CreateV1` requiere además la firma de mint authority según el protocolo; `metadataUpdateAuthority` queda asignada por separado y controla cambios posteriores. Verificar PDA, owner, mint, isMutable, fee=0 y descarga off-chain/hash.
5. Exigir supply=0 y market source ATA=0; emitir exactamente 1.000.000.000 ROBUSTO (1e15 base units) una única vez al ATA market. Para operaciones de tokens, mint authority solo firma esa emisión; nunca custodia ni firma transferencias/depositos. Ante incertidumbre no repetir; reconciliar primero.
6. Desde el ATA market, distribuir exactamente 150M al ATA community y depositar 300M/50M en los vaults reserve/team. La wallet market firma transfer/deposits; market conserva 500M. El preflight exige las cuatro cantidades aprobadas, las dos rutas de vesting y conservación total. Los 500M de mercado no son circulación inicial ni deben transferirse automáticamente.
7. Para team/reserve, calcular start=cliff=base UTC + espera; end=start+linealidad. Confirmar base/beneficiario/finalidades y rent. Inicializar cada schedule, leer PDA/vault vacíos, depositar cantidad exacta; reconciliar released=0 y reservas. No iniciar fecha mientras no haya aprobación y disponibilidad de operación.
8. **Antes de mercado:** refrescar verificación del programa Meteora, todos los parámetros y coste. Recalcular precio en SOL desde quote aprobado, ticks reales y slippage; revisar custodia del NFT y cantidad ≤ efectiva aprobada y techo 3M. Crear pool OnlyB con fee fija aprobada, sin dynamic fee, seed unilateral mínimo validado y posición NFT bajo custodia designada. Depósito solo después de leer pool creado y confirmar mints/order/config; firma de pool y depósito son autorizaciones separadas si son mensajes distintos.
9. Leer vault balances, posición NFT/owner/delegate/lock, fee config, precio inicial, inventario restante, token supply/authority/metadata; total conservación. No bloquear NFT. Sin crear pool no hay afirmación de negociación pública. Anunciar identificadores solo tras verificación y aprobación independiente de comunicaciones.
10. Reconciliar balances/fees/costes, supply, metadata y authorities en contexto finalizado: supply 1e15, market/source 500M, community 150M, reserve vault 300M y team vault 50M. Dejar mint authority y metadata update authority intactas según política. Una futura revocación de mint es una decisión separada e irreversible; no es parte de este orden.

## Incidentes y recuperación

Tras firma con respuesta incierta: conservar firma y journal, consultar esa firma y cuentas finalized; nunca recrear/reemitir/redepositar automáticamente. Si confirmed/finalized, verificar post-state; si no hay resolución, pausar y escalar. Reorganización/timeout no justifica enviar un mensaje equivalente con nuevo blockhash sin prueba de no ejecución. Backup público conserva fuente/evidencia y excluye secretos; custodia privada se recupera solo del procedimiento cifrado aprobado. Si faltan claves, detenerse, no generar sustitutas para una authority on-chain.

## Separación de estados

- **TOKEN CREATED:** supply y metadata comprobados; no implica mercado.
- **TOKEN READY FOR MAINNET:** todos los gates, owner decisions, presupuesto, artifacts, custody y approvals de ejecución satisfechos; esto no se afirma hoy.
- **PUBLICLY TRADABLE:** pool real finalizado, accesible y verificado; requiere capital de contraparte/mecanismo y publicación responsable. Token creado por sí solo no es negociable.
- **Actualidad:** rehearsal local pasó. Producción sigue pendiente de decisión del propietario y revisión residual; nada de este documento declara `READY_FOR_MAINNET`.
