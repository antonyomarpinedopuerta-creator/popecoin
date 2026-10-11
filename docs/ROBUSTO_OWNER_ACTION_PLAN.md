# ROBUSTO — plan de acciones del propietario

NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED / OFFLINE_FIXTURE_ONLY.
Base revisada: `41fc8d4af67e245ebb47c2d6562f3cacc6b004df`. Este plan no autoriza
claves, wallets, firmas, fondos, consultas a redes Solana, publicación o despliegue.

## A. Qué está terminado

El perfil ficticio tiene ELF reproducido en dos builds locales, IDL adaptado cotejado,
hashes de fuentes/dependencias y candidato con evidencia ligada a su HEAD. Se ejecutaron
92 casos/escenarios runtime: 24 instrucciones ROBUSTO, ocho secuencias acotadas,
20 creación/adversariales Meteora, 13 liquidez, 12 swaps y 15 adversariales ROBUSTO.
Son resultados históricos verificados, no suites repetidas para redactar este plan.

B→A y A→B funcionan con un usuario independiente del creador. El swap no recibe el
NFT de liquidez ni permiso del creador; tampoco llama al servidor local o al vesting.
Un usuario no pudo retirar una posición ajena. El funcionamiento on-chain no requiere
que la laptop del creador permanezca encendida. Cada usuario sí necesita acceso a
Solana, una interfaz compatible y su propia autorización de operación. No se ha
verificado una interfaz pública, listado ni disponibilidad real de red.

Vesting vincula beneficiary/mint/vault/destino; exige firma del beneficiario para
inicializar y liberar, y autoridad registrada para depositar. Release actualiza
released_amount después de CPI exitosa y rechaza dobles releases sin nuevo devengo.
Journal/recibos bloquean reintentos de mensajes consumidos, no autorizan ni confirman
transacciones de red. La revisión adicional no halló un defecto nuevo verificable
que justifique cambiar contrato, dependencias, economía o harness.

## B. Qué sigue bloqueado y por qué

| Clase | Pendiente real y alcance |
| --- | --- |
| Defectos corregibles ahora | No se identificó un defecto nuevo de código en esta revisión. Se corrigió una atribución documental de conteos históricos: la tanda de 234 pruebas cliente correspondía a 12 casos de liquidez/cinco swaps; 13/doce se verificaron después con suites focalizadas. |
| Pruebas posibles offline | Cobertura adicional de delegados, ExactOut/PartialFill, rewards y Token-2022 sigue posible donde exista fixture suficiente, pero no es necesaria para afirmar cobertura del perfil ExactIn clásico probado. Se vuelve requisito si se elige ese alcance. No sustituye atomicidad ni auditoría. |
| Herramienta no disponible compatible | Atomicidad transaccional nativa no demostrada. InvokeContext conserva efectos raw antes del fallo; el descarte local no equivale a rollback de Bank/SVM. No se encontraron solana-svm/solana-runtime completos en el registro local; LiteSVM 0.10.0 crea Keypair internamente. No ejecutarlo bajo las restricciones vigentes. |
| Revisión independiente | Contrato y configuración final, callers aritméticos y residuales Meteora, procedencia/compatibilidad de programas externos, custodia y operación. Tres advisories/siete warnings siguen abiertos. |
| Decisiones económicas | Suministro, decimales definitivos, reparto, importes, circulación, beneficiarios, calendario, precio/rango/comisiones y liquidez. Archivos históricos "approved" son referencias de fixtures, no decisiones finales vigentes. |
| Autorización futura | Identidades/recuperación reales, cualquier consulta a red Solana, firmas, fondos, despliegue, pool, publicación o cambios de autoridades. Requieren permisos específicos; ninguno concedido aquí. |

**Puede impedirse la compraventa después del lanzamiento:** un operador Meteora con
SetPoolStatus puede deshabilitar el pool; operadores con UpdatePoolFees pueden cambiar
comisiones según reglas del programa. Un upgrade del programa externo puede cambiar
reglas. El propietario/delegado del NFT puede retirar profundidad. Freeze authority,
si existiera, puede congelar cuentas SPL; el constructor de referencia la deja null,
pero no se ha verificado un mint real definitivo. Mint authority puede emitir más y
alterar oferta/precio; metadata authority puede cambiar contenido, no bloquear por sí
sola TransferChecked del token clásico. Upgrade authority ROBUSTO afecta vesting, no
es la autoridad de swap Meteora. No prometer ventas perpetuas a cualquier importe.

