# ROBUSTO — continuación vigente del cierre de octubre 2026

Leer primero [decisiones finales del propietario](docs/ROBUSTO_READY_FOR_OWNER_DECISIONS.md) y [ROBUSTO_STATUS](docs/ROBUSTO_STATUS.md), [cierre y clasificación](docs/ROBUSTO_CLOSURE.md), [validación](docs/evidence/robusto/closure-validation.md), [Mainnet](docs/ROBUSTO_MAINNET_CHECKLIST.md), [autoridades](docs/ROBUSTO_AUTHORITIES.md) y [recuperación/backup](docs/ROBUSTO_RECOVERY.md).

Tercer rehearsal FINANCIADO, fechas fijas. Mint CfHGrav3zjZyAEdspKwdBGW3yBHYkiz6cYpeeQXoujvo; beneficiario GuKSMzTw7JZfAkh9A4hGYYysmQGpxTxXF2QdC1QHVFTF; ATA9gSDUytN7u3tUk8B8h7Tmdtik8U3SScyXfHRHL2Swgby; vesting4A63yMPGnrH4XY8yFAAFK8TkRi7rJ3May1GW1DvX2tNN; vaultCNJpJ3D9FUJcMnfpPQgxV6AxMoWbUwvGcUgtp2DmVuAT. Slot508092917 finalized, Clock2026-10-06 12:28:16 UTC: supply/vault10000000; source/beneficiario/released0. Start2026-10-06 13:32:52, cliff2026-10-07 01:32:52, end2026-10-13 13:32:52 UTC. Objetivos parciales8 y10 octubre a13:32:52 UTC. Sin nuevas firmas, releases NO autorizados. No reloj alterado ni depósito/mint nuevo.

48 Rust por identidad (37 integraciónSBF+1carga+10aritmética), 95 cliente y 49 Python en la revisión adicional; ver [revisión final](docs/ROBUSTO_FINAL_REVIEW.md). Resultados finales, reproducción, RC/backup/push en evidencia. Lectura nueva segura: `npm run robusto:third-status`. No correr `robusto:recover` ni `robusto-third-preview` antiguos para esta etapa: exigen checkpoint/setup anterior. No regenerar identidad privada ni repetir ATA/Initialize/Deposit.

Preparación producción unsigned y validaciones listas; flags MAINNET_DISABLED / NOT_AUTHORIZED_FOR_MAINNET; supply candidato1e15 raw; allocationsnull / PROPOSED_NOT_APPROVED; metadata mutable, autoridades retenidas/separadas; imagen exacta OFFICIAL_USER_ASSET_VALIDATED, hash fijado en configuración. La firma/custodia/plataforma/revisión independiente y decisiones económicas siguen externas. No hay executor Mainnet ni release automático.

Metadata pública y preferencia Arweave aprobadas según metadata/robusto/CONTENT_APPROVAL.json; publicación/pagos NO autorizados. Supply 1.000M/6 decimales/freeze=None y buckets 50/15/30/5 aprobados SOLO como parámetros en config/robusto-economics-approved.json. Políticas progresivas aprobadas en config/robusto-launch-policy-approved.json, validables offline con npm run robusto:launch-policy -- validate. Próxima acción del propietario: revisar docs/ROBUSTO_NEXT_STAGE_FOR_APPROVAL.md y resolver fechas, beneficiarios, custodia concreta, presupuesto, proveedor y mecanismo de lanzamiento según el documento único. El cierre ya incluye 100 tests cliente y planners offline; no depende de esperar fechas. Para Devnet: lectura de estado sin firmas; al primer objetivo2026-10-08 13:32:52 UTC comprobar Clock y preparar UN release parcial para revisión y autorización NUEVA. No realizarlo por haber llegado la fecha. Abajo se conserva el handoff histórico, no instrucciones vigentes.

---

> Estado vigente: primera tanda del tercer rehearsal FINALIZED (ATA + Initialize + Deposit); simulación unsigned pre-cliff NothingToRelease verificada. Source=0, vault=10,000,000, beneficiario=released=0. Primer parcial objetivo 2026-10-08 13:32:52 UTC; NO autorizado aún. Evidencia: docs/evidence/robusto/third-first-batch.md. Las secciones de preparación anteriores son históricas y no deben repetirse.

> Actualización 2026-10-04: segundo rehearsal abandonado con vault vacío y released=0; NO Deposit, cierre ni reutilización. Tercer rehearsal preparado sin transacciones, con nueva identidad y calendario relativo de 48h de margen + 7 días de duración. Ver docs/ROBUSTO_REHEARSAL_3.md (desde docs: ROBUSTO_REHEARSAL_3.md). Esta actualización sustituye cualquier siguiente paso Deposit del segundo indicado abajo. Estado: PENDING_AUTHORIZATION.

# PAPA — handoff técnico actual

Actualizado en la continuación del 28 de septiembre de 2026. Este documento describe el árbol actual;
los registros históricos anteriores permanecen en Git.

## Recuperación y commits

- La recuperación encontró el árbol limpio en `bc319b1`, no cambios perdidos.
  `f46fde9` y `bc319b1` ya conservaban programa, app, CI, vendor y scripts.
- `6268277`: verificación completa de inputs/outputs del build y recuperación.
- `2247ef7`: RC con exclusión concurrente, fallos/interrupciones, hashes de fuentes,
  versiones de herramientas y lectura Devnet estricta.
- Continuación: reconstrucción aislada, verificación/empaquetado público del RC,
  nuevas regresiones SBF, SIGKILL real y checksum oficial de Agave en CI.
- No se descartó trabajo. Se publicó hasta dc5a5ec en origin/master; no se desplegó ningún programa.

## Estado y arquitectura

Candidato **local para revisión**, no autorización de lanzamiento. Tres instrucciones
Anchor: initialize, deposit y release. Una PDA por beneficiario/mint y un vault PDA;
SPL Token clásico, transfer_checked, sin Token-2022, cancelación, rescate ni cierre.
Payer, autoridad y beneficiario firman la creación; la autoridad deposita y el
beneficiario libera hacia su propia cuenta del mint correcto.

Identidad de release: `AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn`.
Identidad Devnet histórica: `BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`.
Ambas se compilan y prueban separadamente. El binario local NO se ha desplegado.
La verificación denominada verify-mainnet-release.ts es enteramente offline.

## Verificación y reproducción

```sh
npm run check:rc
npm run verify:reproducible
# Requiere check:rc sobre el HEAD actual con árbol limpio:
npm run verify:rc
npm run package:rc
npm run verify:package
npm run check:clean
npm run audit:dependencies
```

- check:rc: tests Python, build SBF y Anchor IDL, Rust, TypeScript/clientes,
  Clippy sobre todos los targets, build/tests Devnet aislado y verificación final de release.
- **47 tests Rust por identidad**: 36 integración SBF, 1 carga y 10 cálculo.
- **32 tests TypeScript**: cliente, lector, servidor, planificación, ProgramData,
  vendor y registro de build. **35 tests Python**: RC, reproducción y paquete.
- Fallos/interrupciones en cada gate, SIGTERM real con cierre del hijo, SIGKILL
  real dejando evidencia incompleta, concurrencia, fuentes cambiadas, symlinks,
  artefactos ausentes, informes incompletos y paquete determinista cubiertos.
- SIGKILL no puede ejecutar limpieza: sus hijos pueden sobrevivir. La prueba
  elimina sus procesos sintéticos; nunca interpretar un informe incompleto como éxito.
- verify:reproducible crea un workspace/caché NUEVOS bajo target, reconstruye
  SBF/IDL/tipos, compara bytes exactos y ejecuta Rust allí. Pasó con los mismos
  hashes de release. Es reproducibilidad en la misma máquina/herramientas,
  **no atestación independiente ni compilador hermético verificado**.
- El inventario exige todos los archivos raíz, incluidos ambos lockfiles; una
  ausencia invalida el RC antes de ejecutar gates.
- package:rc exige HEAD y árbol limpios, todas las pruebas exitosas, fuentes y
  artefactos actuales y reproducción coincidente. Solo incluye entradas públicas
  explícitas y su manifiesto. Nunca copia target/deploy en bloque.
- Evidencia local ignorada por Git: target/rc-check.json,
  target/reproducibility.json y target/rc/papa-<commit>.tar.gz con SHA-256.
