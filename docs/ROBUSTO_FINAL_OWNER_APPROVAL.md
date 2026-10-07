# ROBUSTO — decisiones que aún requieren aprobación del propietario

Las decisiones siguientes quedan registradas como **APPROVED_FOR_PREPARATION_ONLY**: no autorizan Mainnet, fondos, firmas, transacciones, creación de wallets, publicación ni ejecución. Supply/decimals/freeze/distribución y los términos de vesting aprobados anteriormente se conservan.

## Decisiones ya cerradas para preparación

- Plataforma elegida: **Meteora DAMM v2**, unilateral.
- Par ROBUSTO/SOL; token order y modo OnlyB según integración revisada.
- Inventario objetivo de preparación: **1.000.000 ROBUSTO**. Es un objetivo, no una orden de depósito; el importe efectivo queda sujeto a decisión de ejecución y a los límites previamente aprobados.
- Fee fija **25 bps**; dynamic fee **NO**; rango objetivo **3×**.
- No permanent lock de NFT/liquidez. La política de retiradas o cambios concretos sigue pendiente; no se habilita lock.
- Metadata mutable; conservar metadata update authority. Mint authority se conserva y no se revoca ahora.
- Arweave aprobado como hosting preferido/opción para metadata. Preferencia no autoriza pago, subida ni publicación on-chain.
- El propietario acepta continuar la preparación con conocimiento de **3 advisories y 7 warnings** de Meteora, expresamente no resueltos. Alcance y límites están en `docs/ROBUSTO_METEORA_DEPENDENCY_REVIEW.md` y `docs/ROBUSTO_METEORA_FINAL_REHEARSAL.md`.
- Vesting team/founder: 365 días sin acceso + 730 días lineales. Vesting reserve: 180 días sin acceso + 1.095 días lineales. Para cada uno `start=cliff=fecha base + espera`; `end=start + período lineal`. Fechas y beneficiarios siguen pendientes.

Los P0/Pmax USD y la conversión USD/SOL usados en rehearsal fueron **TEST_ONLY**. No son precio aprobado ni forman parte de la configuración económica definitiva. El precio SOL final debe derivarse de una cotización vigente y aprobarse expresamente antes de cualquier operación Mainnet.

## 1. Precio final y cantidades efectivas

- Precio P0 y Pmax finales expresados en SOL, tras cotización fechada y documentada: __________________________
- Fuente/mercado/método y hora UTC de SOL/USD para conversión: _____________________________________________
- Inventario efectivo realmente depositado (≤1.000.000 objetivo; en todo caso ≤3.000.000 techo aprobado): ______ ROBUSTO
- Community efectivo inicial (≤2.000.000 techo aprobado): __________________ ROBUSTO
- [ ] Aprobar estos valores para preparar mensajes unsigned en una etapa posterior.
- [ ] Dejar precio/cantidades sin fijar.

El objetivo 3× y fee fija 25 bps ya están aprobados para preparación; el rango/ticks concretos se derivarán de precio cotizado y redondeo real del protocolo, y requerirán revisión antes de Mainnet.

## 2. Custodia y wallets de las ocho funciones

- [ ] Aprobar diseño de ocho identidades separadas: market/NFT custody, community, reserve, team, payer, mint authority, metadata update authority y program upgrade authority.
- [ ] Rechazar el diseño y especificar cambios antes de crear claves.

Asignación nominal de responsable/custodio, todavía sin crear wallets:

| Función | Responsable/custodio propuesto | Procedimiento de recuperación |
|---|---|---|
| market + custodia NFT | __________ | __________ |
| community | __________ | __________ |
| reserve | __________ | __________ |
| team/beneficiary | __________ | __________ |
| payer operativo limitado | __________ | __________ |
| mint authority | __________ | __________ |
| metadata update authority | __________ | __________ |
| program upgrade authority | __________ | __________ |

Aprobar además generación aislada, copias offline cifradas en ubicaciones separadas, recuperación probada, verificación doble de pubkeys y exclusión permanente de secretos de chat/Git/backup público. Los builders actuales usan firmantes individuales; multisig/PDA requiere adaptación y prueba antes de seleccionarlo.

- [ ] Aprobar este procedimiento para una futura etapa de creación, sujeta a autorización separada antes de generar cualquier identidad.
- [ ] Solicitar procedimiento alternativo; no crear identidades.

## 3. Fecha y beneficiarios de vesting

Los períodos y la fórmula `start=cliff` ya están aprobados. Completar solo cuando se conozca la fecha real de lanzamiento y se decidan custodios/beneficiarios.

- Fecha base UTC: ____________________________________________
- Beneficiario team/founder: _________________________________
- Beneficiario/custodia reserve: _____________________________
- [ ] Confirmo que la fecha base corresponde al lanzamiento real elegido.
- [ ] Mantener fecha y beneficiarios pendientes.

Cantidades asociadas a schedules, sin cuenta ni depósito creados: team 50M (50.000.000.000.000 base units); reserve 300M (300.000.000.000.000 base units).

## 4. Metadata: publicar/pagar sigue pendiente

Contenido ya aprobado: nombre/símbolo ROBUSTO; descripción en `metadata/robusto/metadata.template.json`; PNG oficial `metadata/robusto/robusto-logo.png`, SHA-256 `32c93f1971eb4a03f5c9b0fc6a5e87b1dc20f3028b5b73d01eeabd29cf5355ce`; web omitida; metadata mutable/update authority conservada. JSON preparado admite name, symbol, description, image, `properties.files` y `properties.category`. Arweave es la opción preferida aprobada.

- [ ] Aprobar una futura subida a Arweave hasta un máximo de __________ (moneda: ________) después de cotización y revisión de hashes.
- [ ] Aplazar cualquier pago/subida.

La URI final, lectura desde gateway independiente, hash y publicación on-chain requieren pasos/aprobaciones separados. Esta decisión no autoriza metadata on-chain.

## 5. Presupuesto y límite

- Tope de gasto técnico aprobado para cotizar/planear, no para gastar: __________ (moneda: ________)
- Reserva de payer a considerar tras cotización: _________________________
- [ ] Autorizar solo lecturas y cotizaciones públicas read-only.
- [ ] Dejar cotizaciones pendientes.

No se inventan importes: todo valor sensible al estado/red/proveedor es `REQUIRES_LIVE_QUOTE`. Categorías están en `docs/ROBUSTO_MAINNET_EXECUTION_PLAN.md`.

## 6. Aprobaciones de ejecución futuras

- [ ] Confirmo que esta hoja **no autoriza** transacción, firma, gasto, mint, transferencia, vesting, deploy, creación de pool, lock, revocación ni publicación. Cada futura operación necesita plan/hash/montos/red/payer/cotización y aprobación expresa por operación.

## Estado de preparación

Clasificación al cerrar esta preparación: **READY_FOR_OWNER_MAINNET_DECISIONS / NOT_READY_FOR_MAINNET**. Completar esta hoja no levanta `MAINNET_DISABLED`; el plan conserva gates de revisión independiente, live quote y autorizaciones por operación.