Antes de activación, usuarios ordinarios no operan; la whitelist puede anticipar
acceso de una dirección. Después de activación no es una lista de aprobación por
operación, pero pool debe seguir habilitado. Rango y reserva de salida también
limitan ventas: el fixture unilateral inicial A no permite A→B hasta incorporar B.
No se encontró una aprobación oculta del creador en el camino ExactIn revisado;
esta afirmación no certifica todos los modos o un despliegue actual.

## C. Qué debe decidir el propietario

Confirmar por escrito valores exactos, separando decisión de autorización operativa:

- Token: suministro total, decimales y base units; distribución por bucket cuya suma
  sea 100%; cantidades iniciales efectivas y remanentes, sin confundir bucket mercado
  con circulación. Si difieren del perfil histórico, adaptar builders y volver a validar.
- Vesting: beneficiario público de cada asignación, cantidad en base units, UTC de
  start/cliff/end y si hay devengo durante espera. La PDA es única por beneficiario y
  mint: varios calendarios para la misma pareja requieren diseño adicional. No hay
  cambio de beneficiario, rescate general ni ejecución automática de releases implementados.
- Mercado: par/mints/programas exactos, precio inicial y unidades de cotización, rango,
  cantidades de ambos activos, fee mode/comisión, activación/whitelist, slippage y
  propietario/delegados/bloqueo de la posición de liquidez. No basta elegir “Meteora”.
- Custodia: responsables y separación de payer, emisión, metadata, upgrades, distribución
  y NFT; recuperación y política de privilegios. No comprar hardware ahora no elimina
  necesidad de entorno seguro, respaldo privado offline y revisión de mensajes.
- Ejecución: presupuesto por etapas, proveedor/contenido metadata, alcance de auditoría,
  responsables de incidentes y criterios para detenerse. Cada operación real se autoriza
  aparte después de cerrar sus prerrequisitos.

**Simulaciones matemáticas, no propuesta económica:** con suministro ficticio de
1.000 tokens y reparto 50/15/30/5, los buckets son 500/150/300/50 tokens; con seis
 decimales son 500.000.000/150.000.000/300.000.000/50.000.000 base units. Suman
1.000.000.000 base units, sin crear tokens. Ninguna cifra adopta el suministro final.

Para vesting ficticio de 1.000 base units con start=cliff=100 y end=200, en t=150
se devengan floor(1.000×50/100)=500; si released=200, se liberan 300, y una repetición
en el mismo instante libera cero. Con start=100, cliff=150, end=200 ya se devengan
500 al llegar al cliff. Con start=cliff=150, end=250, al cliff son cero: elegir bien
estos valores evita prometer una espera sin devengo que el calendario no implementa.
Los tiempos son números ficticios, no fechas aprobadas ni simulación de una red.

## D. Riesgos de lanzar sin auditoría

Las pruebas abarcan entradas conocidas y permisos sintéticos, no verifican firmas,
rollback nativo, todos los estados, custodia o seguridad global del protocolo.
ruint 1.14.0 está activo y mantiene dos advisories; una regresión demuestra un defecto
de flags, no su reparación. bytes 1.10.1 tiene otro advisory y la feature revisada está
inactiva; siete warnings incluyen mantenimiento y riesgos host/opt-in. Mitigaciones
por perfil no son fixes upstream. Mantener BLOCKED_FOR_PRODUCTION_REVIEW.

Lanzar sin revisión independiente expone a pérdida/bloqueo de fondos, mala configuración,
fallos de integración y compromiso de autoridades. No equivale a aceptar una comisión
más alta; el daño no tiene un tope demostrado. Menor presupuesto justifica aplazar,
no sustituir auditoría por aprobar la suite. Wallet de software añade riesgo de malware,
phishing y pérdida de recuperación; no se certifica adecuada para fondos importantes.

## E. Presupuesto por cotizar

Trabajo local de lectura, construcción de instrucciones sin firma, modelos y pruebas
puede hacerse sin pagar una red; tiempo de ingeniería y equipo tienen coste económico.
No hace falta un servidor propio encendido para aprobar compras/ventas. Hardware wallet
no se comprará por ahora; web/dominio premium, bots y múltiples pools son evitables.

Para el alcance previsto faltan cotizaciones de revisión independiente/retest,
alojamiento/publicación de metadata, controles de custodia y operación. Rent y fees de
programa, buffer y cuentas definitivas necesitan cálculo fresco bajo autorización
posterior. Fee de prioridad no es un importe fijo obligatorio; depende del mensaje,
condiciones y política futura. Renta retenida puede ser recuperable solo en cuentas que
admitan cierre; distinguir necesidad de financiación transitoria de gasto neto.

