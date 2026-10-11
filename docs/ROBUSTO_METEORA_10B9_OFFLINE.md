# ROBUSTO 10 mil millones / 9 decimales — Meteora offline

NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED / OFFLINE_FIXTURE_ONLY.
Perfil PROPOSED_NOT_APPROVED. No existe pool real ni autorización de lanzamiento.

## Implementación separada

`scripts/robusto-meteora-10b9.ts` conserva los builders y configuraciones históricos
ROBUSTO/SOL de seis decimales. Valida la propuesta alternativa de suministro
10.000.000.000 × 10^9 = 10.000.000.000.000.000.000 unidades base, mints clásicos
inicializados de 9/6 decimales y autoridades de emisión/congelación nulas en el fixture.
El segundo mint es USDC **ficticio**, público y determinista: no es una cuenta USDC
observada ni acredita reservas, emisor o identidad de producción.

Precio y cantidades son `bigint`/BN/string, sin conversiones a Number. Para precio
humano P USDC/ROBUSTO, el precio bruto B/A es P/1000. El constructor calcula
floor(sqrt(P × 2^128 / 1000)), valida límites de protocolo y liquidez u128 y conserva
exactamente inventario con redondeo hacia arriba del débito. Prueba matemática del
bucket máximo propuesto de 4.000 millones; esto no acredita viabilidad económica ni
liquidez ejecutable para todas las cantidades o precios.

El escenario ejecutado utiliza **1 millón ROBUSTO**, rango **0,001–0,003 USDC/ROBUSTO**,
fee ficticia 25 bps, precio inicial en el límite inferior y un micro-USDC de dust.
Son operandos de prueba, no una propuesta de precio, financiación o asignación final.
La posición empieza unilateral en A; necesita entrada B para poder vender A sin salir
del rango. Tener tokens asignados a mercado no garantiza una reserva de USDC.

## Evidencia y reproducción

47 casos del perfil nuevo ejecutan los ELF locales fijados: 20 creación/rechazos,
13 liquidez y 12 swaps/permisos, más 2 rechazos SPL por decimales incorrectos.
Creación incluye CPI System, SPL y Token-2022 para NFT de posición. Aportes/retiros
usan instrucciones reales Meteora. Swaps B→A y A→B conservan totales de ambos activos
y lamports; el trader es distinto del payer/creador, único permiso sintético del swap,
y la cuenta creador está ausente del inventario de ejecución. Retirar posición ajena
falla con 6053. No se requiere un proceso del creador en la instrucción de swap.

Rechazos comprueban códigos exactos: signer 3010, autoridad SPL 4, mint 3,
congelamiento 17, fondos 1, slippage 6002, límites/rango de swap 6015,
liquidez extrema 6000 y duplicación de pool 0. El estado aceptado en errores permanece
idéntico al inicial; se comprueba conservación en efectos crudos. El fallo de CPI B
durante creación deja transferencia A cruda: el harness la descarta explícitamente.
**Esto no demuestra rollback transaccional nativo Solana.** El bloqueo sigue abierto.

Meteora es genérico y no exige que A tenga nueve decimales: el builder de este perfil
rechaza 6/9 invertidos; los dos casos SPL comprueban error 18 en transfer_checked con
decimales declarados incorrectos. No confundir validación del builder con restricción
nativa de Meteora ni con autenticación de cuentas externas.

Ejecutar desde HEAD limpio, con los artefactos públicos ya disponibles:

```sh
python3 scripts/check-10b9-runtime.py --fixture-elf target/rehearsal-builds/YMN9Qj5jPNp7j14VPcML1B6xGgcPWVZUGLFU3Mnyfaf-nhw26q4u/program.so
```

El gate ejecuta además 92 casos históricos y 11 de suministro cerrado/vesting fundador
(365 días de bloqueo y 730 lineales). Produce
`target/robusto-10b9-integration-report.json`, ligado a HEAD limpio, hashes de fuentes,
ELF, binario del harness, fixtures y salidas. Ante fallo invalida evidencia previa.
El fixture nuevo fija SHA-256
`dc4325975ad1b17192b8fdc05871557553b2de9afc8999caccc6545b7f31525c`.
Meteora ELF `a30610058262a5c87e1b22144ef6053ff2cd8bc9f97b7e978a51e28f8ec3ea3c`.
No se han cambiado fuentes del contrato, IDL ni ELF; no corresponde recompilar SBF.
El candidato empaquetado histórico no se presenta como candidato actualizado ni RC.

## Poderes externos y bloqueos

Fuente local fijada Meteora `a85c926607433f23f0ea60f4ca7b1ae92f4156cb`:
`pool_action_access/permissionless.rs` permite swaps tras activación si pool habilitado;
antes de activación contempla vault whitelisted. `lib.rs` y `access_control.rs` exigen
operador con dirección y permiso adecuados para SetPoolStatus y UpdatePoolFees.
Por ello operadores autorizados pueden impedir swaps mediante status o alterar fees.
El permiso de retiro tras activación no depende de status, pero sigue exigiendo control
de posición. Estos son poderes del protocolo externo, no aprobación por compra del
fundador. Falta verificar operadores, upgrade authority y estado del despliegue final
bajo autorización futura. Disponibilidad de RPC/interfaz/red no se acredita offline.

Tres advisories y siete warnings permanecen abiertos, con el detalle y riesgos
residuales de [dependencias](ROBUSTO_METEORA_DEPENDENCY_REVIEW.md).
BLOCKED_FOR_PRODUCTION_REVIEW: los nuevos tamaños/precios necesitan revisión
independiente de aritmética y alcance; aprobar estos casos no corrige upstream.

Faltan aprobación del perfil/distribución/calendario/beneficiarios, precio/rango y
capital USDC real financiado externamente, custodia/autoridades, cotizaciones y auditoría,
atomicidad nativa, identidades/metadata finales y RC reproducible del alcance aprobado.
Fundador aporta cero: no hay financiador comprometido ni liquidez garantizada; los
costes de auditoría, rent/fees, publicación y operación siguen pendientes de financiación
y cotización. Todo paso de claves, firmas, gasto o red exige autorización futura expresa.
