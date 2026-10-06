# ROBUSTO — decisión pendiente de supply y distribución

**PROPOSED_NOT_APPROVED / NOT_AUTHORIZED_FOR_MAINNET.** Ninguna distribución seleccionada. Candidato: 1.000.000.000 ROBUSTO, 6 decimales, freeze authority ninguna; 1 token = 1.000.000 base units, total 1.000.000.000.000.000. No emisión real ni transferencias. Retener mint authority permite técnicamente emisión futura: el candidato no es un límite inmutable impuesto por el mint.

| Categoría | A: 70/15/10/5 | Tokens A | Base units A | B: 50/15/30/5 | Tokens B | Base units B |
|---|---:|---:|---:|---:|---:|---:|
| Mercado/ecosistema/lanzamiento | 70% | 700.000.000 | 700.000.000.000.000 | 50% | 500.000.000 | 500.000.000.000.000 |
| Comunidad/marketing | 15% | 150.000.000 | 150.000.000.000.000 | 15% | 150.000.000 | 150.000.000.000.000 |
| Reserva | 10% | 100.000.000 | 100.000.000.000.000 | 30% | 300.000.000 | 300.000.000.000.000 |
| Equipo/fundador | 5% | 50.000.000 | 50.000.000.000.000 | 5% | 50.000.000 | 50.000.000.000.000 |
| Total | **100%** | **1.000.000.000** | **1.000.000.000.000.000** | **100%** | **1.000.000.000** | **1.000.000.000.000.000** |

La única diferencia es mover 200.000.000 tokens de mercado/ecosistema a reserva. Comunidad y equipo no cambian. Validación exacta: `npm run robusto:production -- distribution`; ambas propuestas ya existen en config/robusto-distribution-proposal.json. allocations operativas siguen null.

## Mercado inicial y circulación

Asignación no equivale a circulación, liquidez, tokens vendidos ni depósito en pool. La categoría mercado incluye presupuesto de ecosistema y lanzamientos posteriores. Dentro de esa categoría podría movilizarse entre cero y 700.000.000 tokens en A, o cero y 500.000.000 en B, según una decisión independiente; esos máximos no son recomendación de lanzamiento. Cero es compatible con la preparación actual, donde no hay token real ni mecanismo de mercado.

Ejemplo aritmético no aprobado: un tramo inicial de 10.000.000 tokens (1% del supply, 10.000.000.000.000 base units) cabe en ambas. Quedarían 690.000.000 de la categoría mercado en A o 490.000.000 en B. No exige usar todo el bucket y no define precio, profundidad o SOL necesarios. Su idoneidad necesita evaluar el mecanismo real y presupuesto; no se recomienda ese número como decisión económica.

Si además se distribuyeran todos los 150.000.000 de comunidad, las cantidades potencialmente movilizadas desde mercado+comunidad serían hasta 850.000.000 (85%) en A y 650.000.000 (65%) en B. Beneficiarios podrían vender; contar por separado pool, wallets disponibles, vesting y reserva. Si se liberan reservas/equipo también pueden entrar al mercado. No existe calendario aprobado de esos flujos ni garantía de techo circulante. El vesting propuesto del equipo limita acceso solo después de ser decidido, creado y financiado correctamente.

## A: 70/15/10/5

Ventajas propuestas: mayor presupuesto explícito de mercado/ecosistema, menor reserva discrecional y posibilidad de asignación más amplia. Puede adaptarse a etapas sin movilizar los 700.000.000 de golpe; no obliga a aportar más capital que B si el mismo tramo inicial se usa.

Riesgos: interpretar 70% como circulación inmediata produciría oferta disponible grande frente a pocos compradores; una asignación amplia no crea demanda ni profundidad. Reserva menor significa menos margen etiquetado para contingencias, aunque mercado/ecosistema siga parcialmente sin usar. Si el fundador custodia también el 70%, la etiqueta no implica descentralización ni distribución pública efectiva.

## B: 50/15/30/5

Ventajas propuestas: hace más explícita una estrategia con desembolsos posteriores y contingencias. Separa 300.000.000 como reserva, mientras mantiene 150.000.000 para comunidad y 50.000.000 para equipo. Puede resultar útil si el proyecto quiere avanzar con un tramo inicial pequeño y decisiones por etapas.

Riesgos: reserva tres veces mayor y 200.000.000 tokens adicionales bajo control potencial de tesorería. Si reserva+equipo comparten control, suman 35% frente a 15% en A; si además comunidad comparte control, suman 50% frente a 30%. Esto describe buckets, no independencia de custodios ni concentración real de holders. Al principio, si todos los wallets pertenecen a una sola persona, el control puede ser 100% en ambas. Sin reglas y divulgación, B puede generar más incertidumbre sobre oferta futura y decisiones discrecionales.

## Recomendación condicionada y siguiente decisión

Por el deseo de gastar lo mínimo, recomiendo priorizar **un lanzamiento por etapas con un tramo inicial pequeño**, no escoger porcentajes por creer que producen liquidez. Ambas opciones permiten esa estrategia. Para ROBUSTO propongo **B, 50/15/30/5**, solo si el propietario acepta definir y divulgar custodia, reglas de uso y liberación de la reserva y revisar cualquier desembolso por separado. Su razón es la separación explícita de contingencias; no reduce por sí sola costes de rent, fees o capital del mercado, ni garantiza una mejor distribución.

Si no se pueden establecer esas reglas, prefiero A con lanzamiento escalonado: B aumentaría reserva discrecional sin aportar una protección técnica. Esta recomendación es criterio de preparación sujeto a aprobación, no una predicción económica. No se aplicará ninguna opción automáticamente.

El propietario debe decidir: supply/decimales/freeze candidato; A, B o modificación que sume exactamente 100%; alcance y custodia de cada bucket; si reserva debe tener restricciones; tramo inicial y calendario de circulación, después de mecanismo/presupuesto verificados; vesting del equipo (incluido comportamiento de acumulación desde start) y wallets públicas separadas. No basta con aprobar A/B para resolver automáticamente esas condiciones. No revocar autoridades ni generar claves en esta decisión.

Referencia técnica: [Mint Account de Solana](https://solana.com/docs/tokens/basics/create-mint) explica supply, decimales y mint authority. La comparación de concentración y la recomendación son análisis de estas propuestas, no datos de mercado ni predicciones.
