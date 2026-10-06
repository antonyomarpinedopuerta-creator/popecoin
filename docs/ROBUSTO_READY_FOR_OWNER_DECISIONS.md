# ROBUSTO — cierre pre-Mainnet y decisiones del propietario

Estado: **READY_FOR_OWNER_DECISIONS**, **NOT_AUTHORIZED_FOR_MAINNET**. Supply y distribución 50/15/30/5 están **APPROVED_ECONOMIC_PARAMETERS_ONLY**; circulación inicial, liquidez, vesting, reserva operativa, custodia y autoridades finales siguen **PROPOSED_NOT_APPROVED**; contenido público de metadata y preferencia Arweave aprobados por separado, sin autorización de publicar. MAINNET_DISABLED permanece activo. TOKEN READY FOR MAINNET sigue pendiente de las decisiones y verificaciones siguientes; PUBLICLY TRADABLE = NO. No se ha creado el token de producción ni un mercado.

## 1. Qué está terminado

Programa de vesting existente, cliente, validadores, preparación de instrucciones de producción, comprobación de supply exacto, autoridades separadas, metadata mutable, PNG acotado, planes de publicación/actualización/verificación, lector futuro de app, herramientas de deployment/verificación, security scan, auditoría, CI y backup público. No se reinició el programa ni se alteró su ABI.

Se añadieron propuestas aritméticas separadas de la configuración operativa, planners sin firma para las tres ventanas existentes y cotización futura de costes por RPC/simulación. No hay ejecutor automático Mainnet. `config/robusto-production.json` conserva direcciones y allocations sin aprobar; logo oficial validado y contenido de metadata aprobado. Scripts y planes no equivalen a aprobación, integración de firmantes o revisión independiente.

Parámetros aprobados sin autorización operativa: nombre/símbolo ROBUSTO; decimales 6; supply 1.000.000.000 tokens = **1.000.000.000.000.000 base units**; freeze authority ninguna; metadata actualizable; ninguna autoridad revocada.

## 2. Qué está probado

La suite de cliente contiene 101 pruebas, incluyendo distribución exacta, ventanas congeladas, Clock on-chain, bloqueo Mainnet, transacciones unsigned y cotización con RPC simulado. TypeScript compila. La suite RC reconstruye SBF/IDL y ejecuta Rust, Python y cliente con dos identidades; los informes verificables son `target/rc-check.json`, `target/reproducibility.json`, `target/security-scan.json` y `target/dependency-audit.json` del commit limpio empaquetado. El backup exige coincidencia de hashes.

Los tests locales del ciclo completo utilizan cuentas temporales y simulación local; no son transacciones Devnet nuevas ni evidencia Mainnet. Los casos Mainnet nuevos usan mocks, nunca RPC Mainnet. Resultados históricos y vulnerabilidades: [revisión completa](ROBUSTO_FINAL_REVIEW.md). Avisos transitivos conocidos de Yarn y Rust permanecen documentados: un scan aprobado no significa ausencia de todo riesgo. La revisión externa del contrato y de la custodia sigue pendiente.

## 3. CI

