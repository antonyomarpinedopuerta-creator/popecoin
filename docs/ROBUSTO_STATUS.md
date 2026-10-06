# ROBUSTO — estado vigente

Documento vigente para el propietario y continuidad sin Astra: [ROBUSTO_READY_FOR_OWNER_DECISIONS](ROBUSTO_READY_FOR_OWNER_DECISIONS.md). Las propuestas nuevas no aprueban allocations ni operaciones.
NOT_AUTHORIZED_FOR_MAINNET · MAINNET_DISABLED. Código de preparación cerrado dentro del alcance seguro; no token, mercado ni metadata ROBUSTO de producción creados. Candidato: 1.000.000.000 ROBUSTO, seis decimales = **1.000.000.000.000.000 unidades base**, freeze=null. Distribución sin decidir; PROPOSED_NOT_APPROVED.

El tercer rehearsal está financiado y se conserva. Última observación RPC finalized: slot 508092917, cadena 2026-10-06 12:28:16 UTC; supply/vault=10000000, source/beneficiario/released=0. Evidencia: [third-status](evidence/robusto/third-status-2026-10-06T12-28-16-613Z.json). Se conserva también la observación anterior de las 12:12:53 UTC. La consulta validó identidad, calendario y reconciliación; el Clock observado sigue anterior al start y al cliff. No hubo ninguna nueva firma/transacción en esta actualización.

Calendario inmutable UTC:

| Hito | Fecha |
|---|---|
| Start | 2026-10-06 13:32:52 |
| Cliff | 2026-10-07 01:32:52 |
| Primer parcial objetivo | 2026-10-08 13:32:52 |
| Segundo parcial objetivo | 2026-10-10 13:32:52 |
| End | 2026-10-13 13:32:52 |

No esperar activo ni alterar reloj. Llegar a una fecha no autoriza firmar. Los releases requieren autorización nueva por operación y elegibilidad por Clock on-chain. El segundo rehearsal queda abandonado/vacío y el primero finalizado; no cerrar/resetear/reutilizar ninguno.

[Clasificación IMPLEMENTED / TESTED / EXTERNALLY VERIFIED / PENDING](ROBUSTO_CLOSURE.md), [resultados exactos](evidence/robusto/closure-validation.md), [procedimiento de producción](ROBUSTO_MAINNET_CHECKLIST.md), [autoridades](ROBUSTO_AUTHORITIES.md), [mercado](ROBUSTO_LAUNCH_CHECKLIST.md), [recuperación](ROBUSTO_RECOVERY.md).

Revisión adicional completada: [cierre autónomo del 6 de octubre](ROBUSTO_FINAL_REVIEW.md). Suite de código: 95 cliente, 49 Python y 48 Rust por identidad; PNG con descompresión acotada, preflight de instrucciones canónicas, autoridades separadas y backup ligado a auditoría exacta. Las verificaciones finales del commit limpio se conservan en target; el backup se identifica mediante su manifest y sidecar, sin autorreferencias de hash en las fuentes.

Pendientes exclusivos de propietario/externos: distribución/vesting/start aprobados, signers y custodia separados, integración de firma, revisión independiente, autorización y presupuesto. Ninguna distribución histórica PAPA ha sido escalada o aprobada para ROBUSTO. Mint authority, metadata update authority y program upgrade authority siguen conservadas y separadas en el diseño.

TOKEN CREATED y TOKEN PUBLICLY TRADABLE son estados distintos. No hay DEX/launchpad/contraparte/liquidez elegido ni costes actuales de mercado verificados. Un mercado líquido necesita un mecanismo real de liquidez/contrapartida; minimizar capital no elimina ese requisito. No se selecciona proveedor sin decisión y verificación actuales.

Logo oficial incorporado: **OFFICIAL_USER_ASSET_VALIDATED**, PNG 1254 × 1254; hash y registro en [OFFICIAL_ASSET](../metadata/robusto/OFFICIAL_ASSET.md). Hosting/URI y contenido final siguen pendientes; no publicado.

Metadata pública: nombre/símbolo ROBUSTO, descripción final y omisión de web aprobados en [CONTENT_APPROVAL](../metadata/robusto/CONTENT_APPROVAL.json). Preferencia Arweave aprobada; proveedor, coste, URI y autorización de publicación/pagos pendientes. Metadata mutable y autoridad retenida. Supply/distribución siguen propuestas.