Capital de liquidez son activos comprometidos en la posición, expuestos a precio y
arbitraje. No es una comisión consumida ni dinero recuperable garantizado. Debe permitir
reservas/rango coherentes con compras y ventas y financiarse aparte de auditoría,
publicación, rent y fees. Sin decidir cantidades/rango no puede calcularse capital
mínimo. Infraestructura RPC/interfaz sigue necesaria; un servicio gratuito no garantiza
capacidad/disponibilidad y debe validarse más adelante. No existe total monetario
mínimo verificable con la información offline actual.

## F. Camino previo a solicitar producción — nueve tareas reales

La tabla ordena dependencias. Las tareas marcadas con autorización futura no se
realizan en esta sesión. Solicitar un permiso acotado de preparación no autoriza lanzar.

| Orden | Tarea / responsable | Depende de | Criterio verificable de cierre |
| --- | --- | --- | --- |
| 1 | Propietario: elegir responsables/custodia software y alcance inicial del producto | Nada | Roles, recuperación propuesta, separación y límites documentados; alcance explícito de token/par/vesting/modos. Si el entorno no es adecuado, detener. |
| 2 | Propietario: aprobar economía y calendario definitivos | 1 | Valores exactos de C, sumas/base units correctos, UTC y beneficiarios revisados; ningún null final ni referencia histórica adoptada por omisión. |
| 3 | Ingeniería: adaptar configuración/builders al alcance aprobado | 2 | Rechazos por cuentas/autoridades/calendario inconsistentes; pruebas del perfil seleccionado. Sin extender protocolo por ahorro cosmético. |
| 4 | Ingeniería/revisor: conseguir prueba nativa de atomicidad y revisar dependencias/programas externos | 3 | Herramienta revisada compatible o autorización futura específica para otro entorno; evidencia de rollback del procesador real, permisos y CPI; procedencia de ELF y clasificación íntegra 3/7. No cerrar con descarte local. |
| 5 | Auditor independiente: revisar y resolver/retestear hallazgos | 3 y 4 | Informe con alcance/versión, fixes reproducibles y riesgos residuales explícitos. Decisión formal sobre residuales no equivale a corregir advisories. |
| 6 | Propietario: cotizar y aprobar límites de gasto/capital y contenido metadata | 2 y alcance de 5; cotización puede empezar antes | Ofertas fechadas, JSON/imagen exactos, proveedor, presupuesto separado de capital/rent, contingencia elegida y criterios de detención. No pagar/publicar todavía. |
| 7 | Custodios/revisor: preparación de identidades y validación operativa con permisos futuros separados | 1–6 | Autorización expresa limitada antes de cualquier clave/recuperación real o red; direcciones, control/recuperación y compatibilidad de firmas verificados fuera del repositorio. Comprobar autoridades/activación del entorno final sin suponer vigencia de snapshots históricos. |
| 8 | Ingeniería/revisor: producir RC definitiva y expediente | 3–7 | Identidades finales, ELF reproducido, IDL/metadata/manifiestos coherentes, dependencias revisadas, integridad/procedencia y ausencia de secretos comprobadas. Planes/mensajes unsigned exactos, estimaciones frescas autorizadas y evidencia de disponibilidad de interfaz/RPC. URI publicada solo si tuvo autorización específica previa; si falta, conservar bloqueo. |
| 9 | Propietario/revisor: decidir si solicitar autorización de producción por etapas | 8 | Checklist sin bloqueos críticos, auditoría/retest aceptados, responsabilidades y emergencia ensayadas; revisar red/programas/cuentas/importes/fees/autoridades y criterios de parada de cada etapa. No firma/envío/pool/deploy hasta permiso explícito correspondiente. |

Una RC de producción requiere cumplir el alcance definitivo anterior, no renombrar el
archivo ficticio. El último candidato probado corresponde a HEAD `41fc8d4af67e245ebb47c2d6562f3cacc6b004df`,
SHA-256 `096618245e32fa43ee11d508bf4116f22633cc69d8667fff23a74830dc583a42`.
Esta revisión documental no cambia ese artefacto ni lo atribuye a un HEAD posterior.

Referencias: [permisos/compraventa](ROBUSTO_AUTOMATIC_TRADING_REVIEW.md),
[decisiones](ROBUSTO_OWNER_DECISIONS.md), [presupuesto](ROBUSTO_MINIMUM_LAUNCH_BUDGET.md),
[dependencias Meteora](ROBUSTO_METEORA_DEPENDENCY_REVIEW.md),
[brechas](ROBUSTO_LAUNCH_GAP_REPORT.md).
