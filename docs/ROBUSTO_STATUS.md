# ROBUSTO — estado y límites de lanzamiento

Esta es la entrada actual de estado. Las referencias técnicas PAPA/popecoin y sus documentos anteriores se mantienen para reproducibilidad; no constituyen un plan aprobado para ROBUSTO.

| Estado | Alcance |
|---|---|
| IMPLEMENTED | Programa/planners históricos; recuperación RPC persistente de ROBUSTO; preparación unsigned de reciclaje; propuesta de producción separada; metadata ROBUSTO separada; runbook del segundo rehearsal |
| TESTED | 47 tests Rust (36 integración), 71 tests cliente, 45 tests Python, TypeScript, artefactos y metadata histórica PASS; ver evidence/robusto/SESSION_2026-10-04.md. Los mocks no prueban inclusión real de transacciones |
| EXTERNALLY VERIFIED | Solo observaciones RPC de Devnet documentadas en `evidence/robusto/recovery-*.json`, con slot, firma y commitment. Esto no es auditoría independiente ni CI aprobado |
| PENDING | Segundo rehearsal temporal real; imagen oficial, hosting y metadata; decisiones finales de producción/custodia/distribución; revisión independiente; autorización y financiación de lanzamiento |

## Producción propuesta, no autorizada

`config/robusto-production.json`: 1,000,000,000 ROBUSTO, 6 decimales = 1,000,000,000,000,000 unidades base. Sin freeze authority. Supply fijo después de emitir y verificar el total definitivo; revocación futura de mint authority requiere revisión/autorización separada y no está autorizada aquí. Metadata actualizable, update authority conservada.

Mint, programa definitivo, allocations, custodios, fecha y URIs permanecen pendientes. No escalar automáticamente las antiguas asignaciones PAPA ni reutilizar identidades protegidas. `config/production-plan.json`, `scripts/production-plan.ts` y los documentos PAPA representan el plan histórico de 10 millones de tokens; el nuevo archivo no alimenta esos ejecutores/planners. No hay ejecutor Mainnet ROBUSTO autorizado.

## Dinero real mínimo

Esta sesión no usa Mainnet ni SOL real. Reutilizar el supply y programa Devnet evita mint/deploy adicionales de ensayo. Antes de cotizar lanzamiento, decidir si se necesita el programa de vesting propio en producción; esa elección debe preservar los requisitos acordados. No confundir creación del token con creación de liquidez: no hay presupuesto de pool autorizado.

Un presupuesto real debe consultar rent para tamaños exactos, getFeeForMessage de cada operación, hosting y eventual despliegue del programa en una futura revisión autorizada. No hay importe mínimo garantizado ni precio SOL/USD validado en esta sesión. Evitar depósitos/rent duplicados y despliegues innecesarios; no retirar controles de seguridad para ahorrar. Custodia y revisión independiente siguen pendientes.

## Próximo paso on-chain

La devolución TransferChecked fue autorizada y FINALIZED el 2026-10-04; evidencia en `evidence/robusto/authorized-return-2026-10-04.json`. Source=10000000, beneficiario antiguo=0, supply intacto. La ATA nueva también fue autorizada y FINALIZED: `evidence/robusto/authorized-ata-2026-10-04.json`, saldo0. Initialize nuevo FINALIZED: `evidence/robusto/authorized-initialize-second-2026-10-04.json`. Total10000000, released0, vault vacío; siguiente paso Deposit, pendiente de autorización independiente. No repetir el release final ya finalizado. El nuevo beneficiario ya se generó localmente con permisos privados; La ATA ya existe con saldo cero; PDA/vault ya existen con total10000000 y saldo0; calendario definitivo persistido en config/robusto-rehearsal-2.json. No recalcularlo.

## Revisión y negociación pública

Ver ROBUSTO_SECURITY_REVIEW.md: mint authority rehearsal activa, programa actualizable, depósitos posteriores al primer release rechazados y excedentes sin rescue. No se cambió diseño. CI del commit 1706e77: success, run 37131484384; no atribuir ese resultado a commits posteriores.

Para Mainnet-ready faltan completar el ensayo temporal real, revisión independiente, imagen exacta/URIs, parámetros finales de distribución/vesting, identidades/custodia de producción y aprobación de presupuesto/operaciones. Propuesta actual marcada NOT_AUTHORIZED_FOR_MAINNET.

Para negociación pública, además de emitir/distribuir de forma autorizada el mint real y verificar metadata/autoridades, falta elegir y verificar un mecanismo de mercado (DEX/launchpad u otro), sus requisitos, par y condiciones, presupuesto y procedencia de liquidez, comisiones y autorización de las operaciones reales. Crear un mint no crea un mercado. No se eligió plataforma ni se asumió liquidez o coste; no hay readiness comercial implícita.
