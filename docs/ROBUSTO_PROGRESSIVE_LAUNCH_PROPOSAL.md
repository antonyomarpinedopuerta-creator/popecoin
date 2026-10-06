# ROBUSTO — políticas de preparación aprobadas

**APPROVED_PREPARATION_POLICY_ONLY / NOT_AUTHORIZED_FOR_MAINNET.** Registro vigente: [config/robusto-launch-policy-approved.json](../config/robusto-launch-policy-approved.json). El propietario aprobó estas políticas; ninguna autoriza operaciones, creación de wallets definitivas ni publicación. La [siguiente etapa](ROBUSTO_NEXT_STAGE_FOR_APPROVAL.md) sigue pendiente de aprobación.

## Techos iniciales, no transferencias automáticas

| Bucket aprobado | Total ROBUSTO | Techo inicial | Fuera de primera etapa, como mínimo |
|---|---:|---:|---:|
| Mercado/ecosistema/lanzamiento | 500.000.000 | 3.000.000 | 497.000.000 |
| Comunidad/marketing | 150.000.000 | 2.000.000 | 148.000.000 |
| Reserva | 300.000.000 | 0 | 300.000.000 |
| Equipo/fundador | 50.000.000 | 0 | 50.000.000 |
| Total | **1.000.000.000** | **5.000.000 (0,5%)** | **995.000.000** |

Techo5M=5.000.000.000.000 base units; mercado3M=3.000.000.000.000; comunidad2M=2.000.000.000.000. Las cantidades efectivas siguen null: mecanismo, costes y liquidez deben evaluarse antes de decidirlas. Los 3M no deben entrar automáticamente a un pool. No se dispone de precio, demanda ni capital de contraparte aprobados.

497M de mercado y148M de comunidad permanecen fuera de la primera circulación conforme a política administrativa y custodia; no afirmar bloqueo técnico donde no existe. La disponibilidad técnica de una wallet, supply emitido, circulación reportada y liquidez de pool son conceptos distintos. El builder existente prepara distribución a tesorerías; no ejecuta campañas ni depósitos en DEX, y no impone por contrato el techo de mercado/comunidad.

## Vesting aprobado, fechas/beneficiarios pendientes

Equipo50M: cero acceso365 días desde fecha base S, luego lineal730 días. Reserva300M: bloqueo técnico, cero acceso180 días desde S, luego lineal1.095 días. Para ambos usar start=cliff=S+espera y end=start+duración. Al instante exacto de start vested=0; después comienza acumulación. No usar el candidato histórico start=S con cliff posterior, que habría acumulado durante la espera.

Programa actual: Initialize acepta start<=cliff<=end y start<end; Deposit exige la financiación íntegra restante, con released=0; Release usa Clock, requiere firma del beneficiario y transfiere solo vested-released. PDA de vesting/vault deriva de programa+beneficiario+mint; equipo y reserva deben tener beneficiarios distintos. No hay clawback/cancelación administrativa ni releases automáticos. Verificación técnica depende de financiar y verificar ambos vaults y de custodiar upgrade authority: un programa actualizable no constituye una garantía contra upgrades futuros.

## Comunidad y autoridades

Hasta2M inicialmente, restantes148M fuera de circulación; ninguna campaña ni gasto trimestral automático aprobado. Cada campaña/distribución posterior requiere decisión independiente. La propuesta histórica de5M por trimestre no quedó aprobada y no se aplica.

Preparación de ocho roles separados: mercado, comunidad, reserva, equipo, payer, mint authority, metadata update authority, program upgrade authority. Direcciones y backups definitivos pendientes; no generados. Metadata mutable, update authority conservada. Objetivo futuro: emitir exactamente1.000M y reconciliar antes de decidir por separado revocación de mint authority. mintAuthorityRevocationAuthorized permanece false; tampoco revocar upgrade/update.

Validación segura: `npm run robusto:launch-policy -- validate`. Fechas puramente propuestas: `npm run robusto:launch-policy -- dates 2026-11-01T00:00:00Z`; ese comando solo calcula, no adopta fechas ni crea cuentas. Económicas: `npm run robusto:production -- economics`. Rehearsal Devnet y sus fechas permanecen intactos.
