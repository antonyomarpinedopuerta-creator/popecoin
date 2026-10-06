# ROBUSTO — cierre de código seguro, octubre 2026

Estado: NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED. Este cierre no autoriza ninguna firma o transacción. No se modificó el programa desplegado, las cuentas, el supply ni autoridades. El código Rust del contrato y sus seeds/ABI quedan idénticos al commit 324e5ba; se añade una regresión local, no una actualización on-chain.

## Inventario y clasificación

Se inventariaron/leyeron los 175 archivos públicos del árbol de referencia (incluidos lockfiles, vendor, evidencia, workflow, metadata PNG histórica), y el historial reciente. La revisión funcional se concentra en contrato, herramientas operativas, cliente, servidor, validadores, build/RC y CI. Los documentos/planes antiguos PAPA conservan contexto histórico y no se convierten en decisiones ROBUSTO. No se abrieron archivos privados.

| Área | IMPLEMENTED | TESTED | EXTERNALLY VERIFIED | PENDING |
|---|---|---|---|---|
| Contrato | Initialize/Deposit/Release, PDA, restricciones, enteros | SBF LiteSVM: firma, sustitución, replay lógico, rollback, extremos y redondeo | Ensayo existente; no nueva auditoría independiente | Fechas/firma de releases Devnet; revisión independiente |
| Temporal | Lifecycle local de siete días, dos parciales, final, repetición y conservación | `test_robusto_seven_day_lifecycle_local_only` ejecuta SBF y SPL reales dentro de LiteSVM | Ningún release futuro observado | Dos parciales y final de tercer rehearsal |
| Producción | Validación 1e9 × 1e6 = 1e15; distribución bps/base units; builders unsigned SPL/vesting/metadata/deploy | Fixtures sintéticas, decodificación ABI/SPL/Metaplex y snapshots falsificados rechazados | Ninguna operación Mainnet | Parámetros/custodia/aprobación/signers externos |
| Metadata | PNG estructura/CRC/hash, JSON separado, manifiesto proveedor-neutral, comparación byte a byte, update mutable | Fixtures sintéticas; no imagen oficial suplente | No publicación ROBUSTO | Imagen exacta y hosting decidido/verificado |
| App | Lectura pública con perfil/config; PAPA histórico preservado; Mainnet bloqueado por defecto | HTTP, lector, CSP, errores, concurrencia y config | No aplicación de producción desplegada | Direcciones reales, integración de perfil futuro |
| Seguridad | Heurística actual + bytes de últimos 20 commits; permisos/ignore privados solo por stat | Rechazos de archivos/arrays/paquetes; auditoría de dependencias | Datos públicos Devnet; no auditoría independiente | Avisos retenidos, revisión/custodia externas |
| Recuperación | RC público verificable + backup determinista con manifest y checksums | Tests de corrupción/symlink/duplicados y verificación del archivo real | No recuperación de claves privadas | Custodia privada fuera de este backup |

Resultados exactos del cierre y logs: `docs/evidence/robusto/closure-validation.md`. Un fixture/mock no representa una transacción pública, aprobación económica ni control de un signer.

## Código añadido y protecciones

- `robusto-production.ts`: validación y builders de mint/ATA/supply/transfer/vesting/metadata; propuestas siguen PROPOSED_NOT_APPROVED. No hay distribución inventada.
- `robusto-program-deployment.ts`: buffer, fragmentos ELF y deploy unsigned; reanudación mediante verificación del prefijo exacto, autoridad y padding. Tamaño máximo/hash/identidad deben aprobarse; no se recompila un programa Mainnet con identidad desconocida.
- `robusto-network-verification.ts`: verificación futura read-only de programa/ELF, mint, cuentas, metadata mutable y distribución, en un contexto finalized (máximo 100 cuentas). Reconciliación inicial antes de gastos de los destinatarios; no inferir balances futuros después de transferencias ajenas.
- `robusto-preflight.ts`: precondiciones por etapa con owners/mint/supply, cuentas nuevas ausentes, emisión no repetida y Deposit exacto/pre-cliff. Requiere simulación y aprobación posteriores; no firma.
- `quoteSteps`: genesis y opt-in de lectura explícito ANTES de RPC, cartera system, rent/fee y límite de paquete. No afirma presupuesto completo: protocolo/rent de metadata, priority fees, hosting y mecanismo de mercado necesitan simulación/cotización actual. El rent pasado al builder debe refrescarse antes de firmar.
- `robusto-metadata-publication.ts`: manifiesto de archivos para el uploader que se elija luego y verificación de descargas locales. No selecciona proveedor ni sube contenido. `buildMetadataUpdate` prepara futuros cambios de nombre/símbolo/URI dentro de límites del estándar y conserva update authority/isMutable=true. Descripción, imagen y enlaces cambian en JSON publicado con URI nueva.
- `robusto-third-status.ts`: fija y valida identidad/calendario del tercer rehearsal; consulta solamente. No genera ni envía releases, depósitos, mint ni metadata.
- `backup-public.py`: solo inputs/artefactos RC explícitos; excluye Git privado, target completo, node_modules, identidades y keypairs. Verifica todos los bytes del archivo.

No se añadió executor Mainnet ni acceso a claves. Los builders no son un sistema de firma o emisión automática: el proceso futuro exige integración de wallet/custodia elegida, revisión exacta del mensaje, simulación actual y aprobación por operación. Esta parte no se puede declarar probada antes de elegir/configurar esa integración.

## Hallazgos corregidos y límites

Se añadió genesis check antes de cargar signers en ambos mutadores históricos PAPA de metadata. Se corrigieron documentación vigente contradictoria, asociación de branding/config en la app y validación insuficiente del PNG (estructura/chunks/CRC; la inspección visual/decodificación completa de la imagen oficial queda pendiente de recibirla). Durante desarrollo se detectó/corrigió el uso de nombres camelCase al codificar directamente el IDL snake_case del nuevo planner; la regresión verifica bytes de Initialize. Un fixture Arweave no canónico también se corrigió. No se ocultaron estos fallos iniciales ni se atribuyen a Devnet.

No se encontró una nueva ruta de retiro no autorizado en el contrato. Deposit queda bloqueado tras el primer release. Transferencias SPL directas pueden financiar parcialmente o en exceso; release nunca excede total, y el exceso no tiene rescue/close. Un primer release sobre financiación parcial puede bloquear la futura instrucción Deposit. No se introdujeron poderes administrativos.

Mint con freeze authority o Token-2022 no es política ROBUSTO: los controles de producción exigen SPL clásico, seis decimales y freeze=null. El contrato genérico no impone esas decisiones del mint. Pérdida de la firma del beneficiario/custodia, congelación de otros mints y ausencia de cierre son límites del diseño.

La auditoría de dependencias conserva bigint-buffer/stream-json y warnings Rust ya revisados: ver DEPENDENCY_REVIEW.md. Vendor evita binding nativo afectado; no se declara parche upstream. Una búsqueda heurística no garantiza ausencia universal de secretos.

Revisión final de dependencias: se corrigió localmente GHSA-mjw6-4jj6-33hc en Assembler (dos caminos) con tres regresiones sobre el parser real; 92 cliente PASS. JSONC ausente y filtros no utilizados documentados en DEPENDENCY_REVIEW.md. El gate detectó los dos advisories no revisados antes de actualizar política; conserva diez rutas visibles.
