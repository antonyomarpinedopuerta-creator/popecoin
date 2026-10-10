# ROBUSTO · vesting

Resultado técnico offline vigente: [ROBUSTO_TECHNICAL_COMPLETION.md](docs/ROBUSTO_TECHNICAL_COMPLETION.md).

Estado actual y límites de lanzamiento: [ROBUSTO_STATUS.md](docs/ROBUSTO_STATUS.md).
ROBUSTO es la marca pública; los nombres técnicos `popecoin_vesting`, IDs, binarios y metadata PAPA se conservan para reproducibilidad. Los planes PAPA de 10 millones de tokens son históricos: ROBUSTO de 1.000 millones tiene parámetros económicos aprobados para preparación; su ejecución permanece no autorizada.

El lector web conserva PAPA para sus cuentas históricas; `config/app-reader.json` define ese perfil. La plantilla Mainnet está deshabilitada y requiere direcciones verificadas y opt-in de lectura explícito antes de usarla.


Programa Solana/Anchor para vesting lineal de tokens SPL clásicos. Requiere firma del beneficiario al crear y liberar; la autoridad financia el vault. No tiene cancelación, retiro administrativo ni recuperación de excedentes. La acumulación comienza en `start_time` y se puede reclamar desde `cliff_time`.

## Cierre ROBUSTO

[Inventario y alcance](docs/ROBUSTO_CLOSURE.md), [validación del cierre](docs/evidence/robusto/closure-validation.md), [producción/Mainnet deshabilitado](docs/ROBUSTO_MAINNET_CHECKLIST.md), [autoridades conservadas](docs/ROBUSTO_AUTHORITIES.md), [mercado público pendiente](docs/ROBUSTO_LAUNCH_CHECKLIST.md) y [restauración](docs/ROBUSTO_RECOVERY.md).

La [revisión final del 6 de octubre](docs/ROBUSTO_FINAL_REVIEW.md) documenta las correcciones adicionales y el límite entre código probado y operaciones/decisiones pendientes.

```sh
npm run robusto:production       # offline; no autorización
npm run check:rc                # build/tests de dos identidades
npm run check:security          # heurística + últimos 20 commits
npm run robusto:third-status    # lectura Devnet, evidencia nueva, sin firmas
```

El lifecycle rápido completo ejecuta SBF/SPL en LiteSVM con Clock aislado; no es evidencia Devnet. El ensayo público mantiene sus fechas exactas y 10.000.000 raw depositados. Imagen ROBUSTO: OFFICIAL_USER_ASSET_VALIDATED; hosting/URI pendientes. Distribución: PROPOSED_NOT_APPROVED. Ningún Mainnet, publicación on-chain, mint adicional, liquidez ni revocación.

## Validación local

Herramientas verificadas: Rust/Cargo 1.89.0, Solana CLI 3.1.10, Anchor CLI 1.1.2, Node 24.10.0, npm 11.6.1, Yarn 1.22.22. `Cargo.lock` resuelve Anchor Rust 1.2.0 y LiteSVM 0.10.0; el cliente usa Anchor TS 0.32.1. Las pruebas de cliente comprueban la construcción de las tres instrucciones con el IDL generado.

```sh
yarn install --frozen-lockfile --ignore-scripts
npm run check
npm run verify:release
```

`check` compila SBF con manifiesto y salida explícitos (`cargo build-sbf --locked`), genera el IDL con `anchor idl build`, ejecuta Rust/LiteSVM, verifica TypeScript y ejecuta las pruebas de cliente offline. No despliega ni utiliza wallets. Se debe compilar antes de los tests Rust porque incluyen el binario de `target/deploy`; `npm run test:rust` hace ambas cosas. `target/` es generado y no se versiona. Los tests LiteSVM usan signers efímeros y tokens ficticios en memoria.

## Identidades

- Código/IDL de release: `AYsgq7YWePj8zSHMznEQwtexDMAFqfXkPjDK6diHkHEn`.
- Programa Devnet histórico: `BqphsaaswAYZjZK6GTyjb2Sp9juTt2nztD3VVkWEH8zc`.
- Los scripts Devnet vinculan explícitamente el IDL al programa Devnet mediante `scripts/devnet-config.ts`. Esto cambia el destino del cliente, **no** el ID incorporado en el binario.
- El binario actual no se debe desplegar sobre el programa Devnet histórico. Consultar [procedimiento](docs/DEPLOYMENT_PROCEDURE.md).

