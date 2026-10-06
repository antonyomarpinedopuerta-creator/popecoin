# ROBUSTO — validación del cierre

Resultados durante implementación: 48 Rust (37 SBF/LiteSVM, 1 carga, 10 aritmética), 88 cliente TypeScript, 47 Python PASS; tsc PASS. RC completo del árbol de trabajo PASS: SBF/IDL + Rust de ambas identidades, tsc, clientes, Python, Clippy y verificación de artefactos. Se reejecutará sobre el commit limpio para empaquetado; no atribuir resultados a CI remoto aún.

RPC Devnet finalized slot507915315: estado inmutable de tercer rehearsal validado; evidencia third-status-2026-10-06T00-40-40-568Z.json. No firma/envío ni modificación de cuentas. No lectura Mainnet. Dos parciales y final siguen pendientes de fechas Y autorización independiente.

Fallos iniciales conocidos y corregidos: nombres camelCase frente a IDL snake_case en nuevo planner y URI Arweave sintética no canónica. Primera pasada RC falló sobre esa URI; no es una prueba pública ni una vulnerabilidad del contrato. Una nueva suite posterior exige PASS. DNS/fetch falló en sandbox para consulta RPC y auditoría; se reintentaron mediante permisos de red, conservando logs.

Auditoría de dependencias actual ejecutada: RustSec commit ef6173cbc5c50ec8166f9a5b28f07834144373ee, actualizado2026-10-03T10:14:03+02:00; mismo conjunto permitido de avisos, no cero findings. Yarn: bigint-buffer high (mitigación vendor JS), stream-json moderate tres rutas. Rust: cinco unmaintained y rand0.7.3 unsound (dependencias de test sin feature log activado). Sin nuevas excepciones. Ver DEPENDENCY_REVIEW.md y config/dependency-policy.json.

Heurística actual +273 blobs públicos únicos de los20 commits iniciales: PASS sin hallazgos; no garantía universal. Solo stat/ignore de identidades privadas, no lectura de keys. Informe final target/security-scan.json y backup público.

Comandos: `npm run check:rc`, `npm run verify:reproducible`, `npm run verify:rc`, `npm run package:rc`, `npm run verify:package`, `npm run check:clean`, `npm run audit:dependencies`, `npm run backup:public`. Son build/tests/lecturas; nunca transacciones.

App verificada con agent-browser: home carga, controles/branding PAPA histórico presentes, sin overlay ni errores JS detectados, botón de consulta Devnet completado y habilitado otra vez. Captura pública closure-app.png. Chrome requirió libnspr4/libnss3/libasound2t64 descargadas bajo /tmp; no instalación de sistema. El primer daemon no heredaba bibliotecas y se abrió sesión nueva correctamente. La consulta fue solo lectura, sin wallet.

No se ejecutó `anchor test` contra el provider Devnet de Anchor.toml: requeriría flujo de validator/deploy/wallet que no forma parte de este alcance. Las pruebas disponibles de programa Anchor se ejecutaron con SBF en LiteSVM y `anchor idl build`. No metadata ROBUSTO publicada/remote verificada porque imagen/hash/URI oficiales faltan. Las funciones Mainnet se probaron con fixtures/RPC mocks únicamente; no se puede declarar ejecución real probada. Hardware/multisig, hosting y adaptador de mercado no se implementan contra un proveedor sin decisión/verificación externa.
