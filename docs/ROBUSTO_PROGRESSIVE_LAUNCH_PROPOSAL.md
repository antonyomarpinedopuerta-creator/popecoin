# ROBUSTO — propuesta de lanzamiento progresivo para aprobación

**PROPOSED_NOT_APPROVED.** Este documento registra recomendaciones, no nuevas decisiones del propietario. Únicamente están aprobados los parámetros de config/robusto-economics-approved.json: supply objetivo 1.000M, 6 decimales, freeze=None, buckets 500M/150M/300M/50M. No Mainnet, mint real, firma, transferencias, publicación ni pagos autorizados. El rehearsal Devnet permanece intacto.

## Circulación inicial y mercado

Propuesta de techo inicial: **hasta 5.000.000 ROBUSTO (0,5% del supply)**, condicionado a mecanismo y presupuesto verificables. No es una exigencia de ponerlos todos en circulación; si no hay presupuesto/contraparte razonable, posponer negociación pública. Supply emitido, tokens disponibles, tokens efectivamente distribuidos y liquidez son métricas distintas.

| Categoría aprobada | Total ROBUSTO | Primera etapa máxima propuesta | Restante fuera de primera etapa |
|---|---:|---:|---:|
| Mercado/ecosistema/lanzamiento | 500.000.000 | 3.000.000 | 497.000.000 |
| Comunidad/marketing | 150.000.000 | 2.000.000 | 148.000.000 |
| Reserva | 300.000.000 | 0 | 300.000.000 |
| Equipo/fundador | 50.000.000 | 0 | 50.000.000 |
| Total | 1.000.000.000 | **5.000.000** | **995.000.000** |

Techo 5M = 5.000.000.000.000 base units; mercado 3M = 3.000.000.000.000; comunidad 2M = 2.000.000.000.000. No sumar esos tramos otra vez al supply ni confundir 500M con circulación. Los 3M son presupuesto máximo de tokens para evaluar liquidez/mercado, no depósito comprometido ni liquidez real. Mantenerlos segregados hasta decisión del mecanismo. Capital de contraparte, profundidad, comisiones, slippage y control de pool deben cotizarse; ninguna cantidad de tokens garantiza un mercado líquido. No elegir precio o DEX aquí.

497M de mercado quedan como presupuesto de etapas futuras: por defecto no movilizarlos. Divulgar wallets y cantidades, exigir motivo, plan, revisión y aprobación de cada nueva etapa. No afirmar que están bloqueados por contrato si solo existe una política administrativa. Si se necesitan límites técnicamente ejecutables, definirlos y probarlos antes de producción; el planner actual distribuye buckets completos y no implementa automáticamente este techo inicial.

## Equipo/fundador: 50M

Propuesta preferida: sin acceso durante **365 días** desde una fecha base S todavía sin decidir; después adquisición lineal durante **730 días**, final S+1.095 días. Sin anticipo al terminar el primer año. Compatible con el programa actual usando start=cliff=S+365d y end=S+1.095d: la acumulación comienza después de la espera, no en S. En el instante exacto de inicio vested=0; al avanzar Clock empieza a acumular. Financiar íntegramente el vault y verificarlo antes del comienzo; decidir fecha UTC y beneficiario público.

Esto difiere del candidato histórico start=S/cliff=S+365/end=S+1.095: ese modelo libera aproximadamente un tercio (16.666.666,666666 tokens) al cliff. Ambas opciones son propuestas; no aplicar el cambio por defecto. Proponer releases periódicos para reducir operaciones, no automatizar ni fijar fees actuales. No prometer cancelación/recuperación anticipada: el programa actual no tiene instrucciones administrativas de clawback/cancelación.

## Reserva: 300M

Dos opciones pendientes, elegir conscientemente:

- **A, custodia con reglas públicas:** todos los 300M en wallet separada, sin disponibilidad inicial autorizada. Toda salida necesita justificación, presupuesto, destinatarios, importe, evidencia y autorización nueva; sin uso para pagos personales ni subvención de precio/promesas de rentabilidad. Publicar journal de desembolsos y balances. Menor coste técnico y flexibilidad ante contingencias, pero custodio puede incumplir: no es bloqueo on-chain.
- **B, vesting técnico:** espera de 180 días desde S y adquisición lineal durante 1.095 días posteriores (final S+1.275). start=cliff=S+180d, end=S+1.275d, total300M en vault con beneficiario propio. No acumulación previa a la espera ni cliff lump sum. Reduce acceso inmediato, pero resta flexibilidad, genera rent/fees y puede no servir como reserva de emergencia. Una vez liberados, los tokens vuelven a estar disponibles al beneficiario; las reglas de gasto siguen necesarias.

