# ROBUSTO — propuesta de 10.000 millones sin aportación personal

NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED / OFFLINE_FIXTURE_ONLY.
**PROPOSED_NOT_APPROVED.** Sin lanzamiento, gasto, emisión, claves o firmas autorizados.

## Distribución y compatibilidad

| Destino | Tokens propuestos | Porcentaje | Referencia histórica de fixtures |
| --- | ---: | ---: | --- |
| Liquidez y mercado | 4.000.000.000 | 40% | 500M mercado; no todo era circulación |
| Comunidad | 3.000.000.000 | 30% | 150M |
| Reserva estratégica | 1.500.000.000 | 15% | 300M; espera 180 días + 1.095 días lineales |
| Desarrollo y operaciones | 1.499.000.000 | 14,99% | Sin bucket equivalente independiente |
| Fundador | 1.000.000 | 0,01% | 50M equipo; espera 365 días + 730 días lineales |
| **Total** | **10.000.000.000** | **100%** | 1.000M históricos, no aprobación final vigente |

Las cantidades suman exactamente 10.000 millones; fundador es exactamente un millón,
no un porcentaje aproximado que se redondea. Se simulan seis decimales: supply=1e16
base units y fundador=1e12; ambos caben en u64. El cálculo vesting usa u128 para
producto y timestamps ensanchados. El contrato no fija supply ni porcentajes y admite
ese total en el tipo de importe. Esto no constituye una nueva prueba SBF de ese perfil.

Los builders/validadores de producción fijan SUPPLY=1e15, reparto histórico y cuatro
roles; no aceptan automáticamente diez mil millones ni el quinto bucket. No se cambia
su constante, IDL, contrato, ELF o configuración histórica. Si se aprueba la propuesta,
adaptar builders, validadores, reconciliación y pruebas del perfil completo antes de
preparar artefactos definitivos. No trasladar por omisión los techos 5M/3M/2M o los
bloqueos históricos de reserva/equipo a los nuevos buckets.

Una PDA vesting por beneficiario/mint permite un calendario para esa pareja. No hay
cambio de beneficiario/rescate general; release requiere permiso del beneficiario.
Si varios buckets comparten beneficiario y necesitan calendarios distintos, resolver
compatibilidad antes de configuración final. Bloqueo económico escrito no equivale
a tokens técnicamente bloqueados. Los demás buckets no tienen calendario nuevo definido.

## Fundador: 12 meses + 24 meses

Pendiente confirmar si son meses naturales o periodos fijos y fecha base UTC. La
simulación usa **365 días de espera y 730 lineales**, como aproximación explícita,
no equivalencia universal a meses naturales. Con base S: start=cliff=S+365 días,
end=start+730 días; no devengo durante espera. Si se escogen meses naturales,
calcular las fechas UTC exactas, incluida política para fines de mes/años bisiestos;
el contrato recibe timestamps y no interpreta meses. No cambiar contratos existentes.

| Día ficticio desde S | Devengado acumulado (tokens, seis decimales) |
| --- | ---: |
| 365 | 0 |
| 547 | 249.315,068493 |
| 730 | 500.000 |
| 912 | 749.315,068493 |
| 1.095 | 1.000.000 |

Fórmula: floor(1e12 × días transcurridos / 730) base units, limitada al total.
Liberable = devengado − released_amount, nunca una segunda contabilización del mismo
importe. Devengo no implica transferencia automática: aún requiere release autorizado
por el beneficiario. Tampoco equivale por sí solo a circulación de mercado.

## Circulación inicial y futura

No puede calcularse un valor definitivo: faltan importes efectivamente distribuidos,
tramos de mercado/comunidad/operaciones, custodias y bloqueos. La asignación 4.000M a
mercado no significa depósito inicial en pool. Escenarios de cálculo, **no propuestas
aprobadas**: cero tokens sin lanzamiento; 5M liberados/distribuidos serían 0,05% del
nuevo supply (cinco basis points). No se adopta el antiguo techo de circulación.

Si hipotéticamente los otros buckets permanecen fuera de circulación y el founder
libera todo lo devengado, una base de 5M más su devengo alcanzaría 5,5M al día 730 y
6M al día 1.095. Son escenarios condicionados, no un calendario completo del proyecto.
Falta definir vesting/campañas/remanentes de 9.999M tokens no asignados al fundador.
No contar un saldo de tesorería sin restricción técnica como bloqueado verificado.