- CI usa check:rc y fija el checksum oficial del tarball Agave antes de extraerlo.
  El run hospedado 36384418193 falló al instalar Anchor; diagnóstico al final.

Hashes conocidos:

- Release SBF: `1c3b71a2b792fa986b2a9264861d2bc58654e85370f2bb348cea4dcccaff8492`.
- Devnet SBF local: `e2afff5bdf90e1879ef08d8fd5bec4a84b14891b23e12617eb86e4e53b7b93fb`.
- Logo: `7be34ed33f6fd2fe52946d43a4eccfd8e41055190bbc29d46a3e285858ee55eb`.

## Seguridad revisada

Cálculo temporal amplía a i128 antes de restar y multiplica en u128. Las pruebas
incluyen rango i64 completo, u64 máximo, cliff al final, redondeo, monotonía,
conservación de tokens y doble release atómico con rollback completo. Nuevos tests
verifican firmas de authority/payer al inicializar y sustitución de cuentas en deposit.
Las pruebas anteriores cubren beneficiario sin firma, fuentes/destinos incorrectos,
PDAs, propietario/discriminador/programa token, congelación, saldo insuficiente,
clock regresivo, financiación parcial, donaciones y reinicialización.

La inspección de archivos versionados no detectó los patrones de secretos y nombres
sensibles comprobados; esto es heurístico. No se abrieron wallets o seed phrases,
ni se copiaron claves. Los signers de pruebas son efímeros de LiteSVM.

## App y Devnet

App local de consulta, sin wallet ni firmas: `npm run app`, 127.0.0.1:3000.
Probada con navegador real: reserva, fundador, vista móvil 390x844 sin overflow,
sin errores registrados, y fallo RPC simulado que oculta resultados anteriores y
rehabilita la consulta. Las bibliotecas de Chrome se extrajeron solo en /tmp.

Lecturas recientes de vestings y ProgramData pasan. Reserva/fundador mantienen
saldo completo, liberado cero y no están congelados. ProgramData coincide con
el ejecutable histórico, upgrade authority activa; **no coincide con una supuesta
actualización del candidato local**. Metadata Devnet: PAPA/PAPA, mutable, URI GitHub
histórica. Detalles y slots en docs/DEVNET_CHECKPOINT.md.

Lectores validan owners, longitudes, discriminadores, PDAs, mint, flags SPL
canónicos y reloj de red en un contexto RPC común. Ningún indicador de cobertura
del vault afirma que una transacción pueda ejecutarse.

## Dependencias y herramientas

Rust/Cargo 1.89.0, Solana CLI 3.1.10, Anchor CLI 1.1.2; Cargo.lock resuelve
Anchor Rust 1.2.0. Cliente Anchor TS 0.32.1/web3.js 1.99.0; Node 24.10.0,
Yarn 1.22.22, TypeScript 5.9.3. Las diferencias de versiones están probadas en
estos flujos, no se afirma compatibilidad universal. Usar Yarn frozen-lockfile
con ignore-scripts; npm install no garantiza las resolutions de Yarn.

Instalación limpia: peer UTF-8 corregido (1.0.22); quedan tres warnings deliberados
(overrides de seguridad toml/uuid e ignore-scripts). Tests prueban los consumidores
reales y las regresiones de los parches; detalle exacto en DEPENDENCY_REVIEW.md.

Yarn audit: 1 hallazgo alto de bigint-buffer y 3 rutas moderadas de stream-json.
Vendor usa JS upstream sin binding nativo, hash y licencia comprobados. No se
forzaron majors incompatibles. Cargo-audit 0.22.2: cero vulnerabilidades,
cinco avisos unmaintained y RUSTSEC-2026-0097; triage y base en DEPENDENCY_REVIEW.md.

## Pendientes externos y límites

config/production-plan.json mantiene **mint, startUtc, imageUri y metadataUri null**.
plan:production falla deliberadamente con esos parámetros pendientes. No inventarlos.
Metadata y logo todavía requieren almacenamiento duradero y verificación de contenido.
Restan revisión independiente, custodia/multisig, fecha UTC aprobada, mint definitivo,
liquidez y revisión legal. No se verificaron backups privados ni titularidad de claves.

El mint puede tener freeze authority; el contrato no limita su suministro. Una
posición parcialmente financiada puede liberar si cubre lo devengado y, después,
deposit queda bloqueado aunque transferencias SPL directas sigan permitidas.
Excedentes no tienen rescate. No añadir poderes administrativos sin decidir producto.

Siguiente revisión: verificar el paquete público desde otra máquina/entorno, revisar
las pruebas y el programa independientemente, ejecutar CI hospedado cuando se publique
el commit y resolver los parámetros externos. No hay autorización para Mainnet,
fondos reales ni cambios irreversibles de tokens/autoridades.

## Continuación: controles finales del candidato

Commits d08da32 y 566068a: peer UTF-8 corregido, regresiones de overrides,
2048 schedules deterministas y rechazo de PDAs sustituidas al inicializar.
El programa y sus binarios no cambiaron. Se añadieron controles de archivos públicos,
verificación del tar sin extracción (inventario, hashes, duplicados, symlinks y
traversal), y auditorías que rechazan hallazgos nuevos sin ocultar los retenidos.
CI ejecuta auditorías, los ocho gates RC, reproducción y verificación del paquete;
el run 36441044629 pasó en ambas réplicas y en compare. check:clean exige HEAD limpio, exporta solo
Git, instala con caché Yarn nueva y reconstruye/prueba ambas identidades sin outputs
heredados. Comparte toolchains instaladas y caché de registros Cargo: no es hermético.
Evidencia de ejecución actual en target/clean-check.json, target/rc-check.json,
target/dependency-audit.json y target/reproducibility.json; solo status passed
(o reviewed-findings-only para auditoría) constituye éxito. No usar informes viejos
como evidencia de un HEAD posterior. El paquete final incluye el HEAD en su nombre.

## Tanda actual: metadata, CI y preparación de auditoría

Se conserva el RC f6470b4 anterior y su reconstrucción limpia verificada. La tanda
actual añade validación estricta de metadata local/remota (branding y disclaimer
exactos, PNG fijado por hash, límites de tamaño, URLs públicas fijas, sin redirects),
y valida owner/PDA/mint/discriminador/URI de la metadata on-chain.

CI compila en dos runners separados, conserva únicamente el paquete y los informes
públicos enumerados y compara sus inventarios y seis hashes de artefactos. La prueba
local del comparador no demuestra ejecución hospedada; revisar Actions después del
push. No se añaden permisos de escritura ni acceso a wallets al workflow.

`npm run rehearse:devnet` verifica app HTTP -> cuentas Devnet y ProgramData/metadata
sin firmas. Es lectura del despliegue histórico, NO ensayo firmado del candidato.
`npm run prepare:audit` reúne el RC y los informes exitosos del mismo HEAD con hashes
para revisión independiente; no emite aprobación de seguridad. Procedimientos:
docs/INDEPENDENT_AUDIT.md y docs/DEVNET_REHEARSAL.md.

Evidencias: target/metadata-local.json, target/metadata-remote.json,
target/devnet-rehearsal.json y target/audit-review.json, además de los informes RC,
reproducción, instalación limpia y dependencias. Comprobar status y HEAD antes de
usarlas; una ejecución incompleta/fallida no acredita el candidato. La publicación
duradera, auditoría independiente, firmas para el ensayo Devnet y decisiones de
custodia/parámetros definitivos siguen pendientes externos.

Instrucción vigente: corregir CI hospedado, publicar y comprobar los nuevos runs;
continuar con pendientes técnicos seguros cuando CI esté verde.

## Corrección de CI hospedado — run 36384418193

HEAD probado c556eeff170b830a003d2f4bb924b44a856e3bf1. Ambos jobs fallaron
antes de las pruebas al compilar anchor-cli 1.1.2: cargo-platform 0.3.3 exige
rustc 1.91, mientras el override del repositorio activaba 1.89.0. La instalación
ahora selecciona explícitamente cargo +1.91.0 para Anchor y cargo-audit. El
programa, tests, Clippy y SBF conservan 1.89.0; no se cambia el lockfile ni el ABI.
Las pruebas locales no sustituyen la comprobación del siguiente run hospedado.

## CI verde y evidencia cruzada

