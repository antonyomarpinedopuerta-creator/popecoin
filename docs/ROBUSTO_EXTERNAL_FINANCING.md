# ROBUSTO — financiación sin aportación personal del fundador

NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED / OFFLINE_FIXTURE_ONLY.
El fundador aportará cero dinero propio. No hay capital, subvención, patrocinador ni
proveedor comprometido. No se solicita dinero, contrata, contacta ni promete retorno.
Las cinco vías siguientes son posibilidades, no ofertas actuales verificadas.
No se consultaron convocatorias ni precios online por el alcance offline de la sesión.

La decisión económica vigente confirma 10.000.000.000 ROBUSTO distribuidos en
4.000.000.000 mercado, 3.000.000.000 comunidad, 1.500.000.000 reserva,
1.499.000.000 desarrollo/operaciones y 1.000.000 fundador. No modifica este plan de
financiación: tokens asignados no son moneda para costes ni liquidez USDC. Ver
[especificación económica](ROBUSTO_CONFIRMED_TOKENOMICS.md) y
[matriz de decisiones](ROBUSTO_LAUNCH_DECISION_MATRIX.md).

## Qué debe financiarse

| Bolsa | Necesidad / cómo obtener importe | Quién podría cubrirla |
| --- | --- | --- |
| A. Publicación y red | Metadata/URI, fees y rent de programa/cuentas/pool. Rent puede ser recuperable solo en cuentas cerrables; necesita financiación inicial. Sin cotización actual | Sponsor o grant con partidas explícitas, pagador tercero bajo control y límites acordados |
| B. Auditoría | Alcance contrato, builders, vesting, integración, dependencias y retest. Solicitar oferta y entregables independientes antes de aprobar gasto | Grant/sponsor; auditor pro bono con misma independencia/alcance, si realmente se compromete |
| C. Capital de liquidez | ROBUSTO y USDC según rango/precio/reservas aprobados. No es comisión ni capital recuperable garantizado | LP externo mediante términos transparentes; propietario debe definir derechos del NFT y retiros |
| D. Operación | Monitorización, RPC/interfaz, custodia, recuperación, respuesta y fees futuros | Servicios en especie, presupuesto de sponsor/grant o comunidad bajo autorización futura |
| E. Trabajo aportado | Ingeniería/documentación/tests locales y servicios pueden evitar desembolso del proyecto si terceros aceptan | Colaboradores; valorar tiempo y responsabilidad aunque no haya factura |

Ningún importe es verificable hoy. Asignar cuatro mil millones de tokens a mercado no
crea reservas USDC ni paga fees/rent/auditoría. El millón del fundador no es dinero
obtenido; venderlo no se presupone ni se autoriza. Compradores futuros no se cuentan
como financiación disponible. Ver [presupuesto](ROBUSTO_MINIMUM_LAUNCH_BUDGET.md).

## Modelo editable, sin cotizaciones ni compromiso financiero

Completar únicamente con ofertas fechadas recibidas en una fase futura. `null` significa
“no cotizado/no comprometido”, no cero. Separar moneda, impuestos, fecha de validez,
alcance, hitos y responsable del pago; no agregar monedas distintas sin un tipo de
cambio fechado. Capital de liquidez se expresa por separado de gastos y no se suma como
comisión.

| Partida | Tipo | Importe | Moneda | Fuente prevista | Estado actual |
| --- | --- | ---: | --- | --- | --- |
| Auditoría independiente | Único por alcance | null | pendiente | Cotización de auditor independiente | No cotizado |
| Retest/correcciones externas | Por ronda | null | pendiente | Auditor/proveedor | No cotizado |
| Desarrollo fuera de capacidad voluntaria | Único/por hito | null | pendiente | Sponsor/grant/servicios | No cotizado |
| Rent de programa, mint, cuentas y pool | Capital inicial; parte puede recuperarse al cerrar cuentas según reglas | null | SOL | Lectura autorizada futura y plan final | No cotizado |
| Fees de operaciones/prioridad | Variable/recurrente | null | SOL | Simulación/cotización del mensaje final | No cotizado |
| Metadata/URI y almacenamiento | Único o recurrente según proveedor | null | pendiente | Proveedor elegido | No cotizado |
| Dominio, alojamiento/RPC/monitorización | Recurrente u opcional según arquitectura | null | pendiente | Proveedor elegido | No cotizado |
| Liquidez ROBUSTO/USDC | Capital de activos expuesto a mercado; no fee | null | ROBUSTO + USDC | LP externo con términos escritos | No comprometido |
| Operación, respuesta y contingencia | Reserva recurrente | null | pendiente | Sponsor/grant/servicios | Sin criterio ni cifra aprobados |

**Total de gastos:** pendiente de cotizaciones compatibles. **Capital LP requerido:**
pendiente de precio, rango, profundidad tolerada y aportes de terceros. **Aporte del
fundador:** S/0. No se ha fijado un objetivo de captación ni autorizado solicitación.

### Escenarios de financiación (no pronóstico)

