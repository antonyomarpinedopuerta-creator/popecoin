# ROBUSTO — revisión final adicional, 2026-10-06

MAINNET_DISABLED / NOT_AUTHORIZED_FOR_MAINNET. El trabajo es código, pruebas locales, lecturas Devnet, commits y publicación Git. No se firma/envía ninguna transacción, se usa Mainnet, se publica metadata on-chain ni se toca custodia privada. El cierre no espera las fechas del ensayo.

## Revisión y correcciones

Se revisaron todas las instrucciones/estado/errores/seeds del programa, ciclo local SBF, builders ROBUSTO, preflight/verificación, lectores/app, metadata/PNG, seguridad, auditoría, CI, empaquetado y recuperación. El contrato Rust mantiene fuentes/ABI/identidad; no hubo nueva ruta de retiro no autorizado identificada. Continúan los límites conocidos de financiación parcial, excedentes sin rescue/close, necesidad de firma del beneficiario y facultades de autoridades retenidas.

- PNG: CRC y estructura no bastaban para rechazar IDAT corrupto. Ahora se descomprime con límite de 64 MiB, verifica longitud exacta y consumo de zlib, reconstruye filtros y pasos Adam7, exige palette en imágenes indexadas, valida índices y orden de chunks, rechaza tipos críticos desconocidos y bytes posteriores. Se aceptan IDAT vacíos si el stream completo es válido. La imagen oficial y su aprobación visual siguen pendientes.
- Preflight: antes no vinculaba las instrucciones aportadas con el builder. Ahora compara etapa, rentSizes, programas, cuentas, signer/writable y data exactos antes de cualquier RPC. Pruebas rechazan emisión alterada, destino sustituido, firma eliminada y etiqueta desconocida. Rent, presupuesto y consentimiento del mensaje final siguen necesitando verificación operativa.
- Autoridades: la propuesta básica podía compartir mint authority y upgrade authority cuando metadata estaba pendiente. Ahora las tres autoridades no pendientes deben ser distintas; también se exige MAINNET_DISABLED / PROPOSED_NOT_APPROVED desde el validador básico.
- Despliegue: se rechazan objetos rent incompletos, no solo valores inválidos presentes. Los builders siguen offline/unsigned; no se despliega ningún programa.
- Metadata: la verificación de bytes publicados exige URI de metadata durable ya fijada. La URI de update ya estaba limitada a 200 bytes por durableUri; se añadió regresión sin atribuirle un fallo inexistente. Nombre/símbolo, mutabilidad y autoridad conservada se prueban con decodificación de instrucciones reales.
- Lector: se rechazan flags SPL delegate/native/close authority diferentes de 0/1; el unpacker podía interpretarlos como None. El perfil histórico PAPA no se relabela como ROBUSTO. El perfil futuro Mainnet permanece deshabilitado.
- Evidencia: el security scan invalida resultados anteriores antes de empezar y registra failed ante error. La auditoría liga el informe a hashes públicos, además de HEAD/dirty. El backup exige auditoría exitosa del commit limpio y mismos inputs; rechaza evidencia stale/fallida.

## Pruebas y evidencia

Tanda de código validada antes de commit: 95 pruebas cliente, 49 Python, TypeScript sin errores y Clippy con warnings como errores. Rust: 37 SBF/LiteSVM, 1 carga y 10 aritmética, 48 por identidad (release y copia Devnet). El lifecycle ROBUSTO usa SBF y SPL reales en LiteSVM: rechazo precliff, parciales 2.857.142 y 5.714.285 raw acumulados, final 10.000.000, conservación y rechazo posterior. Solo se altera Clock local; no es evidencia de releases Devnet.

Logs públicos de esta tanda: evidence/robusto/final-review-client.log y final-review-rc.log. La suite RC se repite después del commit documental limpio; sus informes finales viven en target/rc-check.json, target/reproducibility.json, target/clean-check.json y target/dependency-audit.json. El backup final incluye los informes explícitos y todas las fuentes públicas; manifest y sidecar identifican HEAD/SHA-256 sin introducir hash autorreferente en Git.

Auditoría consultada en esta sesión: diez rutas Yarn revisadas (una high y nueve moderate, cuatro advisories), seis avisos Rust y cero entradas de vulnerabilidad Rust. Se conservan mitigaciones vendor y límites de DEPENDENCY_REVIEW.md; no se afirma cero vulnerabilidades. Fallos iniciales corregidos: tipos Node de inflateSync(info:true), y expectativa del texto de error de URI ya rechazada. El primer fallo de auditoría por red restringida no constituye PASS; la repetición con red pasó.

CI del padre e0566fb fue consultado: run 37400496536 completed/success. No prueba el commit final. El workflow se publica con cada push y el resultado del HEAD final se informa por separado. El build denominado verify-mainnet-release es una comprobación local de identidad histórica, no accede a Mainnet.

## Terminado y pendiente

Terminado dentro del alcance offline y neutral respecto de proveedores: contrato y lifecycle local; validadores de supply candidato 1.000.000.000 × 10^6 = 10^15 raw; distribución configurable exactamente 100%; separación de autoridades; builders unsigned de SPL/vesting/metadata/loader; preflight y reconciliación futura con mocks; preparación/publicación mediante manifest/comparación/actualización de metadata; PNG; perfil futuro de app; seguridad/auditoría/CI; documentación y backup público verificable.

Por fechas: únicamente ejecución pública de parciales y final del tercer rehearsal, también condicionada a nuevas autorizaciones por operación. El ensayo sigue intacto: snapshot finalized slot 508092917, Clock 2026-10-06 12:28:16 UTC, supply/vault 10.000.000 raw, source/beneficiario/released 0. La evidencia de las 12:12:53 se conserva. Start 2026-10-06 13:32:52, cliff 2026-10-07 01:32:52, parciales objetivo 8/10 a 13:32:52 y end 13 a 13:32:52 UTC.

Decisiones/inputs externos: supply definitivo, allocations/vesting/start, imagen oficial exacta y contenido/enlaces, signers/custodia/integración de firma, ID de programa y necesidad de desplegarlo, hosting, revisión independiente, autorización/presupuesto Mainnet y mecanismo de mercado. No inventar distribuciones, claves, imagen, proveedor ni capital.

Para Mainnet: resolver esos inputs; build real/reproducible para ID aprobado, integración de firma probada, cotizaciones/simulación vigentes y revisión/autorización separada de cada transacción. El software actual no incluye executor Mainnet. Multisig/hardware requieren adaptación tras elegir custodia; no hay afirmación de soporte operativo probado.

Para negociación pública: crear/verificar el token y además elegir/verificar DEX/launchpad/contrapartida, par, presupuesto y liquidez real; integrar y probar el mecanismo elegido, con aprobación previa a fondos/pool. TOKEN CREATED y TOKEN PUBLICLY TRADABLE permanecen distintos y pendientes. No se garantiza liquidez sin capital/contraparte.

Actualización posterior: logo oficial recibido e incorporado con autorización del propietario. [Registro validado](../metadata/robusto/OFFICIAL_ASSET.md). Las menciones anteriores a imagen pendiente son históricas; contenido/hosting/URI siguen sin decidir.