El run [37463806778](https://github.com/antonyomarpinedopuerta-creator/popecoin/actions/runs/37463806778), correspondiente a `1c75957499b5d1f595080968a22189e624429935`, terminó **SUCCESS**, incluidos ambos validate y compare. [Evidencia de API](evidence/robusto/ci-37463806778.json). HEAD y origin/master coincidían y el árbol estaba limpio antes de este cierre. La descarga local de un artefacto agotó 120 segundos; no se presenta como verificación local de ese archivo ni como fallo del CI.

El nuevo commit debe tener también CI SUCCESS antes del handoff final. Consultar su run por HEAD en GitHub; el resultado se entrega al propietario sin cambiar otra vez las fuentes para introducir una referencia circular al propio commit. No confundir evidencia del commit anterior con la del nuevo.

## 4. Qué falta por fechas Devnet

El tercer rehearsal permanece intacto. La evidencia del 6 de octubre es una observación histórica, no una lectura actual. Se conservan ambos JSON third-status de 12:12:53 y 12:28:16 UTC. No se altera calendario, reloj, programa, mint, vault, beneficiario ni supply de ensayo de 10.000.000 base units.

| Operación | Objetivo UTC | Plan previo seguro |
|---|---|---|
| Primer parcial | 2026-10-08 13:32:52 | `npm run robusto:third-release -- unsigned first-partial` |
| Segundo parcial | 2026-10-10 13:32:52 | `npm run robusto:third-release -- unsigned second-partial` |
| Final | 2026-10-13 13:32:52 | `npm run robusto:third-release -- unsigned final` |

Ahora: `npm run robusto:third-release -- offline`. Los comandos unsigned futuros son solo lecturas Devnet y construcción sin firma: verifican genesis, cuentas fijadas, Clock finalized, fondos, fee y blockhash; rechazan ejecución temprana. El primer parcial tiene límite antes de 2026-10-09 13:32:52 UTC; el segundo antes de 2026-10-13 07:32:52 UTC. Si se pierde una ventana, revisar el caso; no mover fechas ni fingir un ensayo parcial. En los objetivos exactos los importes orientativos son 2.857.142, 2.857.143 y 4.285.715 base units, suponiendo releases anteriores puntuales. El importe real depende del Clock y released observado, no de esa tabla.

Llegar a la fecha no autoriza firmar. Leer `npm run robusto:third-status`, revisar reconciliación y journal, preparar plan reciente, simular/revisar externamente y obtener autorización explícita de esa nueva transacción. El planner no simula, firma ni envía. No repetir releases ante respuesta de red incierta.

## 5. Decisiones exactas del propietario

### Supply y distribución aprobados, ejecución no autorizada

El propietario aprobó 1.000.000.000 ROBUSTO, 6 decimales, freeze=None y 50/15/30/5: 500M mercado, 150M comunidad, 300M reserva, 50M equipo. [Registro validable](../config/robusto-economics-approved.json); `npm run robusto:production -- economics`. No mint, transferencias ni circulación inicial autorizados. [Siguiente propuesta pendiente](ROBUSTO_PROGRESSIVE_LAUNCH_PROPOSAL.md). [Comparación histórica](ROBUSTO_DISTRIBUTION_DECISION.md).

`config/robusto-distribution-proposal.json` conserva ambas alternativas históricas; la selección vigente es 50/15/30/5 y el registro aprobado es separado, sin poblar allocations operativas. Comando seguro: `npm run robusto:production -- distribution`.

| Destino | Principal | Tokens | Base units | Alternativa de lanzamiento escalonado |
|---|---:|---:|---:|---:|
| Mercado/ecosistema/lanzamiento | 70% | 700.000.000 | 700.000.000.000.000 | 50% = 500.000.000 = 500.000.000.000.000 units |
| Comunidad/marketing | 15% | 150.000.000 | 150.000.000.000.000 | 15%, misma cantidad |
| Reserva | 10% | 100.000.000 | 100.000.000.000.000 | 30% = 300.000.000 = 300.000.000.000.000 units |
| Equipo/fundador | 5% | 50.000.000 | 50.000.000.000.000 | 5%, misma cantidad |
| Total | **100%** | **1.000.000.000** | **1.000.000.000.000.000** | **100%, mismo supply** |

La alternativa reduce la asignación inicial de mercado y aumenta la reserva; puede facilitar liberación por etapas con poca financiación, pero aumenta concentración y no crea SOL ni compradores. Ninguna asignación significa que deba depositarse toda en un pool. Decidir por separado tramo inicial, circulación, uso de reserva y transparencia; no se propone precio ni capital económico aprobado.

### Custodia mínima propuesta

Tres autoridades públicas distintas, controladas mediante firma fuera de este repositorio: mint authority, metadata update authority y program upgrade authority. Payer separado con saldo operativo limitado. Cuatro wallets de distribución distintas; la wallet de equipo es beneficiaria de su vesting, no autoridad de mint. Hardware y copias privadas offline bajo procedimiento del propietario; nunca seeds en chat, Git o backup público. Separar claves no aporta independencia de personas por sí solo.

Decidir quién controla cada rol, recuperación privada, revisión y límites. Para dos o más custodios independientes puede evaluarse multisig 2-de-3: no está integrada en estos builders y requiere adaptación y pruebas antes de escogerla. Los builders actuales requieren firmantes individuales on-curve. No configurar una dirección multisig como si fuera compatible sin comprobarlo. Se conservan mint, update y upgrade authorities; retenerlas también conserva riesgos de emisión adicional, cambios de metadata y upgrades, que deben divulgarse.

El candidato histórico de equipo acumula desde S con cliff S+365 días y end S+1.095; al cliff existe aproximadamente un tercio adquirido. La nueva propuesta pendiente recomienda espera de365 días y después730 días lineales sin anticipo: start=cliff=S+365, end=S+1.095, compatible con el programa existente. Ningún modelo está aprobado; ver [propuesta progresiva](ROBUSTO_PROGRESSIVE_LAUNCH_PROPOSAL.md) y decidir fechas, términos y beneficiario antes de configurar.

### Imagen y contenido

**OFFICIAL_USER_ASSET_VALIDATED**. El PNG oficial exacto aportado por el propietario está incorporado en **`metadata/robusto/robusto-logo.png`**, sin cambios: 1254 × 1254, 1.496.214 bytes; SHA-256 `32c93f1971eb4a03f5c9b0fc6a5e87b1dc20f3028b5b73d01eeabd29cf5355ce` fijado en configuración. Validación PNG completa correcta. Para comprobar de nuevo:

```sh
npm run robusto:prepare-metadata -- inspect-image
```

Este comando comprueba archivo regular, tamaño máximo 4 MiB, estructura PNG, CRC, dimensiones y descompresión acotada; imprime SHA-256. No publica ni cambia configuración. La incorporación del logo exacto ya está autorizada; nombre ROBUSTO, símbolo ROBUSTO y descripción final están aprobados; web omitida por ahora. Descripción: «ROBUSTO es un token en Solana inspirado en un perro decidido y su cohete, creado alrededor de una comunidad con carácter, energía y espíritu de aventura.». Arweave es la preferencia aprobada; faltan proveedor, cotización, autorización de subida/publicación y URI verificadas. [Registro de aprobación limitada](../metadata/robusto/CONTENT_APPROVAL.json). Fijar hash/URI aprobados en la configuración y ejecutar `npm run robusto:prepare-metadata -- prepare`. Revisar manifiestos con las herramientas existentes de publicación antes de autorizar cualquier escritura externa; ningún comando de esta sección crea metadata on-chain.

También decidir identidad pública de programa y destino de deployment, necesidad real de vesting adicional, límite de presupuesto SOL, prioridad de transacciones, reserva para reintentos y mecanismo de lanzamiento. Ninguna aprobación queda inferida de leer este documento.

## 6. Antes de Mainnet

Resolver proveedor/coste/autorización de publicación y URI (logo y contenido aprobados), circulación/desbloqueos (supply y buckets aprobados), direcciones/custodia, vesting/start, identidad de programa y presupuesto. Completar firma externa y revisión independiente; probar exactamente la configuración elegida sin fondos reales, verificar artefactos, hashes, loader y roles, conservar mint/update/upgrade y freeze=null. Actualizar lectura futura de app con mint/program/metadata reales solo después de autorización y verificación. Publicar documentación honesta de supply circulante, vesting y poderes retenidos.

Cotizar inmediatamente antes de operar y revisar plan, genesis, cuentas, blockhash, destinatarios e instrucciones. Cualquier cambio invalida el plan anterior. No modificar los flags de autorización en esta preparación.

## 7. Transacciones Mainnet que requieren autorización explícita

Financiación del payer; creación/escritura/deployment de programa si se elige; creación e inicialización de mint; ATAs; emisión real; transferencias de distribución; creación/financiación de vesting; creación/actualización de metadata on-chain; releases futuros; futuras actualizaciones de programa o autoridades; eventual mercado/pool/depósito de liquidez. Cada lote necesita revisión de importes, destinatarios, fees y signers. No hay autorización vigente para ninguna de ellas.

## 8. Qué es irreversible

Fees gastados, transferencias o releases confirmados y pérdidas de custodia no se deshacen automáticamente. Decimales quedan fijados al inicializar el mint. Emisión real y distribución cambian supply/saldos de manera pública. Revocar autoridades o marcar metadata inmutable puede eliminar control definitivamente: esas acciones están prohibidas aquí. Crear vesting fija parámetros contractuales; comprobar si la acción concreta admite recuperación antes de firmarla. Liquidez y compromisos de mercado tienen riesgos adicionales dependientes del mecanismo elegido.

## 9. Qué requiere dinero real

Rent y fees Mainnet, buffer de deployment, capital de mercado/liquidez si el mecanismo lo necesita y posibles costes de almacenamiento, RPC, custodia y revisión. Devnet no cotiza ni garantiza esos costes. Ningún SOL real fue usado en esta preparación.

## 10. Negociación pública: evaluación futura

Un token técnicamente preparado no tiene por ello compradores, contraparte, mercado o liquidez. No se escogió ni inventó DEX/launchpad. Evaluar proveedores reales con documentación oficial vigente y pruebas previamente autorizadas:

| Criterio | Pool con liquidez | Mecanismo de lanzamiento/sale | Contraparte u otro mercado |
|---|---|---|---|
| Capital inicial | Cotizar pares y profundidad mínima | Cotizar requisitos y quién financia mercado posterior | Identificar compradores/contrapartida y costes |
| Liquidez | Quién aporta activos, slippage y retiro | Cuándo nace, condiciones de graduación y destino | Capacidad de comprar **y vender**, profundidad |
| Comisiones | Creación, trades, rent, fees y prioridad | Plataforma, emisión, graduación y trades | Custodia/intermediación/transacciones |
| Control | Propietario LP, retiro, locks y upgrades | Autoridades del mecanismo y del pool resultante | Custodia, liquidación y control de listado |
| Riesgos | Manipulación, pérdida económica, front-running | Condiciones, concentración y contratos | Ausencia de salida, contraparte e intermediación |
| Solana | Programas y SPL clásico, 6 decimales, autoridades retenidas | Compatibilidad real con mint propio y metadata mutable | Compatibilidad de mint/red/custodia |
| Verificabilidad | IDs oficiales, cuentas, LP y trades verificables | Reglas públicas, fuentes y resultado on-chain | Prueba de liquidación, fees y retiro verificables |

Todo permanece PENDING_OWNER_DECISION. Antes de afirmar PUBLICLY TRADABLE comprobar mercado real y compra/venta efectiva con autorización y fondos mínimos decididos por el propietario; no prometer cotización, precio, liquidez o listado.

## 11. Cotización justo antes del lanzamiento

Ahora, sin RPC: `npm run robusto:cost -- offline`. Inputs futuros: `config/robusto-cost-inputs.json` (RPC HTTPS, deployment sí/no, buffer público/capacidad si aplica, reserva y política de fees) y configuración de producción resuelta. El estimador no inventa precios ni usa Devnet como sustituto.

Solo después de autorización **de lectura Mainnet**, `ROBUSTO_MAINNET_READ_ONLY=READ_ONLY:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d npm run robusto:cost -- quote` consulta rent y fees de mensajes concretos, verifica genesis y simula metadata sin firma/envío. El opt-in no autoriza transacciones. Requiere los artefactos públicos de producción fijados en `target/robusto-production/` y roles/destinatarios válidos. No se ejecutó ese comando con opt-in en esta sesión.

Cubre program/ProgramData/buffer según capacidad real, mint, ATAs, vesting, mensajes de deployment/distribución y metadata. Metadata se mide por cuentas y débito de simulación, no por un precio hardcoded. Buffer es capital temporal: el informe separa necesidad bruta conservadora de coste neto tras devolución, sujeto al deployment concreto. Si no hay deployment nuevo, exige verificar el programa existente contra ELF y autoridad esperada.

**No es presupuesto total cerrado:** cotizar además prioridad si se adopta, reintentos, futuros releases/actualizaciones, almacenamiento/publicación de asset y JSON, RPC, hardware/revisión y costes/activos del mercado elegido. La política implementada cotiza mensajes sin prioridad; cambiarla exige revisar instrucciones y pruebas. Repetir cotización al cambiar plan o expirar blockhash; guardar fecha/slot/hash. Evitar desplegar otro programa innecesariamente solo si el existente verificado satisface exactamente el diseño aprobado.

Referencias oficiales: [rent](https://solana.com/docs/rpc/http/getminimumbalanceforrentexemption), [fee por mensaje](https://solana.com/docs/rpc/http/getfeeformessage), [simulación](https://solana.com/docs/rpc/http/simulatetransaction), [deployment](https://solana.com/docs/programs/deploying), [autoridades SPL](https://solana.com/docs/tokens/basics/set-authority), [fees Metaplex](https://www.metaplex.com/docs/protocol-fees). Consultarlas de nuevo al cotizar: no se fija aquí una tarifa actual.

## 12. Recuperación sin Astra, esta sesión o esta cuenta

No se necesita Astra para ejecutar este proyecto. Otro desarrollador o agente puede usar Git, Node/Yarn, Python, Rust y herramientas Solana fijadas por el repositorio. Entrada: este documento, [recovery](ROBUSTO_RECOVERY.md), estado, manifest del backup y configuración congelada del tercer rehearsal. Verificar HEAD/remote/tree y CI; no continuar instrucciones antiguas de mint/deposit ni asumir autorización previa.

Clonar repo y checkout del commit del manifest, o restaurar backup público en carpeta nueva usando extracción segura y verificando SHA-256/inventario. Instalar dependencias con lockfile y scripts deshabilitados, ejecutar pruebas/RC antes de modificar. El backup contiene software/evidencia pública, **no claves**, no custodia ni historial privado; recuperar signers por el procedimiento privado del propietario fuera de AI. No recrear identidades/PDA/vault ni resetear rehearsal.

Tras cada commit estable: `npm run check:rc`, comprobar reproducción vigente de los mismos inputs Rust, `npm run audit:dependencies`, `npm run verify:rc`, `npm run package:rc`, `npm run verify:package`, `npm run backup:public`. Guardar archivo y sidecar fuera de esta cuenta y comprobar restauración. Ante transacción de resultado incierto, reconciliar firma finalized/cuentas antes de cualquier reenvío. El siguiente paso del propietario es resolver las decisiones restantes de la sección 5; no ejecutar Mainnet.