## Scripts operativos

Los scripts `devnet-initialize`, `devnet-*-vesting`, `devnet-*-deposit`, `devnet-release`, `create-metadata` y `update-metadata` modifican Devnet si se ejecutan. No forman parte de `check`. Exigen rutas explícitas a signers exclusivos de Devnet mediante `PAPA_DEVNET_PAYER_KEYPAIR` y, según el rol, `PAPA_DEVNET_DEVELOPMENT_KEYPAIR`, `PAPA_DEVNET_FOUNDER_KEYPAIR` o `PAPA_DEVNET_RESERVE_KEYPAIR`. No se deben colocar claves en el repositorio. La configuración explícita evita cargar silenciosamente la wallet predeterminada de Solana; el operador sigue siendo responsable de escoger una clave exclusivamente de pruebas.

Los scripts de depósito consultan el vault y calculan la diferencia exacta. Un cambio concurrente de saldo puede hacer que el contrato rechace la operación; inspeccionar y volver a calcular. Un vesting con liberaciones previas no admite otro depósito mediante esta instrucción.

`inspect-planned-vestings.ts`, `read-metadata.ts` y `devnet-test.ts` consultan Devnet. `verify-mainnet-release.ts`, pese a su nombre histórico, solo comprueba archivos locales; no verifica custodia, despliegue ni correspondencia criptográfica entre fuente y binario.

## Estado y revisión final

Ver [PAPA_WORK_HANDOFF.md](PAPA_WORK_HANDOFF.md) para resultados actuales y pendientes. `app/` contiene una interfaz local de consulta Devnet, sin firmas ni conexión de wallet. Los registros Devnet de `docs/` son históricos y no afirman el estado actual de la red. Quedan pendientes auditoría independiente, custodia final, metadata duradera, mint y fechas finales de producción. No hay autorización de lanzamiento implícita.


## App de consulta

`npm run app` sirve http://127.0.0.1:3000 (solo loopback; `PORT` configurable).
Permite consultar Reserva y Founder, muestra cantidades exactas, calendario UTC,
slot confirmado, financiación pendiente y estado de congelación. Acumulado desde
el inicio incluye tokens aún bloqueados por el cliff; reclamable aplica el cliff
y descuenta liberaciones. Cobertura del vault no garantiza que una transacción
pueda ejecutarse: no valida destino, firma ni simulación. No ofrece envío.

## Builds aislados y evidencias

- `npm run build:devnet`: copia fuentes públicas, cambia la identidad solo en la
  copia, compila y ejecuta los tests en `target/devnet-workspace`. Su caché host/SBF
  está separada de release. No despliega ni modifica source/IDL de release.
- `npm run verify:release`: además de identidades, contrasta hashes de entradas,
  binario e IDL con `target/release-build-record.json`. El registro se genera en
  cada `build:safe`; no es una atestación independiente ni prueba remota.
- `npm run devnet:snapshot`: consulta vestings con estado, vault, mint y reloj en
  un mismo contexto por posición. Guarda montos como strings de unidades base.
- `npm run devnet:program`: valida loader/ProgramData y compara el ejecutable con
  el hash histórico. No afirma correspondencia del código actual con Devnet.
- `npm run plan:production`: valida parámetros explícitos de
  `config/production-plan.json`, reconcilia distribución y calcula PDAs/fechas
  offline. Falla intencionalmente mientras sus campos sigan pendientes. La sintaxis
  de URI no prueba pinning, disponibilidad o contenido de metadata.

El fallo `DeclaredProgramIdMismatch` observado al retomar `f46fde9` se corrigió
separando cachés y haciendo explícito el build SBF. No confiar en que un comando
Anchor que termina correctamente haya sustituido un artefacto previo: usar
`npm run check` y el registro de build.

