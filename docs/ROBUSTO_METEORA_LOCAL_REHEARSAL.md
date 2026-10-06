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

El snapshot de mint también es input offline, no prueba del estado de un cluster. El identificador oficial del programa y sus PDAs se usan como namespace para futura instalación **local** de la versión correspondiente; no significan conexión ni verificación de Mainnet. No se acepta un programa alternativo arbitrario. El preparador no certifica la procedencia de un servidor local ni impide a una herramienta externa reutilizar bytes unsigned: su garantía es que este repositorio no los firma/envía y que su entrada queda restringida a preparación local.

## Fuentes externas revisadas

- [Programa Meteora](https://github.com/MeteoraAg/damm-v2/tree/a85c926607433f23f0ea60f4ca7b1ae92f4156cb), commit fijado `a85c926607433f23f0ea60f4ca7b1ae92f4156cb`: initialize_customizable_pool, constants, fee_parameters y fee_time_scheduler. Revisados seeds, límites, cuentas, fee fija y depósito mínimo de ambos activos.
- [SDK/IDL oficial](https://github.com/MeteoraAg/cp-amm-sdk/tree/79ebbfe59a225e641a2f37cd03404f26de1b0c8e), commit fijado `79ebbfe59a225e641a2f37cd03404f26de1b0c8e`: IDL y concentratedLiquidity. `scripts/meteora-local-idl.json` es un extracto sin modificaciones de la instrucción y sus cuatro tipos dependientes, con atribución MeteoraAg. SHA-256 del extracto: `e476ace8abaf90b70660c7a9bca39e604bb606880a865625bb31cfb3857b4d0d`.
- [Documentación DAMM v2](https://docs.meteora.ag/core-products/damm-v2/concentrated-liquidity): rango por pool y liquidez concentrada.

EXTERNALLY VERIFIED significa contrastado con estas fuentes públicas, no auditoría externa del adaptador ni ejecución contra un programa desplegado. No se comprobó Mainnet ni equivalencia binaria entre SDK y programa desplegado. La prueba de roundtrip del IDL verifica el formato binario, no éxito de ejecución.

## NFT, recuperación y autorización

El NFT de posición controla la liquidez y las comisiones de esa posición. El payer paga y aporta los activos desde sus token accounts; el creator recibe el NFT. Separarlos no crea financiación automática: la preparación debe reconciliar cuentas del payer y custodia futura. Las autoridades del NFT pertenecen al programa y son distintas de mint/metadata authorities de ROBUSTO.

Retirada futura: titular/delegado autorizado usa remove_liquidity/remove_all_liquidity con la cantidad desbloqueada y límites mínimos. Recupera composición vigente de ROBUSTO/wSOL, no necesariamente el depósito original. La retirada no está autorizada ni implementada en este adaptador. Añadir tras compras puede exigir ambos activos.

Reversibles ahora: editar archivos/candidatos y regenerar instrucciones unsigned. No hay estado on-chain que recuperar. Una operación blockchain confirmada no se deshace; retirar liquidez desbloqueada es una operación posterior y no garantiza recuperar valor original. Rango y modo de cobro del pool son decisiones persistentes. Bloqueo permanente y revocación de autoridades serían irreversibles y necesitan autorización separada. Vesting LP restringiría retirada hasta fechas previstas; no asumir cancelación anticipada. Transferir NFT transfiere control y requiere autorización expresa.

Requieren autorización antes de ejecución: creación/fondeo de identidades de ensayo, instalación del programa, creación de cuentas y pool, firmas/envíos incluso locales, depósitos, cambios LP, transferencias NFT, bloqueos, revocaciones y publicación. Mainnet/fondos reales tienen autorización separada adicional y nunca están habilitados aquí.

## Pendientes para rehearsal ejecutada

1. Aprobar cotización sintética, fees/slippage y escenario de ensayo (pueden proporcionarse ahora como datos de preparación).
2. Instalar el programa oficial compatible en un entorno aislado local y verificar versión/binario; no reutilizar identidades o rehearsal Devnet históricos.
3. Crear por etapa autorizada identidades **de ensayo**, cuentas, mint/metadata y saldos sintéticos; sin identidades Mainnet. Verificar snapshot contra cuentas reales locales y custodias.
4. Implementar y probar runtime de creación, compras, ventas, límites, comisiones, y reconciliación del NFT/autoridades. El preparador actual no ejecuta esas operaciones.
5. Revisar resumen de operaciones y obtener autorización explícita antes de firmas/envíos. Decisiones económicas definitivas y publicación permanecen pendientes.

Recuperación de sesión: checkout del commit, instalación con lockfile, `npm run robusto:meteora-local -- validate`, `npm run test:client`, lectura de este documento. Config tiene quote null y ninguna identidad definitiva. Los resultados temporales de simulación en target no son decisiones aprobadas ni secretos.
