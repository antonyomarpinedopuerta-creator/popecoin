# ROBUSTO — especificación económica confirmada y parámetros aún pendientes

Estado operativo: `NOT_AUTHORIZED_FOR_MAINNET` / `MAINNET_DISABLED` /
`OFFLINE_FIXTURE_ONLY`. Esta especificación registra la decisión económica del
propietario; no autoriza emitir, distribuir, desplegar, financiar, publicar, crear un
pool ni lanzar ROBUSTO.

## Estado de cada decisión

| Campo | Decisión registrada | Alcance |
| --- | --- | --- |
| Nombre público | ROBUSTO | Identidad pública confirmada; no implica publicación. |
| Símbolo | ROBUSTO | Propuesto; queda sujeto a validación técnica del mint/metadata. |
| Suministro económico objetivo | 10.000.000.000 ROBUSTO | Cantidad confirmada para la especificación económica. Su representación en producción sigue pendiente. |
| Distribución por categorías | Valores exactos de abajo | Confirmada como decisión económica, no como transferencia, custodia o calendario. |
| Decimales | 9 | Propuesta técnica; no aprobada como configuración de mint. |
| Suministro fijo / cierre de emisión | No aprobado | Requiere decisión y ceremonia separada; el fixture no cierra autoridad real. |
| Vesting del fundador | 365 días de bloqueo + 730 días lineales | Escenario técnico propuesto; no calendario aprobado. |
| Precio, circulación inicial y cantidades a depositar | Pendientes | No hay precio, pool ni capital confirmados. |
| Financiación personal del fundador | S/0 | No se compromete dinero personal. No significa que exista financiación externa. |

La distribución confirmada no aprueba decimales, calendario de circulación, beneficiarios,
autoridades, wallets, custodios, financiación, precio, despliegue o lanzamiento. Los
perfiles históricos de 1.000 millones/seis decimales y sus artefactos permanecen intactos.
La configuración `robusto-tokenomics-10b9-alternative.json` sigue siendo un fixture
`PROPOSED_NOT_APPROVED`; este documento no convierte ese builder en configuración de
producción ni valida por sí solo sus operaciones SBF.

## Distribución confirmada

| Categoría | Tokens | Porcentaje exacto | Unidades base si se aprueban 9 decimales |
| --- | ---: | ---: | ---: |
| Liquidez y mercado | 4.000.000.000 | 40 % | 4.000.000.000.000.000.000 |
| Comunidad | 3.000.000.000 | 30 % | 3.000.000.000.000.000.000 |
| Reserva estratégica | 1.500.000.000 | 15 % | 1.500.000.000.000.000.000 |
| Desarrollo y operaciones | 1.499.000.000 | 14,99 % | 1.499.000.000.000.000.000 |
| Fundador | 1.000.000 | 0,01 % | 1.000.000.000.000.000 |
| **Total** | **10.000.000.000** | **100 %** | **10.000.000.000.000.000.000** |

Comprobación exacta en aritmética entera:

```text
4.000.000.000 + 3.000.000.000 + 1.500.000.000 + 1.499.000.000 + 1.000.000
= 10.000.000.000 ROBUSTO
10.000.000.000 × 10^9 = 10^19 = 10.000.000.000.000.000.000 unidades base
u64::MAX = 18.446.744.073.709.551.615
u64::MAX - 10^19 = 8.446.744.073.709.551.615 unidades base
```

El suministro en unidades base cabe en u64; también cabe cada bucket. Supera
`i64::MAX` y `Number.MAX_SAFE_INTEGER`, por lo que todo cálculo entero debe usar
`bigint`/u64 (y tipo más ancho para productos intermedios), nunca `Number` de
JavaScript ni `float`. Con nueve decimales, la conversión decimal exacta admite como
máximo nueve cifras fraccionarias. Estas son propiedades matemáticas, no una prueba de
que todos los builders, cuentas o programas externos admitan la configuración final.

Los porcentajes son exactos: 4.000, 3.000, 1.500, 1.499 y 1 punto básico
respectivamente; equivalen a 40 %, 30 %, 15 %, 14,99 % y 0,01 %. No se redondea la
asignación del fundador.

## Fundador, custodia y vesting

La asignación económica es exactamente 1.000.000 ROBUSTO. No identifica una wallet,
beneficiario legal, custodio o cuenta vesting, y no pone tokens bajo custodia. La
propuesta de 365/730 días se interpreta aquí como días fijos, no meses naturales:

```text
S = instante UTC inicial aún pendiente
inicio = cliff = S + 365 días
fin = inicio + 730 días
devengado(t) = 0 antes de inicio; luego floor(1.000.000 × min(t-inicio, 730 días) / 730 días)
```