CI está definida en `.github/workflows/ci.yml`, sin despliegues, wallets ni secrets.
Su primera ejecución remota queda pendiente; los comandos se verifican localmente.
Revisar [dependencias](docs/DEPENDENCY_REVIEW.md), incluida la implementación
JavaScript de bigint-buffer vendorizada. Instalar con Yarn: npm no respeta estas
resolutions. Los avisos de auditoría pendientes no se silencian.

## Release Candidate reproducible

```sh
npm run check:rc
npm run verify:reproducible
# Después de conservar los cambios en un commit, con el árbol limpio:
npm run check:rc
npm run verify:rc
npm run package:rc
```

`check:rc` reúne tests Python, build SBF/IDL, Rust, TypeScript, Clippy, tests de
Devnet aislado y verificación final de release. CI usa el mismo comando.
`target/rc-check.json` registra revisión Git, estado del árbol, versiones de
herramientas, hashes públicos y resultados. Rechaza otra ejecución simultánea y
cambios de fuentes durante las pruebas. Invalida el éxito previo antes de consultar
Git. SIGINT/SIGTERM cierran el grupo de procesos hijo; SIGKILL deja el registro
incompleto y puede dejar hijos vivos, que deben detenerse antes de reanudar.

`verify:reproducible` reconstruye con workspace y caché nuevos, compara los bytes
SBF/IDL/tipos y ejecuta Rust de nuevo. Guarda `target/reproducibility.json`.
Prueba reproducibilidad en la misma máquina, no una atestación independiente.
Puede descargar dependencias y consume disco bajo `target/reproduce-*`.

`verify:rc` y `package:rc` exigen el HEAD actual limpio, todas las comprobaciones,
hashes actuales y reproducción coincidente. El paquete público está en
`target/rc/papa-<commit>.tar.gz`, acompañado por SHA-256; incluye fuentes,
documentación, artefactos seleccionados y manifiesto con evidencia de reproducción.
Orden, permisos, timestamps y cabecera gzip son deterministas para esos bytes.
Nunca se copia `target/deploy` en bloque, ya que puede contener keypairs.

Estos comandos no despliegan, firman ni cambian autoridades. Los campos pendientes
de producción y las auditorías externas siguen siendo requisitos separados.

### Verificación final offline del RC

Sobre un HEAD limpio: `npm run check:rc`, `npm run verify:reproducible`,
`npm run check:clean`, `npm run verify:rc`, `npm run package:rc` y
`npm run verify:package`. El último comando verifica el tar real, sin extraerlo,
contra el inventario, manifiesto y hashes del candidato actual. check:clean usa
una exportación Git, caché Yarn vacía y builds nuevos; conserva toolchains y caché
Cargo instaladas. No ejecuta transacciones ni usa wallets. Los informes están
bajo target/ y no se versionan. Ejecutar además `npm run audit:dependencies`
con cargo-audit 0.22.2 instalado; los hallazgos retenidos siguen visibles.
El gate de archivos públicos es heurístico, no garantiza ausencia universal de secretos.

Para revisión independiente: [alcance y evidencias](docs/INDEPENDENT_AUDIT.md) y
[ensayo Devnet](docs/DEVNET_REHEARSAL.md). `npm run check:metadata:remote` y
`npm run rehearse:devnet` solo consultan datos públicos. `npm run prepare:audit`
exige evidencias exitosas del mismo HEAD y genera un expediente con hashes, sin
aprobar lanzamiento ni sustituir la auditoría externa.

Después de un CI hospedado exitoso del HEAD local, ejecutar
`npm run collect:ci -- <run-id>` antes de `npm run prepare:audit`. Se comprueban
los dos paquetes hospedados y sus seis artefactos contra el RC local. La instalación
de herramientas host usa Rust 1.91.0; el programa conserva Rust 1.89.0.

Preparación sin claves: `npm run prepare:rehearsal` emite instrucciones para revisión
usando config/rehearsal-plan.json; no simula, firma ni envía. `npm run prepare:metadata`
genera el JSON público determinista cuando exista una URI de imagen aprobada.
Ambos rechazan los parámetros pendientes. Ver docs/DEVNET_REHEARSAL.md y
metadata/PRODUCTION_METADATA.md para los pasos externos y sus evidencias.
