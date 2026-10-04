# Tercer rehearsal ROBUSTO — primera tanda FINALIZED

Autorización: únicamente ATA, Initialize, Deposit 10,000,000 raw y simulación unsigned pre-cliff.
Base: b1f1a99dcfea40ad66c6ef13d6c97514b9663932. No releases reales autorizados ni enviados.

| Operación | Signature | Slot | Fee lamports | Rent lamports |
|---|---|---:|---:|---:|
| ata | `2VjZkKkQ1K8QLm3P4MQ2H2X4zirByNduYz1RDuQmMEpaf3uPVwv8RkPBtMyySajQkRK1zprZEeKkiYZ4i5JsDMTu` | 507380424 | 5000 | 1488440 |
| initialize | `25wwMHeceVhd9AN7eDp2Vho4FRFAkXpLCAVK5LauATFHkdRntsFSZDr5YkS4Cb8Goy98NQR5GhW7e9nEqrbcEi7o` | 507380753 | 15000 | 2875280 |
| deposit | `3LMuHs8Tv2uHyFUp1UBGeLkDW6jzHtZVEX8xcEuDmU6rf3FXoB3MQ9aSVMPvjas1pawGqj9tbyCuqfeGFz94W6Fj` | 507381934 | 10000 | 0 |

Coste total real 4,393,720 lamports Devnet, igual al máximo autorizado. Payer final 6,297,115,440 lamports.

Calendario inmutable verificado contra estado on-chain:

- T: 2026-10-04 13:32:52 UTC (1791120772).
- start: 2026-10-06 13:32:52 UTC (1791293572).
- cliff: 2026-10-07 01:32:52 UTC (1791336772).
- end: 2026-10-13 13:32:52 UTC (1791898372).
- firstPartial: 2026-10-08 13:32:52 UTC (1791466372).
- secondPartial: 2026-10-10 13:32:52 UTC (1791639172).

Estado finalized final, slot 507382095: source=0, vault=10,000,000, beneficiario=0,
released=0, total=supply=10,000,000. Decimales6, mint authority original, freeze=null,
ProgramData/upgrade authority/ELF fijados sin cambios según lector estricto antes/después de operaciones.
Segundo vault y released permanecen 0. Ninguna instrucción de mint/metadata/autoridades/Mainnet.

Simulación unsigned Release aislado: `{"InstructionError":[0,{"Custom":6002}]}`.
Log Anchor: NothingToRelease. No firmas, ningún envío, ningún fee para esta simulación.
Estado final preservado. Datos completos y logs en third-executed-precliff.json.

Primer parcial objetivo: **2026-10-08 13:32:52 UTC** (Chicago 08:32:52 CDT).
Ventana prevista: desde cliff hasta 2026-10-09 13:32:52 UTC exclusivo.
Requiere NUEVA autorización; no existe ejecución programada ni proceso automático.
Segundo parcial objetivo 2026-10-10 13:32:52 UTC; final desde 2026-10-13 13:32:52 UTC.

Evidencias guardadas antes de cada envío (firma + blockhash) y actualizadas tras finalized.
Una sola llamada send por transacción, maxRetries=0. Sin reenvíos.
No recompilación ni cambios del programa. Verificaciones efectivas: simulación de cada operación,
confirmación finalized, fee/rent por saldo payer, snapshot tipado con owner/mint/identidades/ELF,
y error6002 de pre-cliff. Pruebas de código previas no se repitieron por ser cambios de evidencia/config.
