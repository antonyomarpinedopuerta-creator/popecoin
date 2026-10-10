# ROBUSTO — estado vigente

Avance de desarrollo desde f21ffae: [clasificación de bloqueos y validación offline](ROBUSTO_MAINNET_EXECUTION_PLAN.md#revisión-técnica-desde-f21ffae--2026-10-10). Ensayo unsigned externo con cancelación/timeout y fallos de transporte cubiertos; 185 tests cliente, 63 Python y TypeScript aprobados. Firma real/dispositivo, RC definitiva, publicación Arweave y revisión residual Meteora siguen pendientes. Laptop con cargador según propietario; diagnóstico de batería diferido, sin certificar estabilidad. No se generan identidades ni se habilita Mainnet.

Documento vigente para el propietario y continuidad sin Astra: [ROBUSTO_READY_FOR_OWNER_DECISIONS](ROBUSTO_READY_FOR_OWNER_DECISIONS.md). Los parámetros económicos aprobados no autorizan allocations operativas ni transacciones.
Plan técnico actualizado desde d9f3387: [avance offline, bloqueos y decisiones](ROBUSTO_MAINNET_EXECUTION_PLAN.md#avance-offline-desde-d9f3387--2026-10-10). Handoff externo probado solo con adaptador unsigned ficticio; firma/hardware de producción sigue pendiente. Inspección offline de metadata disponible sin generar URIs ficticias ni subir archivos. Findings Meteora históricos sin resolver y sin revalidación actual de red.
NOT_AUTHORIZED_FOR_MAINNET · MAINNET_DISABLED. Código de preparación cerrado dentro del alcance seguro; no token, mercado ni metadata ROBUSTO de producción creados. Supply objetivo aprobado: 1.000.000.000 ROBUSTO, seis decimales = **1.000.000.000.000.000 unidades base**, freeze=null. Distribución 50/15/30/5 aprobada únicamente como parámetros económicos; 500M mercado NO es circulación inicial.

Host, actualización manual del propietario posterior a 18d88d1: tmpfs/propietario corregidos; preflight comunicado `blocks=1 unknowns=5` (IPv4 activa deliberadamente para desarrollo). BitLocker C: XTS-AES 128 al 100 %, Defender/firewall activos, Inicio rápido y suspensión automática con cargador desactivados; Ubuntu en AppData local fuera de carpetas habituales OneDrive y pagefile activo en volumen cifrado, según comprobación manual. No equivale a host certificado ni aislamiento offline. [Estado, límites de evidencia y procedimiento para los cinco UNKNOWN](ROBUSTO_LAPTOP_WSL_CUSTODY_PREPARATION.md#estado-vigente-comunicado-por-el-propietario--2026-10-10-después-de-18d88d1). Hibernación, historial/transcripción, alcance completo de sync/backup, recuperación en otro equipo y estabilidad sostenida siguen pendientes. No se cambiaron configuraciones en esta actualización.

Ampliación manual del propietario posterior a c4a8995 (`OWNER_CONFIRMED`): WSL `2.7.14.0`, kernel comunicado `6.18.33.2-2`, Ubuntu `Running` versión `2`, `.wslconfig` con `swap=0`, `wslinfo --networking-mode` = `nat`, HNS tipo `ICS`, firewall Hyper-V activado y tres perfiles con entrantes `Block`/salientes `Allow`. Codex no repitió estas consultas en esta actualización. [Origen y límites](ROBUSTO_LAPTOP_WSL_CUSTODY_PREPARATION.md#verificaciones-manuales-de-windows-posteriores-a-c4a8995). Se aclara la configuración de red WSL, pero sigue online para desarrollo: no implica aislamiento ni cierre de los cinco UNKNOWN; hibernación, telemetría, historial y alcance de backup/sync siguen pendientes. `NOT_AUTHORIZED_FOR_MAINNET` permanece vigente.

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

Pendientes exclusivos de propietario/externos: importes efectivos de mercado/comunidad, fechas/beneficiarios y custodia final, signers y custodia separados, integración de firma, revisión independiente, autorización y presupuesto. Ninguna distribución histórica PAPA ha sido escalada o aprobada para ROBUSTO. Mint authority, metadata update authority y program upgrade authority siguen conservadas y separadas en el diseño.

TOKEN CREATED y TOKEN PUBLICLY TRADABLE son estados distintos. Meteora DAMM v2 unilateral ROBUSTO/SOL está elegido **solo para preparación**, con OnlyB, fee fija 25 bps, sin dynamic fee, rango objetivo 3× e inventario objetivo 1M ROBUSTO. No hay mercado ni liquidez de producción creados, precio final ni costes actuales verificados. Un mercado líquido necesita liquidez/contrapartida real; minimizar capital no elimina ese requisito. Decisiones vigentes: [aprobaciones pendientes](ROBUSTO_FINAL_OWNER_APPROVAL.md); la comparación de mecanismos anterior es histórica.

Logo oficial incorporado: **OFFICIAL_USER_ASSET_VALIDATED**, PNG 1254 × 1254; hash y registro en [OFFICIAL_ASSET](../metadata/robusto/OFFICIAL_ASSET.md). Hosting/URI y autorización de publicación siguen pendientes; no publicado.

Metadata pública: nombre/símbolo ROBUSTO, descripción final y omisión de web aprobados en [CONTENT_APPROVAL](../metadata/robusto/CONTENT_APPROVAL.json). Preferencia Arweave aprobada; proveedor, coste, URI y autorización de publicación/pagos pendientes. Metadata mutable y autoridad retenida. Supply/distribución están aprobados como parámetros únicamente; consultar config/robusto-economics-approved.json.

Políticas progresivas aprobadas: [registro](ROBUSTO_PROGRESSIVE_LAUNCH_PROPOSAL.md), techos5M/3M/2M sin transferencias automáticas, equipo365+730 días, reserva técnica180+1.095 días. Fechas/wallets sin adoptar. Siguiente etapa pendiente: [custodia, fechas, Arweave y mercado](ROBUSTO_NEXT_STAGE_FOR_APPROVAL.md). allocations=null y guard operacional distributionStatus=PROPOSED_NOT_APPROVED permanecen hasta direcciones, condiciones y autorización específicas; no contradicen la aprobación económica separada.

## Continuidad offline — 2026-10-10

Se reforzó el preflight de custodia: un error al consultar swap, opciones rw/ro o rutas ya no se interpreta como condición segura. Se comprueban rutas predeterminadas IPv4 e IPv6. El montaje rw es solo una observación; el script no escribe un archivo de prueba ni certifica acceso efectivo o aislamiento del anfitrión. Pruebas de regresión con comandos simulados, sin montar, generar claves ni consultar RPC: `python3 -m unittest discover -s tests -p test_robusto_laptop_preflight.py -v`.

Validación de este cambio: 62 tests Python (6 nuevos), 176 tests de cliente, `tsc --noEmit`, sintaxis Bash, `git diff --check`, metadata local e inventario público vacío. Security scan sin hallazgos en archivos públicos actuales y bytes de los últimos 20 commits; es heurístico y no una garantía universal. No se reconstruyó SBF ni se repitió rehearsal/RC completo: no cambió contrato, ABI o dependencias. La evidencia RC previa no se presenta como validación del nuevo commit.

Los resultados de tests y lecturas on-chain mencionados arriba son históricos; no prueban el HEAD nuevo ni el estado actual de Devnet. No se alteró su calendario y no se ejecutaron releases. El apagado de la laptop no autoriza regenerar identidades ni repetir operaciones. El diagnóstico del host queda separado del software y no constituye aprobación de custodia.

Prueba física del fixture S22 completada el 2026-10-10: transporte USB confirmado por el propietario hasta una carpeta nueva `-03`; ambos hashes y descifrado/restauración ficticia verificados localmente. [Evidencia y límites](evidence/robusto/s22-physical-fixture-2026-10-10.md). No equivale a restaurar wallets ni certificar seguridad del host.

Pendientes actuales: estabilidad y controles de custodia del host, ocho identidades públicas tras ceremonia expresamente autorizada, integración de firma externa, fecha/beneficiarios, precio e importes efectivos, política de posición/NFT, presupuesto y publicación Arweave, revisión independiente y riesgo residual de Meteora (3 advisories/7 warnings históricos, sin declarar resolución). Las cotizaciones actuales y verificaciones de producción requieren una etapa posterior autorizada. Ningún resultado offline levanta `NOT_AUTHORIZED_FOR_MAINNET` o `MAINNET_DISABLED`.
