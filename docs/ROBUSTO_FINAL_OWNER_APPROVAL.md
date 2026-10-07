# ROBUSTO — decisiones finales pendientes del propietario

Marca una opción por apartado. Lo ya aprobado sobre supply, decimals, freeze, distribución y metadata no vuelve a votarse aquí. Este documento registra decisiones de diseño; no autoriza firmas, transacciones, pagos, publicación, creación de identidades definitivas ni Mainnet. Las operaciones futuras necesitan aprobaciones separadas por etapa y mensaje exacto.

## 1. Riesgo y plataforma de mercado

- [ ] **Aprobar condicionalmente Meteora DAMM v2 unilateral como diseño**, sujeto a revisión independiente favorable antes de cualquier operación de producción.
- [ ] **Rechazar Meteora** y detener preparación de pool hasta elegir mecanismo alternativo y revisar sus riesgos/costos.

La recomendación técnica es condicional: ROBUSTO/SOL, `OnlyB`, fee fija 25 bps, dynamic fee desactivada. Inventario inicial candidato: **1.000.000 ROBUSTO** (0,1% supply, 2% del bucket mercado aprobado). No es depósito aprobado; no excede los techos aprobados de 3M mercado y 5M circulación inicial.

El diseño de ensayo usó un rango 3×. Referencias P0 US$0,000788675 y Pmax US$0,002366025 se derivan de conversión sintética **TEST_ONLY de US$100/SOL**. No son cotización ni precio aprobados. La compra de ensayo mostró que una wallet pudo acumular 90% del inventario por US$1.148,4327978 TEST_ONLY; no hay protección anti-concentración.

- [ ] Aprobar usar **solo como punto de partida para nueva cotización y decisión**, P0 USD 0,000788675, Pmax USD 0,002366025 (3×), con conversión SOL/USD fresca antes de crear cualquier pool.
- [ ] Rechazar esas referencias y dejar precio/rango pendientes de nueva propuesta.

**Precio final en SOL, tamaño efectivo de pool y contraparte quedan pendientes hasta la cotización vigente, presupuesto aprobado y autorización específica.** No se asume demanda ni capital inicial disponible.

## 2. NFT de posición y política de liquidez

- [ ] Aprobar mantener el NFT de posición **desbloqueado**, bajo custodia fría separada; retiradas/modificaciones solo tras decisión del propietario, revisión de balances y anuncio público previo conforme a una política que debe fijarse antes del lanzamiento.
- [ ] Rechazar diseño con posición desbloqueada y detener pool hasta aprobar alternativa.

Recomendación: no usar permanent lock. El NFT controla la posición; quien lo custodia puede gestionar y retirar liquidez según el programa. Locked/vesting del NFT no queda implementado ni aprobado y un bloqueo permanente puede ser irreversible. Esta propuesta no autoriza retirada alguna.

- [ ] Aprobar política recomendada: sin lock inicial; cualquier retirada requiere autorización explícita por operación y divulgación previa; no modificar precio/rango/liquidez automáticamente ante agotamiento.
- [ ] Proponer otra política antes de preparar instrucciones.

Agotado el rango, las compras no reciben fills por encima del límite; una venta puede reabrir capacidad. Recomendación: pausar compras propias/administrativas y publicar el estado; cualquier reinicio, redépósito o nuevo rango requiere revisión de inventario/precio y autorización separada. Sin estrategia automática.

## 3. Custodia de las ocho funciones

- [ ] Aprobar diseño: ocho direcciones distintas (market, community, reserve, team, payer, mint authority, metadata update authority, upgrade authority); claves de autoridades en hardware/custodia offline separada. Payer limitado y separado. Wallets de buckets no firman autoridad.
- [ ] Rechazarlo y especificar por escrito qué roles/personas/custodios cambiar antes de crear identidades.

Recomendación de control: mint authority conservada y separada hasta emisión exacta y reconciliación; luego decisión futura aparte sobre revocación irreversible. Metadata update authority separada, conservada y mutable. Upgrade authority del programa propio separada, en custodia fría; Meteora es un programa externo actualizable cuya autoridad no controla ROBUSTO. Market/NFT custody en rol market, con recuperación probada. Reserve y team separadas mediante vesting técnico. Community separada; desembolsos uno por uno. Payer operativo distinto de los siete roles restantes.

Los builders actuales no acreditan compatibilidad multisig: usan firmantes individuales. No elegir una PDA multisig hasta implementar y probar soporte. Antes de generar claves: decidir custodios nominales, método hardware/multifirma compatible, copias cifradas offline en ubicaciones separadas, responsables de recuperación, doble verificación de direcciones públicas y procedimiento de pérdida. Generación aislada en dispositivo controlado; no pegar seeds en chat, no guardar en Git/cloud/backups públicos, comprobar backups restaurables sin revelar material. La creación concreta de identidades requiere aprobación separada.

- [ ] Aprobar procedimiento de custodia descrito para preparar una propuesta de identidades, **sin crear todavía las claves**.
- [ ] Rechazarlo; no crear claves hasta recibir procedimiento alternativo.

## 4. Vesting: beneficiarios y fecha base

Términos ya aprobados: team/founder 50M ROBUSTO, espera 365 días y lineal 730 días; reserve 300M, espera 180 días y lineal 1.095 días. Para ambos **start = cliff = fecha base + espera**, end = start + período lineal. Así no se acumula durante la espera. Cantidades en base units: equipo 50.000.000.000.000; reserva 300.000.000.000.000.