| Caso | Cobertura hipotética | Consecuencia verificable |
| --- | --- | --- |
| Sin financiación externa | Ninguna | No ejecutar auditoría contratada, costes de red/publicación ni pool; mantener todo offline y aplazar. No se puede prometer compra/venta. |
| Servicios en especie/pro bono | Solo entregables que un tercero acepte por escrito | Puede reducir gasto pagado; no elimina independencia requerida ni cubre automáticamente rent/fees/USDC. |
| Grant/sponsor | Partidas expresamente aprobadas por quien financia | Solo contabilizar tras aceptación formal, presupuesto, hitos y condiciones; no presumir que financia token liquidity o permite control. |
| LP externo | Capital de par aportado bajo acuerdo | Permite considerar profundidad según diseño, pero el LP puede controlar/retirar su posición; no paga auditoría/despliegue a menos que el acuerdo lo destine también a ello. |
| Financiación suficiente por etapas | Auditoría/retest, luego red/operación, luego capital de mercado separado | Reduce capital ocioso frente a financiarlo todo de una vez; depende de cotizaciones, disponibilidad y nueva autorización en cada paso. |

Si no se logra financiar cada partida esencial, la decisión segura es diferir el
lanzamiento. No compensar el déficit omitiendo auditoría, poniendo el capital del
fundador en riesgo, vendiendo tokens con promesa de rendimiento/liquidez, usando
reservas de una categoría como si fueran USDC ni cediendo autoridades sin análisis.

## Opciones y viabilidad cualitativa

La evidencia disponible acredita código y pruebas internas; no acredita elegibilidad,
contrapartes o demanda. Por ello no hay probabilidad porcentual ni expectativa de
éxito defendible; «condicionada» significa que falta comprobar requisitos esenciales.

| Vía | Requisitos y próximos datos | Riesgos, costes y cesión de control | Viabilidad con evidencia actual |
| --- | --- | --- | --- |
| Subvenciones/programas de ecosistema | Convocatoria vigente, elegibilidad, utilidad demostrable, hitos, presupuesto, licencias y evaluación. Verificar términos oficiales en una fase de investigación autorizada | Tiempo de solicitud/reporting, posibles exclusiones para tokens/liquidez, dependencia de hitos. No asumir que grant paga LP ni auditoría | Indeterminada; no convocatoria comprobada ni solicitud aprobada |
| Patrocinio externo | Contraparte identificada, diligencia, alcance/presupuesto y acuerdo escrito | Marketing/intereses en conflicto, condiciones de exclusividad, control indirecto o exigencia de tokens. No entregar autoridad por defecto | Condicionada a encontrar contraparte; ninguna identificada |
| Colaboradores en especie | Entregables, disponibilidad, propiedad intelectual, revisión y mantenimiento explícitos | Dependencia de voluntarios, abandono, revisión insuficiente. Trabajo pro bono no equivale a auditoría independiente automáticamente | Técnicamente posible para trabajo local; disponibilidad futura no demostrada |
| LP externo | USDC real, precio/rango decidido, titularidad/control de posición y plan de retiros, riesgos de mercado/divulgación | LP puede retirar profundidad propia; pérdida por arbitraje/precio, concentración de control, términos/costes no cotizados. No prometer principal o rendimiento | Bloqueada hoy por ausencia de capital y términos; el fixture prueba mecánica, no financiación |
| Comunidad transparente | Finalidad/presupuesto, responsable de custodia, divulgación de riesgos, uso/reembolso/hitos, evaluación normativa y autorización antes de captar | Fondos insuficientes, reclamaciones, conflictos, custodia y obligaciones legales. No usar anticipos como permiso para lanzar | Indeterminada; requiere revisión externa y decisión previa; no se abre captación |

Recomendación: preparar alcance y presupuesto cotizable; buscar en una fase futura
servicios en especie y grants/sponsors sin cesión de autoridades innecesaria. Financiar
por separado auditoría, red/operación y USDC; no depender de que ventas futuras paguen
las condiciones previas del lanzamiento. No se recomienda un programa específico sin
verificar su vigencia, elegibilidad y términos.

El propietario debe comparar coste total, obligaciones, derechos sobre tokens/NFT,
conflictos de interés, capacidad de retirada, custodia y financiación por hitos. Si no
hay financiación suficiente, aplazar. No reducir controles críticos para cuadrar cero.

## Trabajo sin desembolso de red y autorizaciones futuras

Lectura/revisión interna, fixtures, cálculos bigint, pruebas offline, correcciones,
expediente público y solicitudes redactadas pueden completarse con herramientas ya
instaladas sin pagar red. Tiempo/equipo no tienen coste económico cero. Ninguna de
estas tareas acredita auditoría independiente, publicación permanente o LP disponible.

Antes de contactar a terceros, solicitar/recibir fondos, contratar, crear/importar
claves, firmar, publicar metadata o usar red se necesita autorización expresa limitada
al paso. Esta sesión solo prepara documentos/paquete local; el push a GitHub autorizado
no es difusión del expediente a un auditor ni captación de dinero.

Camino: (1) decidir alcance/custodia y economía propuesta; (2) cotizar auditoría y
operación/publicación; (3) verificar convocatorias/contrapartes y acuerdos, sin gasto
hasta autorización; (4) comprometer financiación de partidas A–D y capital LP por
separado; (5) revisar/ensayar seguridad y autoridades definitivas; (6) preparar RC y
solicitar autorizaciones por etapas. No existe lanzamiento público seguro a coste
cero demostrado.