Por presupuesto bajo y falta de decisión de contingencias, propongo comenzar por **A con controles y divulgación**, siempre admitiendo que no constituye un bloqueo técnico. Si el propietario prioriza una restricción verificable sobre flexibilidad, escoger B antes de producción; no decir que puede convertirse retroactivamente sin nuevas operaciones. No crear dos vestings para el mismo beneficiary/mint: el PDA actual depende de ese par y solo admite uno; utilizar beneficiarios distintos o revisar diseño si se quieren tramos separados.

Mientras se conserve program upgrade authority, el programa podría actualizarse: el vesting técnico depende también de esa custodia. Ninguna opción impide emisión adicional si mint authority permanece; explicar esas limitaciones públicamente.

## Comunidad/marketing: 150M

Propuesta: primera etapa de hasta2M para actividades definidas, entregas trazables y destinatarios revisados; no airdrop completo de150M ni promesas de remuneración por comprar/mantener tokens. Resto148M en tesorería separada. Desembolsos posteriores por campañas/hitos, no desbloqueo automático; techo orientativo de hasta5M por trimestre, con aprobación de cada presupuesto, no derecho de gastar ni objetivo obligatorio. Revisar antes de cada trimestre, conservar lo no usado y evitar reparto indiscriminado o duplicado.

Pagos de servicios necesitan condiciones/destinatarios reales y revisión de conflictos de interés. No inventar beneficiarios ni contratos publicitarios. Cada distribución crea potencial oferta vendible: sumar esos importes al reporte de circulación disponible. Si se propone vesting para colaboradores, usar acuerdos y beneficiarios separados y comprobar costes antes de aprobarlos. No aplicar el vesting del fundador a todos los miembros por defecto.

## Wallets y custodia

Cuatro beneficiarios/wallets separados para mercado, comunidad, reserva y equipo; payer operativo separado y de saldo limitado. No reutilizar wallets de rehearsal/PAPA ni direcciones de autoridades. Si reserva adopta vesting, su wallet es beneficiaria de su vault, distinta de la del equipo. Mint authority, metadata update authority y program upgrade authority deben ser tres claves/roles separados, con recuperación privada y custodia fuera del repositorio/chat.

Recomiendo mínimo hardware/offline para autoridades y tesorerías, con revisión humana de operaciones; revisar coste de custodia. Multisig2-de-3 solo aporta independencia si hay custodios realmente independientes; elegirlo exige adaptar y probar los builders actuales, que requieren beneficiarios individuales on-curve. No generar claves/seeds ni afirmar compatibilidad multisig ya implementada. Controles administrativos no equivalen a firmas múltiples obligatorias.

## Mint authority después del supply inicial

| Alternativa pendiente | Ventajas | Riesgos/limitaciones |
|---|---|---|
| Conservar bajo custodia protegida | Flexibilidad ante necesidad legítima de emisión aprobada | Permite supply adicional, dilución o emisión por compromiso/abuso; 1.000M no es límite inmutable, requiere divulgación y disciplina |
| Revocar definitivamente después de emitir/verificar | El mismo mint no puede emitir más; elimina riesgo de emisión adicional con esa autoridad | Irreversible; no puede restaurarse para correcciones/reposiciones, burns pueden reducir supply; no corrige errores de distribución/custodia |

Para un objetivo de oferta limitada, mi recomendación técnica a evaluar es **revocación posterior**, solo tras autorización explícita independiente, emisión completa verificada y reconciliación. No se incorpora a los pasos operativos ni se cambia mintAuthorityRevocationAuthorized=false. Si el propietario necesita conservarla, documentar razón, responsables, límites y condición futura de revisión; no anunciar fixed supply garantizado.

Revocar mint authority no requiere revocar metadata update authority: pueden conservarse metadata mutable y su autoridad. Tampoco reemplaza la política de upgrade authority ni permite recuperar tokens transferidos. Fuente oficial: [Set Authority](https://solana.com/docs/tokens/basics/set-authority), que documenta revocación permanente, y [Mint Account](https://solana.com/docs/tokens/basics/create-mint). Ninguna revocación autorizada o ejecutada.

## Decisiones a aprobar por separado

Techo inicial5M y split3M/2M o importes menores; mecanismo y capital antes de activar mercado; equipo espera365+lineal730 o candidato histórico; reserva A/B y sus reglas; comunidad por hitos y límites; custodia/direcciones y necesidad multisig; conservar/revocar mint authority como política futura sin autorizar aún transacción. Fechas S, wallets, cotizaciones y revisión externa permanecen pendientes. No se asume aprobación por silencio.
