# ROBUSTO — validación del cierre

Resultados durante implementación: 48 Rust (37 SBF/LiteSVM, 1 carga, 10 aritmética), 88 cliente TypeScript, 47 Python PASS; tsc PASS. RC completo del árbol de trabajo PASS: SBF/IDL + Rust de ambas identidades, tsc, clientes, Python, Clippy y verificación de artefactos. Se reejecutará sobre el commit limpio para empaquetado; no atribuir resultados a CI remoto aún.

RPC Devnet finalized slot507915315: estado inmutable de tercer rehearsal validado; evidencia third-status-2026-10-06T00-40-40-568Z.json. No firma/envío ni modificación de cuentas. No lectura Mainnet. Dos parciales y final siguen pendientes de fechas Y autorización independiente.

Fallos iniciales conocidos y corregidos: nombres camelCase frente a IDL snake_case en nuevo planner y URI Arweave sintética no canónica. Primera pasada RC falló sobre esa URI; no es una prueba pública ni una vulnerabilidad del contrato. Una nueva suite posterior exige PASS. DNS/fetch falló en sandbox para consulta RPC y auditoría; se reintentaron mediante permisos de red, conservando logs.

Auditoría de dependencias actual ejecutada: RustSec commit ef6173cbc5c50ec8166f9a5b28f07834144373ee, actualizado2026-10-03T10:14:03+02:00; mismo conjunto permitido de avisos, no cero findings. Yarn: bigint-buffer high (mitigación vendor JS), stream-json moderate tres rutas. Rust: cinco unmaintained y rand0.7.3 unsound (dependencias de test sin feature log activado). Sin nuevas excepciones. Ver DEPENDENCY_REVIEW.md y config/dependency-policy.json.

Heurística actual +273 blobs públicos únicos de los20 commits iniciales: PASS sin hallazgos; no garantía universal. Solo stat/ignore de identidades privadas, no lectura de keys. Informe final target/security-scan.json y backup público.

Comandos: `npm run check:rc`, `npm run verify:reproducible`, `npm run verify:rc`, `npm run package:rc`, `npm run verify:package`, `npm run check:clean`, `npm run audit:dependencies`, `npm run backup:public`. Son build/tests/lecturas; nunca transacciones.

App verificada con agent-browser: home carga, controles/branding PAPA histórico presentes, sin overlay ni errores JS detectados, botón de consulta Devnet completado y habilitado otra vez. Captura pública closure-app.png. Chrome requirió libnspr4/libnss3/libasound2t64 descargadas bajo /tmp; no instalación de sistema. El primer daemon no heredaba bibliotecas y se abrió sesión nueva correctamente. La consulta fue solo lectura, sin wallet.

No se ejecutó `anchor test` contra el provider Devnet de Anchor.toml: requeriría flujo de validator/deploy/wallet que no forma parte de este alcance. Las pruebas disponibles de programa Anchor se ejecutaron con SBF en LiteSVM y `anchor idl build`. No metadata ROBUSTO publicada/remote verificada porque imagen/hash/URI oficiales faltan. Las funciones Mainnet se probaron con fixtures/RPC mocks únicamente; no se puede declarar ejecución real probada. Hardware/multisig, hosting y adaptador de mercado no se implementan contra un proveedor sin decisión/verificación externa.

Export limpio de15204ff: PASS, nuevo Yarn cache/node_modules/build caches; ambos programas reconstruidos/probados y artefactos idénticos. El formatter ignore raíz (.prettierignore) faltaba en el inventario RC heredado; se añadió y el backup ahora exige igualdad exacta entre git ls-files e inputs RC, para evitar omisiones silenciosas. La configuración/calendario del ensayo, fuentes del contrato y las tres piezas de metadata PAPA tienen diff vacío frente a324e5ba.

Push de15204ff confirmado. CI37397023485 en curso al consultar; CI37206428474 del commit324e5ba success. El resultado del workflow anterior no prueba este cierre. Último estado/archivo de backup se consulta por HEAD y manifest actual; no fijar una referencia recursiva a su propio hash dentro de fuentes.

Logs públicos preservados: closure-client.log(88PASS), closure-python.log(47PASS), closure-rc-clean.log(RC de15204ff limpio, 48 Rust por identidad/Clippy/artefactos), closure-baseline-inventory.json(175archivos de324e5ba). La app aparece en closure-app.png. El ajuste posterior del inventario incluye.prettierignore y se valida otra vez en RC/backup final.

Reproducción en workspace/cache nuevos: PASS, SBF/IDL/tipos idénticos byte a byte y48tests Rust repetidos sobre el artefacto reconstruido. HashSBF release1c3b71a2b792fa986b2a9264861d2bc58654e85370f2bb348cea4dcccaff8492; identidadDevnet histórica e2afff5bdf90e1879ef08d8fd5bec4a84b14891b23e12617eb86e4e53b7b93fb. Reproducción en la misma máquina, no atestación independiente/hermética. Estado final verificable en target/rc-check.json, target/clean-check.json, target/reproducibility.json, target/backups/ y sus manifests/sidecars.
