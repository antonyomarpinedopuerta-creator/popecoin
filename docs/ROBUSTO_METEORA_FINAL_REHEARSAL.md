# ROBUSTO — rehearsal final local, 2026-10-07 UTC

Estado: PASSED_FINAL_LOCAL_REHEARSAL / PRODUCTION_REVIEW_PENDING. No es aprobación económica, de plataforma definitiva ni Mainnet. Autorización de ejecución local terminada; no repetir sin nueva autorización. El tercer rehearsal Devnet y su calendario permanecen intactos.

## Entorno y verificación externa

Fuente oficial cp-amm 0.2.4: `a85c926607433f23f0ea60f4ca7b1ae92f4156cb`; HEAD y 129 hashes revisados sin cambios. Binario reproducido SHA-256 `a30610058262a5c87e1b22144ef6053ff2cd8bc9f97b7e978a51e28f8ec3ea3c`, idéntico al código público Mainnet más padding cero, slots 454072714/454072716. Solo getAccountInfo público read-only; ninguna operación pública transaccional.

La [documentación oficial](https://github.com/MeteoraAg/docs/blob/main/developer-guides/damm-v2/index.mdx) identifica el mismo program ID en Mainnet y Devnet. Devnet existe, pero sus bytes son distintos: SHA-256 código/padding `82bb9375921bb8007551cb65f9ca43b191597496cc9922926468b36671081ec2`, slots 508285875/508285877, correspondencia con fuente NOT_VERIFIED. Se eligió local aislado: permite ejecutar exactamente el binario revisado, sin tomar el despliegue Devnet distinto como evidencia de producción.

Agave local 3.1.10; Token clásico, Token-2022 y ATA cargados desde snapshots públicos validados del loader/ELF, con hashes en [preflight](evidence/robusto/meteora-final-readonly-preflight.json). Estos snapshots acreditan bytes públicos, no una reproducción independiente de sus fuentes. Runtime local y features no son idénticos al runtime público 4.3.0. Lecturas públicas no atómicas, un proveedor por cluster; programa upgradeable: repetir verificación antes de otra etapa. Metadata ROBUSTO es fixture de genesis, mutable y URI vacía; Metaplex no ejecutado, no metadata publicada.

## IMPLEMENTED

Preflight read-only con métodos/URLs/direcciones permitidos y cierre ante HEAD/binario alterados; snapshots SPL públicos. Ejecutor final exige preflight fresco, genesis/identidad local, identidades temporales nuevas, separación payer/custodio/autoridades y parámetros exactos. Modo histórico de ejecución deshabilitado. Nunca carga global keypair. Identidades privadas ignoradas, permisos 0700/0600, excluidas del backup público. No protocolo modificado ni fork.

Parámetros exclusivamente APPROVED_FOR_LOCAL_REHEARSAL_ONLY: supply 1,000,000,000, decimals 6, inventario 1,000,000 ROBUSTO; ROBUSTO/SOL, MEDIO, rango 3×; P0 USD 0.000788675, Pmax USD 0.002366025; conversión sintética TEST_ONLY 100 USD/SOL, OnlyB, fee fija 25 bps, dynamic fee deshabilitada, slippage 50 bps. No precio/cotización económica definitiva.

## TESTED: ejecución y economía

[Resultado final](evidence/robusto/meteora-final-local-runtime.json): 26 transacciones locales confirmadas, 15 swaps y 27 checks negativos; validator detenido. [Primer intento](evidence/robusto/meteora-final-attempt-1.json): 10 transacciones locales confirmadas, detenido por tolerancia de test demasiado estricta. Total de esta etapa: 36 transacciones locales, cero públicas. Una unidad lamport puede producir más de dos micro-ROBUSTO: tolerancia derivada matemáticamente de 383 base units; segundo intento usa identidades nuevas. Preflight también tuvo un bug de variable que sobrescribía el destino ATA con JSON: descubierto antes de claves/firmas, corregido y cubierto por regresión offline.

| Concentración acumulada desde inicio, una wallet | Coste bruto TEST_ONLY USD | % del supply total |
|---|---:|---:|
| 25% del inventario | 221.015995 | 0.0250000000025% |
| 50% | 501.2530474 | 0.0500000000022% |
| 90% | 1148.4327978 | 0.0900000000006% |

Diferencia coste continuo bruto / ejecución menor de USD 0.000000122; no cotización real. Los 15 swaps coinciden exactamente con oracle BigInt independiente en input/output/sqrt price: diferencias cero. Modelo continuo presenta hasta 64.6592 micro-ROBUSTO por redondeo Q64, división entera y ceiling de fees; ventas difieren menos de 1.31 lamports.

Tras devolver el inventario concentrado, compras secuenciales USD 1/5/10/25/50/100 obtuvieron respectivamente 1264.103797 / 6300.311668 / 12500.443569 / 30678.954423 / 59012.066543 / 109437.236756 ROBUSTO. Movimientos respectivos 0.106940% / 0.534987% / 1.068539% / 2.667685% / 5.299348% / 10.455086%. Son compras secuenciales, no escenarios independientes. Comprador temprano vendió la mitad tras compradores posteriores: recibió 0.036077336 SOL, conservó 3782.207733 ROBUSTO; no representa rentabilidad sin valorar el saldo restante.

Capacidad neta continua del rango desde inicio: USD TEST_ONLY 1366.0251706593845. No es contraparte que el propietario deba depositar inicialmente. Contraparte útil entra con compras; seeding mínimo 1 lamport. Compra próxima al máximo y partial fill alcanzaron límite, dejando 5 base units ROBUSTO de dust. Intento posterior rechazado por modelo y simulación protocolaria local; venta reabrió capacidad y compra posterior pasó.

Retirada parcial 10% de liquidez y redepósito restauraron L exactamente, sin mover precio; redepósito costó un base unit ROBUSTO y un lamport adicionales por redondeo. Conservación en todos los snapshots: 1e15 ROBUSTO base units y 121e9 wSOL lamports entre participantes/vaults/reservas de fees. Swap fees 96,342,915 lamports: protocolo 19,268,579; LP 77,074,336. Fees de red de las 26 transacciones: 230,000 lamports, payer separado, sin priority fee. No estimación de coste real Mainnet.

Checks negativos: cluster/genesis/identidad/parametrización/cantidad/precio/rango/quote/global-keypath, mint/autoridades/order/slippage/colisiones; simulaciones unsigned locales min-out (6002), mint (2014), signer (4), custodio (6053). Lock permanente/revocación rechazados antes de instrucción; no ejecutados. Balances intactos tras negativos. Mint supply/decimals/authority/freeze None, metadata fixture mutable/update authority/hash, upgrade authority, posición NFT con amount 1/custodio separado/delegate None y locks cero verificados antes/después de firmas.

El NFT controla la posición y acceso a liquidez/fees conforme al programa; custodia es material. Retirar/redepositar liquidez desbloqueada requiere owner autorizado y parámetros; las pruebas locales no autorizan retiro real. Trading no es reversión automática de operaciones; permanent lock y revocaciones son irreversibles y siguen prohibidos. No existe protección anti-concentración: la wallet realmente pudo alcanzar 90% del inventario; resistencia matemática no demuestra demanda ni mercado seguro.

## Findings mantenidos

[Auditoría upstream completa](evidence/robusto/meteora-final-upstream-audit.json), salida 1 esperada: tres vulnerabilidades y siete warnings, sin suppressions ni correcciones oficiales en HEAD. [Revisión individual y reachability](ROBUSTO_METEORA_DEPENDENCY_REVIEW.md) permanece vigente:

- RUSTSEC-2026-0007 bytes 1.10.1, cp-amm → borsh 1.6.1 → bytes opcional inactivo: NOT_REACHABLE.
- RUSTSEC-2025-0137 ruint 1.14.0 directo: NOT_REACHABLE para entradas inválidas del advisory gracias a división normalizada; función general alcanzable, conclusión condicionada al flujo revisado.
- RUSTSEC-2026-0220 ruint 1.14.0 directo: REACHABLE; flags defectuosos reproducidos, ignorados en right-shift revisado, left-shift u128+128 cabe en U256; no defecto económico observado en este perfil. No declaración de seguridad general.
- Siete warnings: bincode 1.3.3 runtime/unmaintained material de mantenimiento; derivative 2.2.0 y paste 1.0.15 opcionales inactivos; anyhow 1.0.97 host (downcast_mut no encontrado en consumidores revisados); keccak 0.1.4 host ARM opt-in ausente; rand 0.8.5 host/dev feature log ausente; rand 0.9.1 opcional inactivo.

## EXTERNALLY VERIFIED / PENDING

Verificados externamente: HEAD oficial, fuente fijada, correspondencia binaria pública cp-amm y existencia/diferencia Devnet; snapshots SPL. TESTED no equivale a auditoría independiente ni igualdad de runtime/features de producción. Preparación local pasó; producción sigue pendiente de revisión independiente de riesgo upstream, fidelidad runtime/metadata y refresco de programas públicos. No READY_FOR_MAINNET ni aprobación automática de producción.

Decisiones del propietario: plataforma definitiva y SOL/USDC; inventario efectivo y circulación (techos aprobados, no transferencias automáticas); precio/rango/fees/activación definitivos; custodia/política de retiro/bloqueo del NFT; aceptar o resolver riesgo residual tras revisión; etapa específica de ocho roles/wallets definitivas y backups; fecha real base y beneficiarios de vesting (equipo 365+730 días, reserva 180+1095); campañas comunidad separadas; cuenta/presupuesto/autorización de Arweave y URIs; presupuesto con live quotes de SOL/USD/rent/deployment/mint/ATAs/metadata/vesting/fees y negociación. Supply 1B/6 decimals/freeze None/distribución 50/15/30/5 ya aprobados. Reconciliar emisión total antes de decisión separada de revocar mint authority. Cualquier firma/transacción Mainnet, gasto, publicación o lock exige autorización nueva explícita.

## Recovery

Restaurar backup público, instalar dependencias fijadas, ejecutar checks offline y leer evidencia; claves/ledgers privados no forman parte del backup. Para otra rehearsal hace falta nueva autorización, preflight público fresco y revalidación si cambia fuente/binario. No ejecutar comando de rehearsal para verificar un backup. Fuente pública SPL se refetch/revisa; no usar identidades históricas. Calendario Devnet intacto: 2026-10-08, 10-10 y 10-13 a las 13:32:52 UTC, sin releases anticipados.
