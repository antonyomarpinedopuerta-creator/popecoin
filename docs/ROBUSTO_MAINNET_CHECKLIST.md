# ROBUSTO — preparación Mainnet, ejecución deshabilitada

Estado obligatorio actual: MAINNET_DISABLED / NOT_AUTHORIZED_FOR_MAINNET. Ningún comando de este documento autoriza transacciones. Los módulos nuevos no firman/envían ni leen claves. `npm run robusto:production` valida la propuesta offline. `instructions` exige datos públicos, IDL de producción y rent explícito; falla cerrado con los null actuales.

## Preparación completada en software

- Supply exacto con bigint y límites u64; 1e15 raw, SPL clásico, decimals=6, freeze=null.
- Validación de distribución exactamente 10000 basis points y 1e15 raw; beneficiarios únicos y claves protegidas excluidas. Conservar allocations=null hasta decisión.
- Construcción unsigned de mint, ATA source/destinos, emisión exacta única, transferencias, Initialize/Deposit de vesting y metadata mutable.
- Buffer/create/write/deploy unsigned y verificación de loader/ProgramData/upgrade authority/ELF exacto/padding.
- `validatePreparedStage` compara etapa, programa, cuentas, flags de firma/escritura y bytes de instrucciones con los builders canónicos antes de RPC. No sustituye aprobación del mensaje final, actualización de rent ni simulación.
- Guard de lectura futura: HTTPS público sin secretos, cluster mainnet-beta y genesis `5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d`. Opt-in literal `READ_ONLY:<genesis>`; por defecto se rechaza antes de RPC. No se usó aquí.
- Cotización de fees/rent por mensaje, cartera system y snapshot/reconciliación de distribución inicial, mint/metadata/autoridades. Tests usan RPC mock, jamás Mainnet.

## Condiciones aún necesarias, en orden

1. Aprobar supply/distribución, necesidad del programa propio, vestings/fechas, custodia y presupuesto. Revisión independiente y verificación de integración de firma. Ningún pubkey demuestra por sí solo control seguro.
2. Elegir signers de producción separados para payer, mint authority, metadata update authority y upgrade authority. No usar identidades Devnet/PAPA. Decidir multisig/hardware y adaptar builders si corresponde; el camino actual exige firmantes on-curve individuales y no simula soporte multisig.
3. Recibir imagen exacta; validar visualmente, PNG y SHA256 aprobado. Elegir/verificar hosting; preparar JSON, publicar bytes autorizados, descargar/comparar/hash y fijar ambas URI/digest. No imagen sustituta ni metadata PAPA sobrescrita.
4. Fijar program public ID, construir aisladamente para ese ID y reproducir ELF/IDL con herramientas fijadas. `target/robusto-production/idl.json` debe ser IDL real de ese build, nunca un IDL histórico meramente editado. Registrar hash y tamaño/capacidad. Los fixtures sintéticos no son artefactos desplegables.
5. Crear una revisión de ejecución futura separada: configuración autorizada nueva, red/genesis verificados, exacto mensaje/hash/firmantes/importe. No cambiar silenciosamente flags de propuesta para habilitar ejecución; no existe executor automático. Integrar wallet elegida, mostrar simulación y aprobar cada operación.
6. Cotizar en red vigente: rent para 82/165/145 bytes y loader buffer/program/programData; fees para cada write/deploy/ATA/mint/transfer/vesting/metadata; coste real de metadata por delta de payer en simulación; priority fees/hosting por separado. `completeBudget=false` hasta completar lo externo. Comprobar rent embebido, saldo y reserva aprobada; no asumir tarifas históricas Devnet.
7. Preflight por operación: confirmar cuentas nuevas ausentes para mint/program/PDAs; ATAs correctas/empty según etapa; owners/token program, decimales, freeze, mint authority, delegates/close authority, supply/source y horario/Clock; control de cada signer; blockhash fresco y simulación exitosa. Duplicados/inclusión incierta se resuelven por firma/estado, nunca por reenvío ciego.
8. Deploy de programa si se aprueba. Verificar buffer entero antes de deploy, programa después y digest exacto. No upgrade ni revocación automática.
9. Crear mint sin freeze; ATA fuente; exigir supply=0 ANTES de emisión única de 1e15. Confirmar supply exacto y ATA fuente después. Nunca repetir emisión ante incertidumbre.
10. Crear ATAs, transferir allocations directas; Initialize con payer/authority/beneficiary; verificar calendario/PDA/vault vacío antes de Deposit exacto. Confirmar cada paso finalized antes del siguiente. Si recepción concurrente altera saldos, detener/replanificar.
11. Metadata: confirmar cuenta ausente para create, o autoridad/URI actuales para update. Mantener isMutable=true y update authority. Verificar Metaplex owner/PDA/mint/nombre/símbolo/URI/TokenStandard.Fungible/fee0 y bytes off-chain. No cambio de autoridad implícito.
12. `verifyProductionSnapshot`: un contexto finalized, ELF, supply1e15/source0, balance directo por allocation, total/released/vault por vesting, metadata y autoridades. Antes de que destinatarios gasten; >100 cuentas requiere batching revisado aparte. Persistir firmas/slots, owner/hash de cuentas y gastos de SOL por separado.
13. Separar TOKEN CREATED de mercado público; cumplir checklist de lanzamiento antes de cualquier pool/launchpad/contraparte. Ninguna liquidez está autorizada.

## Reanudación segura

Cada aprobación liga cluster, instrucciones, mensaje SHA256, blockhash, firmantes, cantidades y máximo gasto. Persistir firma antes de envío, luego consultar finalized. Si falla conexión después de envío, conservar journal y consultar firma/estado; no mint/deposit/deploy repetidos automáticamente. Tras cambios de estado/blockhash regenerar, simular y revisar de nuevo. No guardar secretos en evidencia, logs, Git ni backup público.

Revocaciones separadas, futuras e irreversibles: [ROBUSTO_AUTHORITIES.md](ROBUSTO_AUTHORITIES.md). No son un paso de este cierre ni requisito automático para emitir el candidato.