El run 36441044629 de f96ebfe5246bebc618abd9a7acf49f666c60865e pasó los tres
jobs. La comparación local de sus artefactos confirmó binarios/IDL/tipos idénticos,
pero detectó orden variable de claves en el registro JSON Devnet (contenido igual,
bytes distintos). Se canoniza ese registro con sort_keys y se añade regresión con
orden de creación de archivos invertido. check:clean ahora compara también ese
registro, no solo el binario Devnet.

`npm run collect:ci -- <run-id>` requiere un RC local limpio y consulta la identidad,
HEAD, workflow y éxito de los tres jobs. Descarga únicamente las tres evidencias
públicas esperadas y verifica inventario, hashes/manifiesto de ambos tar sin extraer,
comparación hospedada y correspondencia de los seis artefactos con el RC local.
`prepare:audit` exige ahora target/hosted-ci.json del mismo HEAD; ya no declara
CI pendiente cuando existe esa evidencia verificada. Tras publicar esta tanda se
debe validar su propio run; el éxito de f96ebfe no acredita un commit posterior.

## Preparación offline de ensayo y metadata

El run 36449546784 de dc5a5ec pasó ambos validate y compare. Sus seis artefactos
coincidieron con el RC local; collect:ci y prepare:audit terminaron correctamente.
La nueva tanda añade prepare:rehearsal: instrucciones sin firmas, orden de cuentas,
PDAs y datos ABI contrastados contra Anchor. Un test detectó argumentos snake_case
del IDL frente a camelCase del cliente; se corrigió y se comprueban también los
enteros codificados. config/rehearsal-plan.json conserva elecciones públicas null.
No se generaron signers ni se accedió a claves, se simuló o se envió transacción.

prepare:metadata genera bytes JSON deterministas cuando exista una URI de imagen
aprobada. Valida estructura/canonicalidad de CID o identificador Arweave y permite
comparar los archivos públicos descargados con los bytes/hashes aprobados. No
publica ni selecciona hosting. Los parámetros de producción siguen null. Se
reescribió DEPLOYMENT_PROCEDURE.md para eliminar comandos históricos ambiguos y
referencias a wallets por defecto; la historia continúa disponible en Git.

Nuevas pruebas: 2 de ensayo offline y 2 de metadata/URI; total TypeScript 32.
El programa Rust, ABI, binarios y dependencias no cambian. Esta tanda requiere su
propio CI/RC; los informes del HEAD anterior no acreditan una revisión posterior.
Siguen externos: wallet-held signing para ensayo real, auditoría independiente,
custodia/autoridades públicas definitivas, URIs publicadas y autorización de lanzamiento.

## Continuación 29 septiembre 2026 — aislamiento del rehearsal

Inicio en master, HEAD 4d1780ca753365f49603c9d0093bdf7ea121aebd, árbol limpio.
Los informes locales RC/clean/auditoría y hosted-ci conservan ese HEAD; hosted-ci
registra status passed y run 36509299040. No se volvió a consultar GitHub en esta
continuación ni se repitieron compilaciones. Esa evidencia no acredita los cambios
del árbol posteriores a ese commit.

- **IMPLEMENTED:** prepare:rehearsal rechaza también el programa Devnet histórico;
  antes lo aceptaba incluso como fixture positivo. El fixture ahora usa bytes
  públicos sintéticos, sin generar signers ni identidades. Documentado que
  build:devnet sigue compilando la identidad histórica, no una aislada arbitraria.
  Añadida secuencia de revisión pública y autorizaciones separadas para setup,
  simulación con wallet y firma/envío. Releases repetidos se evalúan por reloj y
  cantidad devengada; no se presupone que siempre fallen.
- **TESTED:** 3 tests de rehearsal-plan pasan; tsc --noEmit y git diff --check
  pasan. prepare:rehearsal sale con código 1 y Public rehearsal addresses are pending,
  como corresponde. Configuración pública permanece null. Sin cambios Rust/ABI.
- **EXTERNALLY VERIFIED:** CI hospedado del HEAD inicial según evidencia conservada
  y confirmación del usuario; no hay evidencia externa nueva para estas ediciones.
- **PENDING:** el operador debe proponer/aprobar direcciones públicas aisladas y
  método de custodia. Crear identidades requiere autorización previa; no se solicita
  acceso a claves. Después faltan build revisado de esa identidad, integración de
  firma en wallet, manifiesto exacto de operaciones/costes Devnet y autorizaciones
  explícitas antes de simulación y firma. Nunca ejecutar los scripts legacy con
  keypairs para completar este rehearsal. No hubo RPC, wallet, simulación, firma,
  creación de identidad ni despliegue en esta continuación.

Revisión previa a publicación: revisado el diff completo de los cinco archivos;
alineadas también las frases antiguas de DEPLOYMENT_PROCEDURE sobre releases
repetidos y el requisito impreso de aprobación previa a simulación con wallet.
Reejecutados únicamente los 3 tests de rehearsal, tsc --noEmit y la comprobación
automatizada de plantilla null/error CLI esperado; todos pasan. Sin builds pesados.
La publicación en master está autorizada por el usuario; el resultado del nuevo
workflow debe verificarse contra el SHA del commit publicado.

## Rehearsal build sin claves — siguiente tanda

- **IMPLEMENTED:** `npm run build:rehearsal -- --program-id <ID público>` prepara
  una copia nueva y `--build --platform-tools <directorio instalado>` compila offline
  con Cargo SBF directo y llvm-objcopy. No usa cargo build-sbf, Anchor, wallets ni
  tests VM con signers. Falta de ID/identidades protegidas fallan antes de copiar.
  `--verify <workspace>` verifica fuentes, IDL adaptado, ELF, identidad y hashes;
  manifiestos incompletos/fallidos no pasan. La documentación detalla sus límites.
- **SECURITY FINDINGS:** Agave 3.1.10 build-sbf genera un keypair si falta: se evitó
  por completo en la ruta nueva. Root Anchor.toml conserva wallet por defecto y
  direcciones históricas/de release; no se copia ni usa en esta ruta. Los siete
  mutadores históricos cargaban claves al arrancar: ahora requieren opt-in explícito
  antes de esa lectura y comprueban programa/mint/genesis antes de operar. Siguen
  siendo herramientas legacy con signers JSON, no integración wallet para rehearsal.
  Un ID público o genesis RPC no demuestra custodia exclusiva ni atestación independiente.
- **TESTED:** 10 regresiones Python del builder y guardas de scripts; 1 regresión
  del build histórico; 8 tests TypeScript del cliente histórico; 3 del rehearsal;
  tsc --noEmit, check-public y diff check. Compilación local única con fixture público
  fijo (sin identidad/keypair creado), platform-tools v1.52, completada en 1m15s.
  SHA-256 ELF: e932987ffdb686dcffd3563ca2bbccdfcf51dc89debefb6d6cb046e5f5bf7ecb.
  Manifiesto: 9f78de101708a4895aa1bb6d23f0cdef8ddd71898e95e12a76b5117dbc1f2be5.
  Evidencia ignorada: target/rehearsal-builds/YMN9Qj5jPNp7j14VPcML1B6xGgcPWVZUGLFU3Mnyfaf-w76xispf.
  Verificación local pasó y no hay archivos keypair en ese workspace. El resultado
  se marca built-not-runtime-verified, nunca como deployment/ensayo firmado.
- **EXTERNALLY VERIFIED:** al revisar esta tanda, el run 36537577277 de 88557dc
  seguía en progreso. Su resultado no acredita estas nuevas ediciones; comprobar
  el run del nuevo commit después del push. No se repitieron RC/reproducción/clean.
- **PENDING:** ID/mint y autoridades públicas aprobados; build para ese ID real,
  revisión independiente/runtime y ProgramData desplegado; integración wallet y
  aprobaciones humanas separadas. La plantilla rehearsal sigue null. No se crearon
  identidades, mints ni cuentas; no hubo despliegue, wallet, simulación, firma,
  envío, uso de SOL ni operaciones Mainnet.

Procedimiento y límites completos: docs/REHEARSAL_BUILD.md. El manifiesto no es una
atestación independiente y el IDL se adapta desde evidencia del build release, no
se genera de nuevo. Los compiladores, caché y configuración Cargo local deben ser
confiables. El nuevo binario no está agregado al paquete RC histórico automáticamente.

## Preparación del rehearsal real — 29 septiembre 2026 (Chicago)

