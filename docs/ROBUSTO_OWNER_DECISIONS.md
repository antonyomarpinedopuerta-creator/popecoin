# ROBUSTO — decisiones del propietario

2026-10-11. **NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED.** Este documento
prepara decisiones; no autoriza identidades, firmas, pagos o lanzamiento.
Las recomendaciones se basan exclusivamente en evidencia local, sin cotizaciones.

## Instrucción vigente del propietario — continuación

La instrucción más reciente prevalece sobre las etiquetas históricas de aprobación:
**no están aprobados todavía suministro final, importes, precios, calendario ni
autoridades definitivas**. Los números que aparecen más abajo describen referencias
históricas para fixtures, no parámetros adoptados de producción. No se comprará hardware
wallet por ahora. Se exige comercio sin aprobación del creador y sin su computador
encendido; eso no autoriza firmas/envíos ni garantiza profundidad de liquidez.
Registro: [restricciones actuales](../config/robusto-owner-decisions-current.json).
[Presupuesto y custodia de software](ROBUSTO_MINIMUM_LAUNCH_BUDGET.md).
[Compraventa y matriz de permisos](ROBUSTO_AUTOMATIC_TRADING_REVIEW.md).

## A. Custodia y seguridad de claves

Significa determinar quién puede operar y cómo recuperará el control. Opciones:
firmantes individuales con dispositivos hardware y respaldo privado; o multisig con
custodios independientes. Hardware reduce exposición del secreto al equipo operativo,
pero una sola persona sigue siendo un punto de fallo. Multisig reduce dependencia de
una persona, introduce coordinación, costes e integración todavía no implementada.
Varias claves en una computadora no equivalen a custodios independientes.

No se comprará hardware por ahora. Recomiendo evaluar custodia de software con entorno
dedicado, respaldo privado offline y recuperación, antes de identidades definitivas;
evaluar multisig para poderes críticos si existen custodios independientes. No asignar
una PDA multisig a builders que esperan firmantes individuales. Faltan responsables,
umbral, dispositivos, recuperación ensayada y presupuesto cotizado. Crear/importar
claves, trasladar autoridades o firmar necesita autorización expresa separada; nunca
entregar semillas a este repositorio, chat ni backup público.

## B. Firmantes y autoridades

Mint authority puede emitir más tokens; update authority cambia metadata; upgrade
authority cambia reglas del programa. Opciones: conservar poderes con custodia y
revisión; transferir a custodia compatible revisada; o renunciar irrevocablemente
solo después de reconciliación y auditoría. Retener permite corregir errores, también
conserva riesgo de abuso. Renunciar reduce ese poder y elimina recuperación mediante él.

Recomiendo conservar por ahora update y upgrade separadas, payer limitado y roles
mercado/comunidad/reserva/equipo distintos. La política vigente exige emitir el total
exacto y reconciliar antes de decidir revocación de mint. El builder actual separa mint authority de fuente/distribución y rechaza que coincidan;
la mención anterior de acoplamiento estaba obsoleta. Custodia final sigue pendiente. Faltan direcciones públicas verificadas y procedimiento de
upgrades. Transferir/revocar autoridades, emisión y despliegue requieren autorización
expresa sobre mensajes concretos; ninguna revocación está autorizada aquí.

## C. Beneficiarios y calendario de vesting

La referencia histórica de preparación contemplaba las duraciones: equipo 50M, espera 365 días y 730 días lineales;
reserva 300M, espera 180 días y 1.095 días lineales, con bloqueo técnico. Falta elegir
beneficiarios y fecha base UTC S. Opciones: reconfirmar o revisar términos y después distintas fechas S aprobadas
para cada ejecución, con calendario publicado y verificado; posponer hasta disponer
de custodia estable. Todas las duraciones y el calendario requieren ahora decisión final expresa.

Recomiendo fijar S y beneficiarios solo después de verificar recuperación y direcciones.
Preparar start=cliff=S+espera y end=start+duración, sin devengo durante espera. El
contrato devenga desde start, no desde cliff: configurar ambos incorrectamente adelanta
liberaciones. El beneficiario firma cada release; perder su control puede inmovilizar
fondos, sin rescate administrativo implementado. Faltan identidad jurídica/operativa,
UTC exactos y revisión independiente. Inicializar, depositar y liberar requieren
aprobación expresa; no es un calendario de transferencias automáticas.

## D. Distribución y suministro

Referencia histórica, pendiente de reconfirmación final: 1.000M tokens, seis decimales, freeze authority ausente, reparto 50/15/30/5:
500M mercado, 150M comunidad, 300M reserva y 50M equipo. Máximos iniciales: 5M,
con hasta 3M mercado y 2M comunidad; reserva/equipo cero. Los 500M no son circulación.

Opciones pendientes: importes efectivos entre cero y los techos, campañas posteriores
aprobadas individualmente, y custodia del remanente. Menor circulación limita exposición
inicial pero puede reducir profundidad y aumentar concentración. Recomiendo empezar
solo con cantidades financiadas y justificadas por un plan público; conservar el
remanente bajo controles separados. Faltan importes, destinatarios y conciliación de
supply/custodia por bucket. Emitir o distribuir necesita autorización de operaciones
concretas; los techos no autorizan transferencias.

