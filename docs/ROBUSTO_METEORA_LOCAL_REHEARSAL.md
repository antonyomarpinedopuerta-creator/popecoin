# ROBUSTO — preparación Meteora local

Estado: **APPROVED_FOR_LOCAL_REHEARSAL_ONLY**. Meteora DAMM v2 unilateral y ROBUSTO/SOL siguen siendo candidatos, no plataforma definitiva ni autorización Mainnet. El propietario aprobó para preparación 1,000,000 ROBUSTO, perfil MEDIO, rango 3×, referencias USD exactas 0.000788675 y 0.002366025. Supply 1,000,000,000, seis decimales, distribución 50/15/30/5 y techo absoluto 3,000,000 permanecen intactos. Fechas base de vesting pendientes. No cambia el tercer rehearsal Devnet ni su calendario.

## Uso sin red

`npm run robusto:meteora-local -- validate`

`npm run robusto:meteora-local -- prepare PUBLIC_LOCAL_INPUT.json`

El segundo comando lee únicamente un documento público local conforme a `LocalInput` en `scripts/robusto-meteora-local.ts`. Exige cotización de ensayo explícita `solUsdTrialQuote` como string decimal positivo; nunca consulta cotizaciones. No acepta secretos, keypairs ni signers. Endpoint permitido exactamente `http://127.0.0.1:8899`, cluster `localnet`; no se utiliza el endpoint ni se crea Connection. Mainnet, Devnet, alias, query y endpoints remotos se rechazan. El preparador no dispone de rutas para firmar, transmitir, desplegar, retirar, bloquear, revocar o publicar.

Para probar el preparador sin cuentas reales, `localPublicFixture("100")` produce un input de **direcciones públicas de prueba sin claves asociadas**, y bytes de mint sintéticos. `100` es una cotización sintética introducida explícitamente en los tests, no precio de SOL ni default de producción. Las comisiones 25 bps y slippage 50 bps de ese fixture son parámetros de ensayo, no decisiones económicas. El llamante proporciona ambos explícitamente. No son wallets utilizables y no permiten ejecutar el rehearsal.

El preparador devuelve una única instrucción unsigned, no una transacción lista para ejecutar. No contiene blockhash ni firmas. Cuenta NFT nueva y payer serían signers si se autorizase una ejecución futura. No se preparan instrucciones de financiación, creación de mint, revocación, bloqueo, metadata o retirada.

## Validaciones y formato

- Mint A igual al ROBUSTO local esperado; mint B es wrapped SOL clásico, nueve decimales. ROBUSTO SPL clásico se decodifica de 82 bytes: inicializado, supply exacto 1,000,000,000 × 10^6, seis decimales, freeze None y mint authority retenida.
- Inventario de prueba exacto 1,000,000 × 10^6 y máximo absoluto 3,000,000 × 10^6.
- Payer, titular NFT, mint authority, metadata update authority y upgrade authority distintos, on-curve. Mint y mint NFT también separados. Se rechazan direcciones históricas halladas en configs de Devnet/rehearsal/app-reader.
- El orden económico es A=ROBUSTO, B=wSOL. Los seeds del PDA del pool ordenan las direcciones en sentido descendente: no se confunde con orden económico.
- P0/Pmax exactos con rango 3×; conversión racional entera a Q64.64 con ajuste 10^(9−6). Liquidez calculada con aritmética bigint; depósito A redondeado hacia arriba debe coincidir exactamente con el inventario. B aporta una unidad mínima técnica (un lamport wSOL), sin profundidad económica inicial.
- Límites oficiales de precio y u128; cotización positiva, no NaN/exponente, slippage de ensayo entero 0..100 bps, fee fija explícita 1..100 bps. Rango estrecho admitido por esta preparación deliberadamente limitada.
- Fee fija codificada mediante TimeSchedulerLinear sin períodos ni reducción; OnlyB, dynamic fee None, compounding cero, Alpha Vault deshabilitado, activación timestamp. Ninguna de estas opciones queda aprobada para producción.
- La instrucción de inicialización **no tiene campo slippage**: se valida como política informativa; no se afirma enforcement on-chain. Antes de futuras instrucciones de swaps/depósitos deben implementarse mínimos de salida/entrada apropiados.
- Snapshot público de metadata exige mint esperado, mutable true y update authority esperada. Es una declaración offline, **no una lectura/atestación blockchain**. Las autoridades ROBUSTO no son cuentas de la instrucción y no existen instrucciones que las cambien. Verificar cuentas reales de metadata/upgrade queda pendiente.