- **EXTERNALLY VERIFIED: success** para
  `bdbf93588d6f4346f4cce18d043f2abc4ddf59dd`, workflow `36539185798`:
  completed/success; validate (first), validate (second), compare success.
  Consultado en GitHub en esta conversación y confirmado por el usuario. No se
  reetiquetan los informes locales antiguos ni se acredita con ello un HEAD nuevo.
- **IMPLEMENTED:** docs/ISOLATED_REHEARSAL_RUNBOOK.md concreta custodia/identidad,
  build y pins públicos, cada transacción de deploy/setup/vesting, ficha obligatoria
  de operación/coste/roles/reversibilidad/evidencia y aprobación no transferible.
  Incluye releases repetidos según tiempo real, conservación y formato del reporte.
  prepare:rehearsal ahora rechaza direcciones protegidas en TODOS los roles,
  beneficiarios de producción, mint de producción configurado y colisiones entre
  programa/mint/signers; expone authority y beneficiary en su salida pública.
  rehearsal-rent.ts fija endpoint Devnet, prohíbe redirects y métodos fuera de
  getGenesisHash/getMinimumBalanceForRentExemption, comprueba genesis antes/después
  y calcula rent pico conservador. No usa CLI ni wallets, ni simula/envía/airdrop.
- **TESTED:** 4 tests offline de plan/ABI + 4 de rent/transporte; 10 tests Python
  del builder con compilador mock; tsc --noEmit. Plantilla null rechazada con código
  1. Verificado el workspace fixture existente con --verify (sin build): mismo ELF
  e932987ffdb686dcffd3563ca2bbccdfcf51dc89debefb6d6cb046e5f5bf7ecb.
  El fixture no es una identidad de deploy ni prueba runtime del candidato real.
- **RPC READ ONLY:** 2026-09-30T00:20:53.083Z, genesis Devnet completo correcto;
  ELF fixture 232528 bytes, capacidad supuesta 232528, loader v3. Rent consultado:
  program 833120, ProgramData 1182121080, buffer 1182080440, mint 1066800,
  source/destination/vault 1488440 cada uno, vesting 1386840 lamports.
  Rent pico 2371953600 lamports = 2.371953600 SOL Devnet, sin descontar refunds.
  NO es presupuesto final: falta ELF real, mensajes exactos, fees y cap aprobado.
- **SECURITY FINDINGS:** el plan anterior no bloqueaba identidades protegidas
  intercambiadas entre roles; corregido. No se afirma exclusividad/custodia solo
  por public key. Root Anchor/legacy siguen fuera del recorrido; no se ejecutaron.
  Deployer automático que firme múltiples mensajes sin paradas queda prohibido.
  La integración de custodia/firma y validación de receipts reales sigue pendiente;
  no hay executor de este runbook habilitado. No se leyó ningún secreto, creó
  identidad/mint/cuenta, firmó, simuló con wallet, desplegó ni envió transacciones.
- **READY FOR DEVNET REHEARSAL:** preparación disponible; ejecución NO habilitada.
- **REQUIRES MY APPROVAL:** siguiente paso es crear UNA identidad exclusiva del
  programa en custodia externa del operador, etiqueta PAPA/Devnet rehearsal/program,
  nunca archivo keypair local. Proveedor/dispositivo pendiente de selección explícita.
  Crear identidad offline cuesta 0 SOL; solo su public key irá a rehearsal-plan.
  Después: build aislado para ese ID y verificación ELF/IDL/manifiesto, sin deploy.
- **PENDING:** identidad/custodia y roles públicos, mint de prueba, build real,
  integración externa revisada con paradas por mensaje, estado/fees/caps actuales,
  aprobaciones individuales y evidencia/reporte del lifecycle real. Publicar esta
  tanda y registrar el run nuevo sin esperar que finalice. No repetir auditoría,
  RC/reproducción/clean ni builds pesados para estas modificaciones TypeScript/docs.

## Punto de aprobación: identidad local aislada (CI 36650609233 verde)

- EXTERNALLY VERIFIED: success para 19d8bf926c6117b12d345a91079b760e6ceb57f4.
  GitHub run 36650609233 completed/success; validate (first), validate (second)
  y compare completed/success, consultados antes de continuar. Master y HEAD
  coinciden; árbol inicialmente limpio. No se repitieron tests ni builds.
- La instrucción nueva del usuario permite PREPARAR un archivo de identidad local
  aislado, sustituyendo para este paso la propuesta anterior de custodia externa.
  Su generación todavía exige aprobación explícita; NO se ha ejecutado.
- Preparados únicamente directorios privados (0700) y configuración CLI pública
  (0600), bajo /home/antony/popecoin_vesting/target/rehearsal-private/papa-devnet-19d8bf9/.
  cli-config.yml fija RPC https://api.devnet.solana.com y ruta explícita del futuro
  program-keypair.json. Sin fallback a ~/.config/solana/id.json. Padres revisados
  sin symlinks. Archivo keypair ausente; git check-ignore confirma exclusión por
  target y git ls-files no contiene esta ruta. No incluirla en evidencia/paquetes.
- Herramienta instalada: solana-keygen 3.1.10, binario resuelto explícito abajo.
  --silent documenta supresión de seed phrase; stdout/stderr se descartan además.
  umask 077 restringe permisos; sin --force, no se autoriza sobrescribir.
- Comando PROPUESTO, NO EJECUTADO; requiere aprobación individual del usuario:

```sh
umask 077
/home/antony/.local/share/solana/install/releases/3.1.10/solana-release/bin/solana-keygen new --config /home/antony/popecoin_vesting/target/rehearsal-private/papa-devnet-19d8bf9/cli-config.yml --silent --no-bip39-passphrase --outfile /home/antony/popecoin_vesting/target/rehearsal-private/papa-devnet-19d8bf9/program-keypair.json >/dev/null 2>&1
```

- Propósito: identidad NUEVA solo para Program ID del rehearsal Devnet, no payer,
  no identidad histórica/producción. Generación local cuesta 0 SOL y no hace RPC,
  no firma ni envía, no crea cuentas ni toca Mainnet. El archivo no se agregará a Git.
  Se almacena sin passphrase BIP39, protegido por permisos locales: nunca abrir,
  mostrar, copiar ni exportar su contenido. No es una propuesta de custodia Mainnet.
- Tras aprobación: revalidar ruta/permisos/ausencia del archivo; generar una vez,
  obtener solo public key mediante herramienta, rechazar igualdad con IDs protegidos
  antes de configurar/build. No es posible comparar una dirección aún inexistente.
  Si falla generación, detenerse sin imprimir archivos ni logs secretos.
- Después: build:rehearsal para la public key aprobada, ELF/IDL/manifiesto/hashes y
  pruebas necesarias. PARAR antes del deploy con genesis/fees/comando exacto;
  cada operación posterior requiere aprobación separada. No hay autorización actual
  de generación, deploy, mint, airdrop, simulación con wallet ni transacciones.
- Pendientes: ciclo Devnet real y evidencia; metadata/URI/supply/allocations/fecha,
  autoridades/custodia, revisión independiente y checklist producción. No declarar
  listo para Mainnet. Este cambio documental está sin commit al detenerse.

## Identidad creada con aprobación expresa y candidato construido — parada pre-deploy

La autorización posterior del usuario permitió ejecutar exclusivamente el comando
solana-keygen new registrado arriba. Se ejecutó una vez, exit 0, stdout/stderr
suprimidos. El archivo tiene permisos 0600, directorios 0700, Git lo ignora por
`target`. No se mostró ni copió contenido privado; solana-keygen pubkey produjo
únicamente la dirección pública. No volver a generar/sobrescribir esta identidad.

- Program ID: `6nLZrtmi9Uf3E3kJjGY9Po4KqNhvLDQqQAax5UKMAGVk`.
- Rechazo comprobado frente a release, programa/mint históricos, beneficiarios de
  producción y fixture previo; dirección on-curve. Mint de producción sigue null.
- Solo `program` en config/rehearsal-plan.json se completó; demás campos siguen null.
- Build offline con platform-tools v1.52, sin build-sbf, Anchor, nuevas identidades
  ni operaciones de red. Workspace:
  `target/rehearsal-builds/6nLZrtmi9Uf3E3kJjGY9Po4KqNhvLDQqQAax5UKMAGVk-eadtrh7r`.
- ELF: 232640 bytes;
  SHA-256 `034d073f1d400f27e941525f9b18406bd643374c69d22903aac3af52ad085061`.