## E. Precio inicial y liquidez Meteora

Elegir precio significa fijar relación de activos y rango, no garantizar demanda.
Opciones: posponer pool hasta cerrar seguridad/capital; preparar un tramo pequeño dentro
del techo; o mayor profundidad dentro del presupuesto aprobado. Más liquidez reduce
impacto para una operación comparable, inmoviliza más capital y mantiene exposición a
precio, arbitraje y protocolo. Un pool unilateral no crea SOL ni compradores.

Recomiendo posponer ejecución real hasta cerrar los riesgos Meteora y aprobar capital,
rango, comisiones, slippage y custodia del NFT de posición. El fixture usa inventario
1M, rango 3x, comisión 25bps y cotización SOL sintética: no es un precio aprobado ni un
presupuesto. Referencias históricas de precio no son cotizaciones actuales. Faltan
capital en ambos activos, tolerancia de pérdida, estrategia de retiro y revisión de
mercado externa. Crear pool, aportar/retirar liquidez y swaps reales requieren cada uno
autorización expresa; no hay autorización implícita por aprobar un modelo.

## F. Presupuesto y despliegue

Debe cubrir renta de cuentas/programa, fees base/prioridad, metadata, dispositivos,
auditoría y capital de liquidez, separado de gastos. Opciones: presupuesto por etapas
con límites y reservas; o aplazar hasta cotizaciones y financiación verificadas.
Recomiendo etapas y límites explícitos; no reducir seguridad para ajustar un coste
inventado. Los modelos locales de rent/CU no determinan fees ni SOL/USD actuales.
No existe un presupuesto mínimo monetario verificable con esta sesión offline.

Faltan cotizaciones de proveedores, renta/fees obtenidas de una red autorizada más
adelante, tamaño del binario definitivo y fondos realmente disponibles. Pagos, fondos,
lecturas de red fuera de este alcance y despliegue necesitan autorización separada.

## G. Metadata, Arweave y URI

La imagen local aprobada tiene SHA-256
`32c93f1971eb4a03f5c9b0fc6a5e87b1dc20f3028b5b73d01eeabd29cf5355ce`.
Faltan JSON definitivo, proveedor, coste y URI. Opciones: Arweave con conservación
permanente de bytes; otro alojamiento con disponibilidad y política de mantenimiento
revisadas; o continuar solo local. Cambiar proveedor exige revisar la política de
publicación. Permanencia implica que errores publicados no desaparecen simplemente
actualizando la URI del token; alojamiento administrado implica dependencia operativa.

Recomiendo aprobar JSON exacto y sus hashes antes de contratar/publicar, mantener
metadata mutable y update authority separada según política vigente, comprobar después
bytes descargados contra lo aprobado. Faltan descripción/enlaces finales, proveedor y
cotización. Publicar, pagar o actualizar metadata on-chain exige autorización expresa;
ningún contenido se ha publicado en esta sesión.

## H. Auditoría independiente

Opciones: auditoría de contrato e integración con revisión de dependencias/custodia;
revisión limitada que deja riesgos explícitos; o aplazar lanzamiento. Las suites locales
no sustituyen ninguna. Recomiendo auditoría independiente antes de fondos reales,
con alcance sobre vesting, calendario, autoridades, Meteora, rollback y reconciliación.

Persisten tres advisories y siete warnings del lock Meteora. Mitigar un camino local
no corrige upstream. Faltan auditor, presupuesto, alcance, plazo, resolución/aceptación
formal de residuales y retest de cambios. Contratar/pagar requiere autorización; aceptar
riesgo no autoriza operar ni convierte hallazgos abiertos en resueltos.

## I. Lanzamiento y emergencia

Opciones: ceremonia por etapas con revisión doble y detenciones; o aplazar hasta cerrar
prerrequisitos. Recomiendo etapas: artefactos definitivos verificados, aprobación de
mensaje/red/importe/autoridades, firma externa y reconciliación antes del siguiente
paso. Resultado incierto implica detener y observar, nunca reintentar automáticamente.

El journal local no autoriza operaciones ni confirma una red. El programa no tiene
pausa/rescate general del vesting; freeze=None impide usar congelamiento del mint como
control de emergencia. Upgrade retenido exige custodia, revisión y procedimiento, no
es una garantía de recuperación. Faltan responsables, canales de incidente, tiempos de
respuesta y criterios de suspensión. Toda firma, envío, despliegue, pool, publicación
y cambio de autoridad necesita aprobación expresa específica. Este documento no es
una autorización de lanzamiento.

## Cinco decisiones más urgentes

1. Elegir custodia, responsables y recuperación de poderes críticos.
2. Aprobar alcance/presupuesto de auditoría y tratamiento de riesgos Meteora abiertos.
3. Fijar beneficiarios y fechas UTC junto con los términos definitivos por aprobar.
4. Elegir circulación efectiva, capital de liquidez y presupuesto por etapas.
5. Aprobar responsables y condiciones de detención de la ceremonia; después, JSON,
   proveedor y publicación bajo autorización separada.

Fuentes locales: [economía](../config/robusto-economics-approved.json),
[política](../config/robusto-launch-policy-approved.json),
[autoridades](ROBUSTO_AUTHORITIES.md), [brechas](ROBUSTO_LAUNCH_GAP_REPORT.md).
