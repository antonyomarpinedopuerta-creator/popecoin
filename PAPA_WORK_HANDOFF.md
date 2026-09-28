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
- No se descartó trabajo. Se publicó hasta c556eef en origin/master; no se desplegó ningún programa.

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
- **28 tests TypeScript**: cliente, lector, servidor, planificación, ProgramData,
  vendor y registro de build. **32 tests Python**: RC, reproducción y paquete.
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
su ejecución hospedada sigue pendiente. check:clean exige HEAD limpio, exporta solo
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
