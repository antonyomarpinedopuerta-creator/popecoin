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
