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