El snapshot de mint también es input offline, no prueba del estado de un cluster. El identificador oficial del programa y sus PDAs se usan como namespace para futura instalación **local** de la versión correspondiente; no significan conexión ni verificación de Mainnet. No se acepta un programa alternativo arbitrario. El preparador no certifica la procedencia de un servidor local ni impide a una herramienta externa reutilizar bytes unsigned: su garantía es que el preparador offline no los firma/envía y que su entrada queda restringida a preparación local. El ejecutor separado descrito debajo solo puede usar un validador temporal creado por él mismo.

## Fuentes externas revisadas

- [Programa Meteora](https://github.com/MeteoraAg/damm-v2/tree/a85c926607433f23f0ea60f4ca7b1ae92f4156cb), commit fijado `a85c926607433f23f0ea60f4ca7b1ae92f4156cb`: initialize_customizable_pool, constants, fee_parameters y fee_time_scheduler. Revisados seeds, límites, cuentas, fee fija y depósito mínimo de ambos activos.
- [SDK/IDL oficial](https://github.com/MeteoraAg/cp-amm-sdk/tree/79ebbfe59a225e641a2f37cd03404f26de1b0c8e), commit fijado `79ebbfe59a225e641a2f37cd03404f26de1b0c8e`: IDL y concentratedLiquidity. `scripts/meteora-local-idl.json` es un extracto sin modificaciones de la instrucción y sus cuatro tipos dependientes, con atribución MeteoraAg. SHA-256 del extracto: `e476ace8abaf90b70660c7a9bca39e604bb606880a865625bb31cfb3857b4d0d`.
- [Documentación DAMM v2](https://docs.meteora.ag/core-products/damm-v2/concentrated-liquidity): rango por pool y liquidez concentrada.

EXTERNALLY VERIFIED significa contrastado con estas fuentes públicas, no auditoría externa del adaptador ni ejecución contra un programa desplegado. No se comprobó Mainnet ni equivalencia binaria entre SDK y programa desplegado. La prueba de roundtrip del IDL verifica el formato binario, no éxito de ejecución.

## NFT, recuperación y autorización

El NFT de posición controla la liquidez y las comisiones de esa posición. El payer paga y aporta los activos desde sus token accounts; el creator recibe el NFT. Separarlos no crea financiación automática: la preparación debe reconciliar cuentas del payer y custodia futura. Las autoridades del NFT pertenecen al programa y son distintas de mint/metadata authorities de ROBUSTO.

Retirada futura: titular/delegado autorizado usa remove_liquidity/remove_all_liquidity con la cantidad desbloqueada y límites mínimos. Recupera composición vigente de ROBUSTO/wSOL, no necesariamente el depósito original. La retirada no está implementada en el preparador offline. El ejecutor local ensayó una retirada y redepósito con autorización limitada ya expirada; no queda autorizada otra retirada. Añadir tras compras puede exigir ambos activos.

Reversibles ahora: editar archivos/candidatos y regenerar instrucciones unsigned. El preparador no crea estado. El ledger local temporal sí contiene la ejecución de ensayo y nunca debe convertirse en custodia de producción. Una operación blockchain confirmada no se deshace; retirar liquidez desbloqueada es una operación posterior y no garantiza recuperar valor original. Rango y modo de cobro del pool son decisiones persistentes. Bloqueo permanente y revocación de autoridades serían irreversibles y necesitan autorización separada. Vesting LP restringiría retirada hasta fechas previstas; no asumir cancelación anticipada. Transferir NFT transfiere control y requiere autorización expresa.

Requieren autorización antes de ejecución: creación/fondeo de identidades de ensayo, instalación del programa, creación de cuentas y pool, firmas/envíos incluso locales, depósitos, cambios LP, transferencias NFT, bloqueos, revocaciones y publicación. Mainnet/fondos reales tienen autorización separada adicional y nunca están habilitados aquí.

## Rehearsal local ejecutada — PASSED_LOCAL_RUNTIME

El propietario autorizó exclusivamente esta ejecución local: identidades nuevas temporales, mint/supply de ensayo, instalación local, pool, compras/ventas y cambios LP. La autorización **terminó al completar el ensayo**; el validador está detenido y su binding inactivo. No se interpreta como autorización persistente, Devnet, Mainnet, custodia real, publicación ni precio definitivo. Configuración offline conserva signing/sending/withdrawal false deliberadamente.

Evidencia pública completa: [runtime](evidence/robusto/meteora-local-runtime.json). Contiene únicamente direcciones públicas, firmas locales, hashes y balances; nunca keypairs. Supply 1,000,000,000, decimals 6, freeze None, inventario exacto 1,000,000, perfil MEDIO, rango 3× y referencias USD aprobadas solo para rehearsal. Conversión **100 USD/SOL TEST_ONLY_NOT_A_MARKET_QUOTE**, fee fija 25 bps OnlyB, slippage técnico 50 bps. No son decisiones económicas.

### Instalación reproducible

`npm run build:meteora-local`

Descarga solo el archivo oficial de Meteora fijado por commit, exige SHA-256 `e72439220612d03ee8a41b06a4280f660a51b31fe496548c56d81d740cb59765`, extrae únicamente fuentes/manifests/licencia (sin claves ni binarios upstream), usa su Cargo.lock intacto y compila dos destinos Cargo aislados. Toolchains: Agave 3.1.10, platform-tools v1.52, Rust SBF 1.89.0 y Rust nativo 1.93.0. Ambas compilaciones produjeron SBF SHA-256 `a30610058262a5c87e1b22144ef6053ff2cd8bc9f97b7e978a51e28f8ec3ea3c`. Se conservaron 29 advertencias de compilación upstream; no se silenciaron.

Programas SPL de ensayo: fixtures oficiales del paquete **LiteSVM 0.10.0**, ya fijado en Cargo.lock, checksum de archivo registry `6a6d4edace08253a908d301768f291a7115e8e19e13473dd6e1ace78d6366433`, commit `73b238f33eff09b45cbada50e6074f833c3561bf`. El builder verifica el paquete íntegro antes de extraer Token 3.5.0, Token-2022 10.0.0 y ATA 1.1.1, y registra hashes individuales. Son fixtures verificadas, **no prueba de los binarios desplegados actualmente en ninguna red**. No se añadieron dependencias JS/Rust del producto ni se cambiaron sus lockfiles.

El validador de esta versión no aportó SPL automáticamente. Las simulaciones iniciales rechazaron InitializeMint antes de firmar; se corrigió el filtro del opcode SPL (InitializeMint=0), se instalaron los programas en genesis como upgradeable con autoridad temporal y se esperaron slots locales confirmados >=3. El build tool genera archivos de identidad auxiliares: quedan privados y no se utilizan como signers.

### Ejecutor y controles

`npm run robusto:rehearse-local -- --authorize-local-rehearsal`

**No ejecutar otra vez sin autorización nueva del propietario.** Este flag expresa una autorización externa para una ejecución; no la concede por sí mismo. CI y check:rc no invocan este comando ni firman transacciones.

Solo RPC exacto `http://127.0.0.1:8899`, fetch sin redirects ni fallback, confirmación por polling HTTP local. Antes de crear el validador se rechaza un puerto RPC ocupado. Ledger nuevo, config CLI privada explícita, --mint explícito, bind 127.0.0.1, sin clone, fork remoto, warp, Phantom o keypair global. Genesis se liga al archivo del ledger y a la identidad creada por el validador. **Antes de cada firma** se comprueban de nuevo proceso, hash de genesis, identidad RPC, cluster, parámetros exactos, signers registrados/no históricos y autoridades/cuentas locales.

Identidades de roles, mint, NFT y tres compradores se generan nuevas en `.robusto-local-private/<UUID>/`, directorios 0700 y archivos 0600, ignorados por Git; nunca se imprimen. Los SDK no cargan wallets por defecto. Payer y titular NFT separados, así como mint/metadata/program upgrade authorities. El ejecutor solo codifica initialize_customizable_pool, swap2, remove_liquidity y add_liquidity; no contiene instrucciones de revocación, bloqueo, actualización de metadata ni publicación. Swaps incorporan minimum output y LP incorpora umbrales de importes; la inicialización conserva su limitación de no tener campo slippage.

La metadata ROBUSTO es una **cuenta fixture real del genesis local**, con dueño Metaplex, formato serializado oficial, update authority local separada y mutable=true. Se comprueba íntegra antes/después de operaciones. **No se ejecutó el programa de metadata Metaplex ni se ensayó su publicación/actualización**. El NFT de posición sí fue creado por el programa Meteora y su Token-2022 real local. Su token account pertenece al custodio, contiene exactamente 1 NFT y no tiene delegado. La posición no tiene vesting ni bloqueo permanente.

### Operaciones y comparación matemática

**17 transacciones confirmadas exclusivamente locales**: creación mint; cuentas payer/wSOL; emisión exacta de supply; cuatro preparaciones/fondeos de participantes; dust de redondeo LP (0.001 ROBUSTO); pool unilateral; compra pequeña; compra mediana; venta de media compra pequeña; compra cercana a techo; compra parcial hasta techo; venta posterior; retirada 10% de liquidez desbloqueada; redepósito.

Las filas son **secuenciales**, no compras independientes desde P0. Equivalentes USD solo con conversión TEST_ONLY.

| Operación | Entrada real local | Salida real local | Cambio de precio marginal frente al estado anterior |
|---|---:|---:|---:|
| Compra pequeña, equivalente de ensayo USD 5 | 0.05 wSOL | 6,307.040259 ROBUSTO | +0.535273% |
| Compra mediana, equivalente de ensayo USD 100 | 1 wSOL | 119,436.967453 ROBUSTO | +10.946907% |
| Venta de mitad de compra pequeña | 3,153.520129 ROBUSTO | 0.027633083 wSOL | −0.280936% |
| Compra hasta 99% del intervalo sqrt | 12.535314817 wSOL | 871,611.504475 ROBUSTO | +167.442565% |
| PartialFill hasta Pmax (se solicitaron 1 wSOL) | **0.136944880 wSOL consumidos** | 5,798.007941 ROBUSTO | +0.850689% |
| Venta posterior desde techo | 87,740.951241 ROBUSTO | 1.945802397 wSOL | −11.706583% |

Las seis operaciones coincidieron con el oracle matemático entero **sin diferencias en output base units, input consumido o sqrt Q64**. Este oracle incluye fee 25 bps y redondeos; un modelo continuo sin fees no ofrece ese resultado exacto. Q64 convierte los precios de referencia mediante floor sqrt racional, de modo que los precios codificados son aproximaciones de referencias USD/TEST_ONLY. Llegada exacta al sqrt máximo: vault A conservó **1 base unit = 0.000001 ROBUSTO** por redondeo de liquidez/depósito; no se afirma inventario cero exacto.

Vault B inicial: **1 lamport**, no profundidad económica. Al techo tuvo 13.694626615 wSOL, incluidos fees LP/protocolo; balance del vault no equivale íntegramente a principal retirable. PartialFill conservó la parte de la entrada que no necesitaba consumir. ExactIn por encima del rango fue rechazado por el modelo y por simulación del programa, sin firmar ni enviar. Vender desde el techo funcionó y volvió a abrir inventario comprable.

Retirada 10%: 8,774.095124 ROBUSTO y 1.170957261 wSOL. Redepósito de la misma liquidez: 8,774.095125 ROBUSTO y 1.170957262 wSOL. Diferencia: **1 base unit ROBUSTO y 1 lamport wSOL**, porque retirar redondea abajo y depositar arriba. Cambios LP no alteraron sqrt price; el balance recuperado refleja composición tras trades y no depósito original.

En nueve snapshots se reconcilió exactamente supply total **1,000,000,000,000,000 base units** entre cuentas de participantes y vault; wSOL total **121,000,000,000 lamports** se conservó (fees de transacción pagadas aparte en SOL nativo local). Mint authority ROBUSTO, metadata update authority/mutabilidad, program upgrade authority y dueño NFT permanecieron intactos. **18 controles negativos** de cluster/RPC, genesis/identidad, cantidad, precio/rango, mint, autoridades, revocación/bloqueo, ruta global y límite de compra rechazaron antes de firma/envío; además pruebas unitarias positivas/negativas.

### Seguridad upstream pendiente — no equivale a producción aprobada

`npm run audit:meteora-local`

Este comando audita el Cargo.lock oficial sin parchearlo ni aceptar/suprimir avisos. **Actualmente devuelve exit 1 / BLOCKED_FOR_PRODUCTION_REVIEW**: tres vulnerabilidades de lock y siete advertencias. Evidencia: [auditoría Meteora](evidence/robusto/meteora-upstream-audit.json).

- bytes 1.10.1: [RUSTSEC-2026-0007](https://rustsec.org/advisories/RUSTSEC-2026-0007.html), parche >=1.11.1. No aparece en el árbol normal cp-amm comprobado; el lock incluye SDK/dev/optional. No se atribuye automáticamente al SBF.
- ruint 1.14.0: [RUSTSEC-2025-0137](https://rustsec.org/advisories/RUSTSEC-2025-0137.html), parche >=1.17.1, y [RUSTSEC-2026-0220](https://rustsec.org/advisories/RUSTSEC-2026-0220.html), parche >=1.20.0. **ruint es dependencia directa normal del programa**. Explotabilidad/alcance en Meteora y equivalencia con deployments no fueron demostrados; requieren revisión upstream/especializada antes de producción.
- Advertencias del lock: bincode, derivative, paste sin mantenimiento; anyhow, keccak y dos versiones rand con advertencias de soundness. La auditoría de dependencias del proyecto ROBUSTO es separada y conserva su política previa; no incluye estos avisos como allowlist.

No se altera el programa oficial para aparentar una auditoría limpia. Haber completado la rehearsal no elimina estos hallazgos, no aprueba seguridad ni habilita Mainnet. La evidencia local puede guardarse como preparación con este bloqueo explícito.

## Pendientes y recuperación

La rehearsal requerida quedó terminada. Siguen pendientes revisión de seguridad upstream, fidelidad de fixtures respecto a futuros programas objetivo, ensayo del programa Metaplex si se autoriza en una etapa separada, decisiones económicas definitivas, fees/slippage de lanzamiento, política/custodia NFT y liquidez, wallets/backup de producción, fechas base de vesting, costes live quote, Arweave y autorización final de cada operación. No hay un fallo funcional local restante; repetir requiere autorización nueva.

Recuperación sin esta sesión/Astra: restaurar backup público o checkout del commit, dependencias con lockfile y scripts deshabilitados, `npm run test:client`, `npm run robusto:meteora-local -- validate`; leer evidencia y auditoría. Para reconstruir binarios, `npm run build:meteora-local` necesita herramientas fijadas y archivo registry LiteSVM verificado (restaurar dependencias Cargo si falta). `npm run audit:meteora-local` debe conservar el resultado fallido mientras existan los avisos. El backup público contiene código y evidencia, **no identidades/ledger privado ni un binario externo aprobado para producción**. Claves de ensayo son desechables y no sirven para custodia real. No recuperar ni reutilizar las identidades históricas Devnet. El calendario del tercer rehearsal queda intacto.