Bajo ese escenario exclusivamente matemático: devengado en día 365 = 0; día 730 =
500.000; día 1.095 = 1.000.000 ROBUSTO. El cálculo usa unidades enteras y el remanente
de redondeo se libera al llegar al final. El devengo no transfiere tokens automáticamente:
el contrato existente requiere la autorización del beneficiario para reclamar. Perder
esa autorización puede inmovilizar el saldo; no se añade recuperación administrativa que
permita retirar bienes ajenos.

Antes de configurar se deben decidir beneficiario, inicio UTC, días frente a meses
naturales, custodio/origen de fondos, verificación de la cuenta, tratamiento de pérdida
de acceso y compatibilidad de la PDA con otros vestings. La asignación no equivale a
tokens emitidos, bloqueados, circulantes ni disponibles para el fundador.

## Circulación y liquidez: no equivalencias

Hoy no existe emisión/pool de producción autorizada; por tanto no hay circulación real
de ROBUSTO ni swaps disponibles. La circulación futura depende de emisión, transferencias,
locks y liberaciones que todavía no están configurados. **Los 4.000.000.000 ROBUSTO de
“liquidez y mercado” no se depositan automáticamente en Meteora.** Es un límite de
asignación económica, no un depósito, precio, TVL, inventario inicial ni compromiso de LP.

Modelo ilustrativo de producto constante idealizado, sin fees, rangos, ticks, redondeo
del programa ni otros detalles de DAMM v2. Importes elegidos solo para enseñar la
relación entre reservas; no son precio recomendado, cotización, presupuesto ni promesa
de disponibilidad:

| Escenario ficticio | ROBUSTO en pool `x` | USDC de terceros `y` | Precio medio inicial `y/x` | Swap de prueba | Salida idealizada / impacto vs. spot |
| --- | ---: | ---: | ---: | ---: | ---: |
| A | 100.000.000 | 10.000 | 0,0001 USDC/ROBUSTO | entra 1.000.000 ROBUSTO | ≈99,0099 USDC; ≈0,9901 % |
| B | 400.000.000 | 40.000 | 0,0001 USDC/ROBUSTO | entra 1.000.000 ROBUSTO | ≈99,7506 USDC; ≈0,2494 % |

Fórmula sin fees para salida de USDC: `dy = y × dx / (x + dx)`. El ejemplo supone
precios constantes en la reserva y omite comisiones, ticks, volatilidad, arbitraje,
MEV, límites de interfaz y riesgo de contrato; los resultados reales pueden diferir.
En A solo 100M de los 4B asignados se depositan (2,5 % de esa categoría); en B, 400M
(10 %). Los 10.000/40.000 USDC tendrían que aportarlos terceros y hoy no están
comprometidos. El dueño/controlador de la posición de liquidez puede tener capacidad
de retirar su propia posición conforme a las reglas del pool; no se presupone que los
tokens o USDC aportados sean irrecuperables. Operadores externos de Meteora pueden
conservar controles sobre estado o fees según el programa/configuración. Los diez
hallazgos Meteora siguen abiertos y requieren su revisión registrada.

Plantilla para decisión futura, sin valores aprobados:

```text
ROBUSTO a depositar = [decidir, <= asignación mercado no comprometida]
USDC aportado por terceros = [no comprometido; cotizar/confirmar]
precio implícito = USDC depositado / ROBUSTO depositado
circulación inicial = [decidir; calcular desde saldos realmente líquidos y locks]
profundidad, rango, fees, slippage máximo y titular de posición = [decidir y revisar]
```

Asignar tokens no financia auditoría, renta, fees o gastos. Sin USDC/capital externo no
se puede asumir que el pool sea bilateral o que usuarios puedan comprar/vender.

## Perfiles y artefactos

El perfil histórico de 1.000M/seis decimales permanece separado y no se reescribe. La
alternativa 10B/nueve decimales se mantiene en archivos aislados de simulación; no se
modifican contrato, mint, IDL, seeds PDA, autoridades ni configuración de producción por
esta especificación. Para adoptar 9 decimales o preparar un candidato definitivo habrá
que validar todos los consumidores, las restricciones u64 y la compatibilidad de
integración/metadata; cualquier nuevo artefacto debe enlazarse por hash a las fuentes
revisadas. La atomicidad nativa sigue `NATIVE_ATOMICITY_NOT_VERIFIED`; tres advisories y
siete warnings de Meteora continúan abiertos. Las pruebas internas no son auditoría.