- IDL SHA-256 `2524801c5c4cfd81405c5c534eddd0e2bb251bc5afc9f29f62520c51a91ad95f`.
- Manifest SHA-256 `5366c6012833ff968a3822ba6030d9f420cd331a4e8eba9008cfdeae9457babd`.
- --verify pasó: fuentes, identidad, ELF y hashes; IDL comparado estructuralmente
  con release y solo address difiere. Estado built-not-runtime-verified: no ejecución
  SBF del lifecycle para este ID ni deployment. No confundir con CI del binario nuevo.
- Tests directamente relacionados: 10 Python del builder y 4 TypeScript plan/ABI,
  todos passed. Sin tests que generen otros signers ni builds históricos/release.
- ProgramData PDA derivada offline:
  `3XmkEz8dhj5AkbPb1oMkyPEfnbtkiUaHc81awxdfh6Zm` (no cuenta creada).
  PDAs/ATAs de vesting pendientes de mint/beneficiary; no inventarlos.
- RPC SOLO LECTURA a https://api.devnet.solana.com, 2026-09-30T01:06:36.491Z:
  genesis `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG` comprobado antes/después.
  Capacidad considerada 232640 bytes: rent pico programa+ProgramData+buffer
  2366172560 lamports = 2.366172560 SOL Devnet, sin descontar devoluciones.
  Incluyendo cuentas del ensayo: 2.373091520 SOL Devnet. NO incluye fees ni es
  cap máximo total: mensajes exactos, payer y presupuesto siguen pendientes.
- Evidencia SOLO PÚBLICA, ignorada localmente:
  `target/rehearsal-evidence/19d8bf9-6nLZrtmi/` contiene candidate.json,
  build-manifest.json, rent.json, SHA256SUMS. No hay claves ni copias de claves allí.
- EXTERNALLY VERIFIED: success sigue correspondiendo exclusivamente al commit
  19d8bf926c6117b12d345a91079b760e6ceb57f4/run 36650609233. El binario de esta
  identidad está verificado localmente; no se atribuye al workflow anterior.

**PARADA:** no deploy, mint, cuentas, airdrop, wallet simulation, firma ni envío.
Se pidieron únicamente las public keys del payer y upgrade authority, pendientes.
Falta identidad de buffer y flujo de despliegue revisado por transacción. La ayuda
local de Agave confirma buffer aleatorio por defecto y envío/re-firma automático
con program deploy: NO es un comando compatible con aprobación individual por tx.
No emitir un comando con fallback a la wallet global ni inventar un coste máximo.
El comando exacto de deploy y cap final están bloqueados hasta esas decisiones y
la preparación de mensajes revisables. Cada identidad nueva necesita autorización;
la autorización usada NO habilita crear payer/buffer/mint/beneficiary.

Siguiente paso: resolver roles/custodia públicos y preparador por transacción,
preservando el ELF/hash ya construido. Antes de cualquier deploy presentar mensaje
exacto, signers, genesis, coste máximo y aprobación individual. No repetir el build
si fuentes/ID/artefactos no cambian. Sin nuevo commit/push: config pública y handoff
modificados sobre master 19d8bf9; no tocar ni agregar el archivo privado.

## Plan pendiente de aprobación: payer y upgrade authority aislados

Revisado el working tree: se conservan los cambios públicos de handoff y
config/rehearsal-plan.json. Sin commit, sin pérdida de cambios. Los tres hashes
ELF/IDL/manifiesto del candidato 6nLZrtmi... coinciden; no se modificó ni recompiló.

Propuestos, todavía AUSENTES y NO GENERADOS, bajo el directorio existente 0700
/home/antony/popecoin_vesting/target/rehearsal-private/papa-devnet-19d8bf9/:
- payer-keypair.json: payer exclusivo para fees/rent SOL Devnet.
- upgrade-authority-keypair.json: autoridad exclusiva del programa Devnet;
  puede ser también buffer authority, sin generar otra autoridad para escrituras.
Ambos se crearían 0600 mediante umask 077, solana-keygen 3.1.10 --silent
--no-bip39-passphrase, --config cli-config.yml explícito, --outfile explícito,
sin --force y stdout/stderr a /dev/null. Rutas sin symlinks; git check-ignore
confirma exclusión por target. Generación local 0 SOL; no RPC, wallet global ni
Mainnet. Debe revalidarse ausencia/permisos inmediatamente antes de generar.
Cada creación necesita autorización expresa; no ejecutar todavía.

No es requisito del loader que payer y upgrade authority sean distintos: una
única identidad NUEVA y exclusiva puede desempeñar ambos roles. Reduce un secreto
y firmas cuando coinciden, manteniendo aislamiento de histórico/global/producción,
pero concentra gasto y control del programa; no ofrece separación de funciones.
Se proponen dos conforme a la petición actual. No copiar el mismo keypair a dos
archivos si el usuario prefiere un solo rol compartido; usar la misma public key.

Deploy: no usar solana program deploy ni write-buffer, ambos automatizan múltiples
mensajes/envíos. Preparar un executor con una única transacción por invocación,
separando preparación pública de firma/envío y sin avance/reintento automático:
(1) CreateAccount buffer + InitializeBuffer atómicos, con authority=upgrade authority;
(2) Write de cada fragmento del ELF fijado por hash, aprobación independiente por tx;
(3) verificar buffer completo por lectura/hash;
(4) CreateAccount program + DeployWithMaxDataLen atómicos, aprobación independiente;
(5) verificar ProgramData/owner/authority/ELF por lectura. Buffer identity aún no
existe: su eventual creación requiere otra autorización; ninguna se genera ahora.
Plan contrastado con solana-loader-v3-interface 6.1.1 local, instruction.rs,
create_buffer/write/deploy_with_max_program_len, y CLI Agave v3.1.10.
No usar BpfLoader legacy como sustituto del loader upgradeable.

Antes de cada simulación/firma/envío: comprobar genesis, hashes, estado, signers,
importe, max fee/rent, blockhash/expiración y mensaje exacto. Aprobación individual
atada al hash del mensaje; cualquier cambio obliga a nueva aprobación. Expiración
no autoriza re-firma. Ante envío incierto, consultar firma antes de reintentar.
El executor aún NO está implementado/validado: este es su diseño, no autorización.
La carga implica muchos fragmentos y aprobaciones; no agrupar autorizaciones por
comodidad. No hubo creación de claves, buffer/cuentas, airdrop, firmas ni envíos
en esta tanda. Siguiente acción: presentar comandos y esperar aprobación.

## Payer y upgrade authority creados — esperando aprobación de financiación

El usuario autorizó los DOS comandos exactos de creación propuestos. Ejecutados
una vez cada uno, exit 0, sin salida privada. Permisos de ambos archivos 0600;
directorio 0700. Git ignora ambos; git ls-files no contiene la ruta privada.
Se obtuvieron únicamente public keys mediante solana-keygen pubkey:
- payer: 4nt7G7nXvBNvygsDjn4zS9vQCR1Zgn1GTpyh8Snh5N7m
- upgrade authority: EcWN9K2zyrXfUnbji8WyUmRwhezGcqvtSGnBB1yixjYb

Ambas on-curve, diferentes entre sí y del program, y distintas de release,
programa/mint históricos, allocations protegidas y fixture. Solo el payer se
completó en rehearsal-plan; authority/beneficiary/mint siguen null. Nuevo archivo
público config/rehearsal-deployment.json conserva roles, hashes, cluster/genesis y
buffer/cap pendientes. No se modificó ni recompiló el ELF/IDL/manifiesto.

Próxima operación PROPUESTA, NO AUTORIZADA/NO EJECUTADA: requestAirdrop de 2 SOL
Devnet para el payer, coste del solicitante 0 SOL, sin claves ni firmas locales.
Ficha y comando exacto en docs/REHEARSAL_NEXT_APPROVAL.md. Revalidar genesis y saldo
antes de actuar; cualquier complemento requiere aprobación aparte. Dos SOL no
cubren la estimación conservadora previa de rent pico; no confundir financiación
con autorización de gasto. No hubo airdrop, buffer, cuenta, simulación, firma,
transacción ni deploy. No se accedió a wallet global ni se usó Mainnet.

El airdrop único autorizado devolvió RPC -32603 Internal error, sin firma; saldo
confirmado antes/después 0 SOL. No repetirlo ni usar faucet alterno sin nueva orden.

## Planner unsigned por transacción — continuación posterior