- Fecha base UTC propuesta: ____________________________________
- Beneficiario/wallet team: _____________________________________
- Beneficiario/custodia reserve: ________________________________
- [ ] Confirmo que la fecha es la fecha real de lanzamiento elegida y no una fecha histórica/de Devnet.
- [ ] Necesito otra propuesta de fecha; no preparar schedules ni cuentas de vesting.

Los beneficiarios pueden ser wallets controladas por multisig solo tras soporte técnico probado. El programa actual exige autoridad/payer y controles de beneficiario concretos; revisar topología antes de inicializar.

## 5. Cantidad efectiva inicial y buckets

Los techos aprobados no son órdenes de transferir: circulación inicial ≤5M (≤3M market, ≤2M community), reserva 0, equipo 0. No transferencias automáticas posteriores; los 148M restantes de comunidad requieren decisiones de campaña separadas.

- Market/pool efectivo (≤1M recomendado y ≤3M techo): __________________ ROBUSTO
- Community inicial efectivo (≤2M): _________________________________ ROBUSTO
- [ ] Aprobar las cantidades escritas para preparar un plan de transfers unsigned.
- [ ] Mantener cantidades en cero hasta tener mecanismo, presupuesto y addresses definitivos.

Tokens asignados al pool no aportan SOL/USDC por sí mismos. 1M queda como candidato de simulación y recomendación, no como instrucción de depósito.

## 6. Metadata y publicación externa

Contenido ya aprobado: nombre ROBUSTO, símbolo ROBUSTO, descripción aprobada en `metadata/robusto/metadata.template.json`, PNG oficial `metadata/robusto/robusto-logo.png` SHA-256 `32c93f1971eb4a03f5c9b0fc6a5e87b1dc20f3028b5b73d01eeabd29cf5355ce`, web omitida, mutable y update authority conservada. El JSON generado contiene name, symbol, description, image, `properties.files` y `properties.category`; no añade campos incompatibles. URI Arweave todavía null.

- [ ] Autorizar en una etapa futura el pago/subida del PNG y JSON a Arweave, hasta un presupuesto máximo de __________ (moneda: ________), tras cotización identificada y revisión de los bytes preparados.
- [ ] Aplazar Arweave; no subir hasta nueva decisión.

Ninguna casilla aquí autoriza la publicación on-chain. Faltan gateway/URI pública durable para ambos archivos, prueba de descarga/hash y autorización separada de transacción Metaplex manteniendo `isMutable=true` y autoridad existente.

## 7. Riesgo residual Meteora

La evidencia conserva RUSTSEC-2026-0007 bytes 1.10.1 (**NOT_REACHABLE** en feature graph fijado), RUSTSEC-2025-0137 ruint 1.14.0 (**NOT_REACHABLE para entrada inválida; función general alcanzable, conclusión condicionada**) y RUSTSEC-2026-0220 ruint 1.14.0 (**REACHABLE; flag de shift defectuoso reproducido, no consumido por los resultados del perfil analizado**). No son findings corregidos. Permanecen siete warnings: bincode runtime sin mantenimiento; derivative/paste optativos inactivos; anyhow host; keccak ARM host optativo; rand 0.8.5 host/tests; rand 0.9.1 optativo inactivo. Informe completo: `docs/ROBUSTO_METEORA_DEPENDENCY_REVIEW.md`.

El programa público Meteora estaba actualizable; el deploy Devnet no correspondía a bytes de la fuente estudiada. Prueba local usó bytes Mainnet verificados, pero runtime/features no idénticos y Metaplex fue fixture, no ejecución. Posición unilateral permite concentración extrema y retiro por custodio NFT.

- [ ] Exigir revisión independiente de `cp-amm`, instrucciones/custodia y confirmar bytes/authority vigentes antes de cualquier etapa; no lanzar si sus conclusiones no son aceptables.
- [ ] Rechazar Meteora por el riesgo residual y reevaluar el mecanismo.

La aprobación de una revisión no revoca ninguna autoridad ni autoriza un pool.

## 8. Presupuesto y límite de gasto

- Límite de gasto técnico antes de nuevo permiso: __________ (moneda: ________)
- Reserva operativa SOL para payer: ______________________________
- [ ] Autorizar únicamente recopilar cotizaciones públicas read-only al acercarse al lanzamiento.
- [ ] Aplazar cotización y cualquier gasto.

No se incluyen precios actuales inventados. Cada coste vivo se marca `REQUIRES_LIVE_QUOTE`; categoría y alcance aparecen en `docs/ROBUSTO_MAINNET_EXECUTION_PLAN.md`.

## 9. Aprobaciones futuras separadas

- [ ] Confirmo que entiendo que completar esta hoja **no autoriza Mainnet, firma, envío, gasto, mint, transferencias, vesting, deploy, publicación ni creación de pool**. Cada etapa/transacción tendrá un plan con bytes/hash, monto, destinatarios, payer, red y cotización; lo aprobaré explícitamente antes de firma.


## Estado de preparación

Clasificación al cerrar esta preparación: **READY_FOR_OWNER_MAINNET_DECISIONS / NOT_READY_FOR_MAINNET**. Completar esta hoja no levanta `MAINNET_DISABLED`; el plan conserva gates de revisión independiente, live quote y autorizaciones por operación.