## Sin dinero del fundador no significa lanzamiento gratuito

Aportación personal prevista: **cero**. Lanzamiento con aportación cero del fundador
es financieramente posible solo si una fuente externa cubre los gastos y capital
necesarios. No hay fuente comprometida ni presupuesto cotizado demostrado. Con cero
financiación total, no existe un camino acreditado para desplegar y crear un mercado
con liquidez. Crear tokens no genera SOL ni financia renta, fees o auditoría.

Costes pendientes: revisión independiente/retest, renta de programa/cuentas y posible
buffer, fees de operaciones, publicación/alojamiento metadata, recuperación/custodia
segura y observación operativa. Algunos recursos pueden ser donados o prestados por
un patrocinador; su coste existe aunque no lo pague el fundador. Liquidez requiere
activos en el par/rango elegido, expuestos a pérdidas y arbitraje; es capital, no una
comisión. Una posición unilateral no garantiza ventas iniciales, como muestra el
fixture A→B sin reserva B. No inventar precio ni capital mínimo monetario.

## Financiación externa a evaluar, sin ofertas ni promesas

| Mecanismo | Qué podría cubrir | Condiciones y riesgos |
| --- | --- | --- |
| Subvención o patrocinio | Auditoría, ingeniería, metadata, fees | Solicitud/contrato y condiciones verificables; no hay concedente ni aceptación identificados. Dependencia de plazos y posibles compromisos de publicidad/control. |
| Trabajo/revisión pro bono o aportes en especie | Parte de ingeniería, revisión, infraestructura | Competencia, alcance y responsabilidad comprobables. Una revisión informal no se etiqueta como auditoría independiente. |
| Donaciones sin contraprestación prometida | Gastos específicos, si realmente recibidas | Transparencia, origen y tratamiento fiscal/legal requieren revisión; no garantizar devolución, rendimientos o derechos inexistentes. No abrir colectas aquí. |
| Proveedor externo de liquidez | Capital del par | Definir propiedad NFT, comisiones, retirada, bloqueos y riesgo. Puede retirar su posición y reducir ventas. No regalar autoridad mint/upgrade como condición implícita. |
| Venta futura de tokens/participación | Financiación, solo tras diseño y revisión | Puede ser actividad regulada; riesgo de obligaciones a compradores y circularidad si se promete liquidez aún inexistente. No se recomienda ni prepara una preventa aquí; exige asesoría y autorización aparte. |

No se presume ningún inversor, subvención o comprador. No prometer rentabilidad,
precio mínimo, recompra, cotización o disponibilidad perpetua. No financiar gastos
ciertos contando como efectivo el valor teórico del supply o ventas futuras.

## Trabajo sin desembolso de red

Con herramientas ya disponibles: aritmética, análisis de código, configuración de
simulación, pruebas locales sin firmas, documentos y preparación unsigned. Es posible
sin pagos nuevos; tiempo/equipo no son recursos económicamente inexistentes. Cotizar
servicios o redactar solicitudes puede prepararse sin gasto, pero contactar terceros,
comprometer condiciones o pagar requiere autorización y no se hizo aquí. Sin hardware
nuevo por ahora; software gratuito no elimina malware/pérdida ni la necesidad de respaldo.

La compraventa ExactIn revisada sigue sin permiso del fundador ni servidor suyo; sus
pruebas anteriores no se repiten porque esta propuesta no cambia programas. Meteora
conserva pausa/fees por operadores y retiro por propietario de posición. Tres advisories
y siete warnings abiertos; atomicidad nativa no demostrada. Sin aprobación nueva no
se revoca mint authority: supply fijo propuesto requiere decidir y verificar el mecanismo
que elimine emisión adicional tras emisión exacta y reconciliación, bajo autorización
irreversible separada. Hasta eso no afirmar suministro fijo garantizado on-chain.

Reproducción exclusivamente aritmética:
`python3 scripts/simulate-robusto-tokenomics.py`.
[Configuración aislada](../config/robusto-tokenomics-10b-simulation.json).

El candidato SBF anterior sigue representando su perfil histórico. No incorpora ni
certifica esta tokenomics: no se recompiló ni reempaquetó para presentar una aprobación
inexistente. Cuatro pruebas Python verifican conservación, límites de asignación,
precisión entera, rechazo de autorización y distinción de meses naturales.