Se añadió `scripts/rehearsal-one-tx.ts` / `npm run prepare:rehearsal-tx`. Es
deliberadamente solo preparador: un unsigned Transaction serializado por invocación,
sin import de Keypair, rutas de signer, simulate ni send. Usa Connection a endpoint
Devnet hardcoded, valida genesis antes/después, fee/blockhash/rent/balance por RPC
readonly y devuelve el hash exacto de mensaje, signers, costes y datos unsigned.
Fail-closed ante config/endpoints/genesis/hash/ELF/IDL/rent/fee/cuenta/signers
incorrectos; no usa Solana CLI config ni env URL. El CI 36650609233 solo verifica
19d8bf9 anterior, no este planner ni el ELF vía hosted build.

Buffer: no requiere una tercera identidad. Address determinista con
`PublicKey.createWithSeed(payer, seed_public, BPF_UPGRADEABLE_LOADER_ID)`, crear
con `SystemProgram.createAccountWithSeed` y authority = upgrade authority. Solo
buffer-create inicializa en una transacción unsigned; buffer-write prepara un
fragmento <=650 bytes y exige el prefijo del buffer exacto; se ejecuta una llamada
manual por fragmento y nunca un loop. Buffer-verify comprueba state/owner/authority,
ELF completo y zero padding. Program-deploy exige Program/ProgramData ausentes y
buffer completo; prepara CreateAccount(program)+DeployWithMaxDataLen atómicos.
Program-verify consulta Program y ProgramData y compara dirección, owner, executable,
authority, ELF bytewise/hash y padding. Agave source confirma que el loader usa el
rent del buffer para reembolsar al payer y luego cobra ProgramData; planner suma
rent de buffer y de Program + ProgramData + fee conservadoramente.

Documentado en docs/REHEARSAL_ONE_TX.md, con comandos de continuación. Todavía NO
hay submitter; cada unsigned mensaje necesita custodia wallet externa, revisión y
aprobación individual. Program CLI no se usará porque envía varias transacciones.
La derivación del buffer no crea una cuenta. La eventual llamada buffer-create sí
es on-chain y está pendiente de aprobación.

**Tests locales relacionados:** 11 suites en `tests/rehearsal-one-tx.test.ts`
(fixtures/mock RPC y datos sintéticos); sin signers ni keypairs. Revisan one-message,
signers/loader encodings, orden, packet limit, fail-closed network/candidate/cost,
buffer y ProgramData verificaciones. TypeScript `tsc --noEmit` pasó al añadir
planner; volver a correr tras cambios finales. No build Rust/SBF/ELF.

Working tree público: handoff, config/rehearsal-plan, config/rehearsal-deployment,
docs/REHEARSAL_NEXT_APPROVAL y docs/REHEARSAL_ONE_TX, package.json, nuevo script,
tests/run.ts y test planner. Revisar diff completo y correr solo tsc, tests cliente
relevantes, diff check, check-public y búsqueda de filenames secretos; después commit
y push autorizados antes. `target/` (evidencia y keypairs privados) ignorado. No
incluir/abrir los keypairs. No airdrop, buffer, mint, cuenta, firma, simulación,
envío, deploy ni Mainnet. No tests/CI nuevos pueden verificar lifecycle on-chain.

**Pendiente principal:** construir preparadores SPL one-tx para mint init/ATAs/
mintToChecked y estado precondición; adaptar initialize/deposit/release a transacción
individual tras completar valores públicos restantes. El plan existente cubre ABI y
PDAs unsigned, pero aún no es un executor/signer ni lifecycle completo. Mantener el
mint/authority/beneficiary/amount/schedule null hasta decisión explícita. El payer
sigue con 0 SOL.

## Estado local después de preparar planner one-tx

Resultado tests de cliente tras el planner/config de seed pinned: `npm run test:client`
51/51 PASS. TypeScript `tsc --noEmit` PASS; test específico del planner 11/11 PASS.
`check-public.py`: PASS 121 ficheros en su última ejecución (antes de añadir solo
código/docs públicos adicionales; volver a ejecutar final). `git diff --check` PASS.
Cambios actuales pendientes de commit: handoff, config/rehearsal-plan,
config/rehearsal-deployment, package script, tests/run, test nuevo,
script one-tx, docs REHEARSAL_NEXT_APPROVAL reescrito tras rechazo y nuevo
REHEARSAL_ONE_TX.md.

La última prueba unitaria usa PublicKey/Transaction y mock RPC, nunca lee archivos
keypair. Último airdrop falló -32603 y no se volvió a llamar. Sin buffer/cuentas/
mint/signature/simulación/envío/deploy. No candidato/build/test Rust modificado.
Candidato ELF/IDL/manifiesto debe conservar hashes del handoff. CI 36650609233 solo
verifica commit 19d8bf9 anterior; no atribuir cobertura externa al cambio actual.
Antes de commit: revisar diff completo, check-public, nombres tracked secretos,
exclusión target keypairs, diff check y tests relevant. Commit/push ya autorizados en
la solicitud actual. Tras push consultar ID nuevo de workflow sin esperar; no llamar
EXTERNALLY VERIFIED hasta success.

Pendiente explícito: no hay submitter para mensajes unsigned/signed, ni planner de
estado vesting en transacciones individuales. El preparador SPL se añadió después,
según la sección más reciente debajo. El plan `prepare:rehearsal` sigue siendo ABI
offline únicamente. No repetir el airdrop rechazado; payer 0 SOL. Ninguna operación
irreversible queda autorizada por CI/test/documentación.
Coda / continuación 2026-09-29: consultado una sola vez workflow 36663891675,
SHA `44652e592fc75c9b5206e6824a5f2aaeb263edc6`; completed/failure. Ambos jobs
`validate (first)` y `validate (second)` fallaron en step “Validate local release
candidate and isolated Devnet build”; `compare` quedó skipped. No consultar de nuevo
en esta sesión según la instrucción. No declarar este SHA EXTERNALLY VERIFIED. El
detalle interno del step no se recuperó; debe revisarse en la próxima sesión antes
de afirmar que el fallo es causado o resuelto por cambios posteriores.

Se añade `scripts/rehearsal-spl-one-tx.ts` (y `npm run prepare:rehearsal-spl`),
planner clásico SPL que prepara exactamente un mensaje unsigned por invocación:
mint account + InitializeMint2 (decimals 6, authority configurada, freeze authority
nula), una ATA idempotente, o MintToChecked únicamente si supply aún es cero. Incluye
verificadores read-only de mint/ATAs. Endpoints/genesis Devnet fijos; rechaza mint,
programa, roles y allocations protegidos, roles duplicados, cantidad inválida,
cuenta existente inesperada, estado incompatible y endpoint/genesis incorrectos.
No importa ni lee keypairs; no firma, simula ni envía. Los tests usan direcciones
públicas fixture/estado mock, nunca identidades privadas.

Config `config/rehearsal-plan.json` deja mint/authority/beneficiary null, por lo que
la CLI fallará cerrado hasta que el operador apruebe/especifique esas direcciones.
No se generó clave/mint ni cuenta; airdrop no repetido. El payer quedó en 0 SOL
tras el único requestAirdrop anterior fallido (-32603); detenerse ante cualquier
necesidad de financiación y solicitar autorización por separado.

Pendiente deliberado (no hay código parcial): planificador unsigned de vesting
initialize/deposit/release, control de pre-cliff cuya ventana de inclusión no cruce
cliff, releases parciales/repetidos/final según chain clock, lecturas coherentes
por slot de state Anchor y SPL source/vault/beneficiary/supply, reconciliación final
y reporte. `prepare-rehearsal.ts` solo genera instrucciones offline y no valida
cuentas/clock ni debe presentarse como esos preparadores. Ver `docs/REHEARSAL_SPL_ONE_TX.md`.

Validación de esta tanda: `tests/rehearsal-spl-one-tx.test.ts` 7/7; `tsc --noEmit`,
`npm run test:client` 58/58, `scripts/check-public.py` PASS (124 ficheros),
`git diff --check` PASS. Ningún build Rust/SBF ni operación Devnet. Debe ejecutarse
el control externo del nuevo SHA y diagnosticar por separado el fallo previo del
workflow 36663891675 antes de tratar CI como verde.

## Diagnóstico y corrección del CI 36663891675

Logs de ambos jobs leídos una vez por API de Actions. Causa idéntica en first y
second: `npm run check:rc` llegó a `npm run check`, el cual reportó 51 client tests,
43 pass / 8 fail. Los ocho fallos de `tests/rehearsal-one-tx.test.ts` daban
`ENOENT` para `target/rehearsal-builds`; en el test de buffer seed, ese mismo
`ENOENT` además violaba la aserción esperada sobre el seed. Ese path está ignorado
y no forma parte del checkout limpio de Actions. Los tests acoplaban planner/mock
tests al output local creado por build:rehearsal. `check:rc` detuvo la secuencia
en `npm run check`; no alcanzó el comando posterior `npm run build:devnet`.

Clasificación: defecto real de aislamiento de los tests del rehearsal tooling,
expuesto por el entorno limpio de CI. No fue Rust/programa, toolchain/dependencia,
ni un mismatch del ELF. No alterar ni suprimir gates.

Corrección en código: `findCandidate` recibe un root explícito opcional y aplica el
mismo pin de manifest/ELF/IDL hashes, estado, IDL Program ID y rechazo de symlinks.
Tests construyen fixture sintético en un tempdir, fijan hashes a ese fixture y lo
inyectan a las funciones; no requieren `target/`, ELF real ni keypairs. CLI y uso
ordinario mantienen su root fijo `target/rehearsal-builds`; sigue fallando cerrado
si no existe candidato real.

También se añadió planner unsigned lifecycle en `scripts/rehearsal-vesting-one-tx.ts`:
initialize (PDA/vault ausentes, supply/source exactos, destination 0), deposit (vault
0, full source, released 0), release-precliff (zero vested y cliff a >=1800s del chain
time observado), partial/repeated (accrual positivo y >300s antes de end), final
(end alcanzado). Cada llamada arma a lo sumo un transaction con una instrucción;
fee, rent, balance, blockhash expiry, mensaje hash y firmantes informados. Release
programa no codifica amount; `expectedAmountAtSnapshot` es estimación porque Anchor
lee Clock al incluir. Snapshots verifican Program/ProgramData ELF/authority local-
on-chain, mint/ATAs/vault/vesting del mismo RPC slot + block time. Reconciliation
final exige source/vault=0, beneficiary=supply=total, released=total, shortfall=0.
No signer/simulate/send. Inputs rehearsal siguen null y CLI falla cerrado.

Verificación local completada: planner de deploy 11/11, planner vesting 7/7,
`npm run test:client` 65/65, `tsc --noEmit`, check-public PASS (127 ficheros), diff
check PASS, búsqueda de filenames de credenciales tracked sin matches. Sin build
Rust/SBF ni operación Devnet. No repetir `check:rc` entero: incluye builds pesados
innecesarios para esta causa de test fixture.

Payer balance permanece 0 SOL tras el único airdrop fallido (-32603); no hubo retry.
El nuevo SHA y run ID se registran después de commit/push de esta corrección; nunca
marcarlo EXTERNALLY VERIFIED hasta que todas las validaciones del workflow terminen
success. Si el run está activo, no hacer polling. No hay aprobación de firma, envío,
cuenta, mint, buffer o deploy.


## ROBUSTO — recuperación persistida 2026-10-03 (prioridad sobre estados anteriores)

Marca pública ROBUSTO / $ROBUSTO; nombres técnicos y metadata PAPA históricos intactos.
Entrada actual: docs/ROBUSTO_STATUS.md. Evidencia pública: docs/evidence/robusto/RECOVERY_2026-10-03.md y JSON RPC asociado.

Devnet genesis EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG. Programa 6nLZrtmi9Uf3E3kJjGY9Po4KqNhvLDQqQAax5UKMAGVk; mint CfHGrav3zjZyAEdspKwdBGW3yBHYkiz6cYpeeQXoujvo.
Release 2BBYKsCEPVcbgi76YEBy2782xWhrXAqt55rbPT6PHYgeJXQUKZuZ14SKJWe1m8WxBdryBZCCFret8UXzSjkKCguB FINALIZED, slot 506267233, fee 10000 lamports. No repetir.
Snapshot finalized actual slot 507030325: supply=total=released=10000000 base units (=10 tokens, decimals 6), vault=source=0, beneficiary=10000000. Payer 6305902880 lamports.
El antiguo handoff de preparación y payer=0 quedó obsoleto; configuración histórica con null no representa el estado ejecutado por comandos inline anteriores.

Segundo rehearsal: docs/ROBUSTO_REHEARSAL_2.md; config/robusto-rehearsal-2.json. Reutilizar supply mediante retorno SPL autorizado por separado; después nueva identidad de beneficiario y nuevo calendario relativo a chain time. No reinicializar la PDA antigua. Ninguna nueva transacción autorizada en esta sesión; solo lecturas/preparación/simulaciones.
Propuesta producción ROBUSTO separada: config/robusto-production.json, 1B tokens = 1e15 base units, freeze=null, metadata mutable. No mint/programa/custodia/allocations/URIs finales ni autorización Mainnet o revocaciones. Imagen oficial perro negro/gris con cohete pendiente en metadata/robusto/robusto-logo.png; nunca reemplazar PAPA.

Cierre local 2026-10-03: 70/70 client tests y 45/45 Python PASS; tsc, metadata PAPA, check-public y diff-check PASS. Sin recompilar Rust/SBF. Ver docs/evidence/robusto/VALIDATION_2026-10-03.md.
Devolución preparada y simulada UNSIGNED (NO ENVIADA): docs/evidence/robusto/recycle-proposal-2026-10-03T14-51-42-245Z.json, fee=10000 lamports, rent=0, simulación err=null. El blockhash es temporal: revalidar/reconstruir antes de cualquier firma futura. El estado real permanece released=10000000, vault=source=0, beneficiario=10000000, payer=6305902880.
Única próxima autorización solicitada: TransferChecked de 10000000 base units del beneficiario antiguo al source; nada más. Nuevo beneficiario, ATA, Initialize, Deposit y releases siguientes no están autorizados. No mint adicional ni Mainnet.

## Continuación 2026-10-04 UTC / 2026-10-03 Chicago

HEAD inicial real 1706e77 (no 1620a4e); master limpio. Se revalidó RPC: snapshot finalized slot 507243817, mismo release final y balances; payer 6305902880. Evidencia recovery-2026-10-04T04-37-58-731Z.json.
Nueva identidad LOCAL autorizada por el usuario: 57nW7QndCphV2xqjAGR6EDHAAbraqyb7Un8GcgkUastM. Ubicación privada ignorada: target/rehearsal-identities/robusto-second-20261004/beneficiary-keypair.json, directorio 0700 / archivo 0600. NO regenerar ni sobrescribir; no claves en Git/backup público. Direcciones públicas: docs/evidence/robusto/second-beneficiary-public.json. Fecha definitiva sigue null; primera transacción sigue pendiente de autorización.
47 Rust tests PASS usando caché sin rebuild SBF; 71 cliente y 45 Python PASS; tsc PASS. Artefacto histórico/IDL/source hashes verificados offline (verify:release, nombre histórico, no RPC Mainnet). Logs públicos persistidos en docs/evidence/robusto/. Revisión interna: docs/ROBUSTO_SECURITY_REVIEW.md. No auditoría independiente.
Producción status NOT_AUTHORIZED_FOR_MAINNET; roles finales/distribución/custodia/vesting/liquidez/DEX/launchpad/revisión nulos. Logo PENDING_USER_ASSET, sin hash inventado; metadata mutable y update authority separada de mint/upgrade con validación de clave pública.

Evidencia complementaria: docs/evidence/robusto/SESSION_2026-10-04.md. Deploy finalized 2BcNgT5ycdKHNC1CVw4C2vaPLGMNWiNCUNuEMaVG8Fb5H2zuydmTwHFRwZmHcX7jEZ1XU9tF42UmSuN9SLrn6uKe, slot 506212901, fee 15000, verificado por getTransaction. Pre-cliff histórico recuperado de stdout sin comandos/claves. CI 1706e77/run37131484384 completed/success; commits posteriores todavía no cubiertos por ese resultado.
Nueva ATA simulada unsigned (fee5000/rent1488440), retorno simulado unsigned (fee10000/rent0), ambos err=null. Ninguna transacción enviada ni cuenta nueva on-chain. Config conserva startUtc=null; preview no es aprobación ni calendario definitivo. El lector web conserva PAPA para balances históricos. Actualizar metadata no equivale a mint adicional.


## Retorno autorizado FINALIZED — 2026-10-04

Se envió exactamente UNA TransferChecked con autorización explícita. Signature `u7vR528ZtF1TWFQJVLE43LXjpygxCf8RDFk6BrfxwDizCejK5ZgH9WAvSbCWdxza2f7LDqwEbWzBCzCaG7sAZqZ`, slot 507256074, fee 10000 lamports. Evidencia completa: docs/evidence/robusto/authorized-return-2026-10-04.json. Firma persistida con fsync antes del único envío (maxRetries=0); sin reenvío.

Checkpoint posterior: beneficiario histórico ATA=0, source ATA=10000000, supply=10000000; released histórico=10000000, vault histórico=0. Payer=6305892880 lamports. Hashes de datos/owners/lamports de mint, vesting, vault, ProgramData y ausencia de metadata idénticos antes/después. No cambios de autoridades ni nuevo mint/metadata.

NO repetir ni release final ni devolución. `robusto:recover`/`prepareRecycle` conservan las precondiciones del checkpoint ANTERIOR a devolución y ahora fallarán cerrado por balances; no interpretar eso como transferencia fallida ni forzar su reconciliación anterior. Leer el snapshot sin reconciliación antigua para futuras consultas. Siguiente operación pendiente de nueva autorización: creación de ATA del nuevo beneficiario, no Initialize ni Deposit.


## ATA nueva autorizada FINALIZED — 2026-10-04

Exactamente UNA creación ATA idempotente, firmante único payer. Signature 5idh6a8v4jR1eTx5EJsRCPq4ZeVmDMR7SDnDbv6xEVTfQoPNkUC9jPnxX8mCKot2sDR9k34CHzB4FLXS9Y7DUcMc, slot 507259224; fee=5000, rent=1488440, débito total=1493440 lamports verificado en transacción. Evidencia docs/evidence/robusto/authorized-ata-2026-10-04.json.
ATA BCnjcusd1Vxzzda9tKoYog75tvdirNHHABN83smb6wuq existe, SPL Token clásico, token owner 57nW7QndCphV2xqjAGR6EDHAAbraqyb7Un8GcgkUastM, mint CfHGrav3zjZyAEdspKwdBGW3yBHYkiz6cYpeeQXoujvo, saldo0. Supply=source=10000000. Payer=6304399440 lamports. Mint/autoridades/ProgramData/metadata/vesting histórico invariantes por hashes. Nueva PDA/vault aún ausentes.
No repetir creación ATA ni retorno previo. No Initialize/Deposit/release autorizado. Próxima única autorización: Initialize nueva PDA/vault, con calendario relativo a chain time fresco para conservar ventana pre-cliff. Config startUtc permanece null hasta autorización.


## Segundo Initialize FINALIZED — 2026-10-04

Signature 5XH3ea3kgusAGTq61y26uuBdos8nkbc2q3zVv8TxiHugpxGSN6uyftmYDBhZ2bpcxVscS2vwf4GvozFsrNWgC43d, slot 507359680. Fee15000; rent2875280 (vesting1386840+vault1488440); coste2890280. Payer6301509160 lamports. Registro completo docs/evidence/robusto/authorized-initialize-second-2026-10-04.json. Un primer intento de lecturas recibió429 ANTES de firma/envío y sin journal; consultas posteriores espaciadas. Solo un envío, firma persistida antes del envío y no reenviada.
Nueva PDA 7VYZB6pAfB1oa4NtyJUxMPQqsukWYrKbNSPCMuDdMYbm creada; vault 4PYiXXdTtm8eJbocqZd2szg5H1xdnacq55tbuWdgXETZ creado/vacío. Total10000000, released0, source10000000, beneficiario nuevo0, supply10000000. Históricos/autoridades/metadata intactos por hashes.
Calendario definitivo UTC: inicio 2026-10-04T12:50:16Z, cliff 2026-10-04T12:51:16Z, final 2026-10-04T13:50:16Z. Se persistió startUtc real en config/robusto-rehearsal-2.json. NO recalcular calendario de esta PDA ni repetir Initialize.
Siguiente única autorización pendiente: Deposit10000000 desde source a nuevo vault. No Deposit ni release enviados/autorizados. Revalidar ventana pre-cliff antes de futuros pasos; no fingir prueba temporal si expira.

## ROBUSTO — revisión de dependencias Meteora, 2026-10-07 UTC

Reanudar desde docs/ROBUSTO_METEORA_DEPENDENCY_REVIEW.md y docs/evidence/robusto/meteora-dependency-review.json. Clasificación técnica CONDITIONALLY_ACCEPTABLE_FOR_NEXT_REHEARSAL, limitada a fuente oficial cp-amm 0.2.4 a85c926607433f23f0ea60f4ca7b1ae92f4156cb y perfil concentrado OnlyB/fijo. La auditoría upstream mantiene tres vulnerabilidades/siete warnings; no hay parche ni suppressions. Correspondencia binaria pública verificada por dos getAccountInfo finalized en slots 454063661/454063708; programa upgradeable, repetir verificación antes de nuevas etapas. Ninguna nueva rehearsal está autorizada: no usar ejecutores históricos, identidades ni RPC transaccionales. Autorización local anterior expirada; Mainnet deshabilitado y tercer rehearsal Devnet sin cambios. Tools de esta tanda son exclusivamente aritmética host y verificación offline de bytes públicos.


## Rehearsal final Meteora — 2026-10-07 UTC

Consultar docs/ROBUSTO_METEORA_FINAL_REHEARSAL.md y evidencia meteora-final-*.json. PASSED_FINAL_LOCAL_REHEARSAL / PRODUCTION_REVIEW_PENDING: 26 transacciones locales exitosas y 10 del intento inicial documentado, 27 negativos, 15 swaps iguales al oracle entero. Fuente/binario público revisados sin cambios; Devnet oficial existe pero binario distinto NOT_VERIFIED, por ello se usó local aislado. Tres vulnerabilidades/siete warnings upstream siguen visibles. No READY_FOR_MAINNET. Autoridad/metadata/locks intactos; authorization local terminada y validator detenido. Ejecutores históricos deshabilitados; próxima ejecución exige nueva autorización y preflight fresco. No reutilizar claves temporales ni global keypair. Backup público excluye keys/ledgers. Decisiones económicas definitivas, custodia, vesting base/beneficiarios, presupuesto/Arweave, política NFT y revisión residual pendientes; supply/distribución aprobados no se alteran. Tercer rehearsal Devnet y calendario sin cambios.


## Decisiones del propietario registradas — 2026-10-07 UTC

Desde `faaa1c71a623e12792e86653e28396251293a897`, aprobadas únicamente para preparación: Meteora DAMM v2 unilateral, ROBUSTO/SOL, OnlyB, objetivo 1M ROBUSTO, fixed 25 bps, sin dynamic fee, rango objetivo 3×, sin permanent lock, metadata mutable, mint authority retenida y Arweave preferido. El propietario acepta continuar con conocimiento explícito de 3 advisories/7 warnings, que siguen sin resolver. Rehearsal P0/Pmax USD y SOL/USD=100 son TEST_ONLY y no se registran como precio final. El precio definitivo se calcula con cotización vigente y requerirá aprobación previa a Mainnet. Vestings aprobados: team 365 días de espera +730 lineales; reserve 180+1095, start=cliff tras espera; fecha/beneficiarios pendientes. Ver `docs/ROBUSTO_FINAL_OWNER_APPROVAL.md` y `docs/ROBUSTO_MAINNET_EXECUTION_PLAN.md`. Sin Mainnet, pagos, firmas, transacciones, wallets definitivas ni publicación autorizados.


## ROBUSTO identity and custody — 2026-10-07 UTC

Continuar desde [docs/ROBUSTO_MAINNET_IDENTITY_CUSTODY.md](docs/ROBUSTO_MAINNET_IDENTITY_CUSTODY.md). Inventario público sin identidades: `config/robusto-mainnet-public-addresses.json`; validar con `npm run robusto:custody-inventory`. No se generaron ni leyeron claves privadas. Ajuste obligatorio pendiente: `robusto-production.ts` usa mint authority como source ATA/signatario de distribución; diseñar y probar market source separada antes de generar wallets. Propietario principal recomendado: wallet team/founder beneficiary si el propietario será ese beneficiario. No Mainnet/transacciones/pagos/publicación.
