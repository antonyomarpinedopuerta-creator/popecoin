# ROBUSTO — continuidad y restauración pública

Preparación Meteora posterior: leer [ROBUSTO_METEORA_LOCAL_REHEARSAL](ROBUSTO_METEORA_LOCAL_REHEARSAL.md). `config/robusto-meteora-local.json` es APPROVED_FOR_LOCAL_REHEARSAL_ONLY; validar con `npm run robusto:meteora-local -- validate`. No ejecutar bytes unsigned ni interpretar los public fixtures como wallets utilizables. No reutilizar identidades Devnet. Cotización sintética, programa instalado localmente, cuentas y autorización de ejecución siguen pendientes.

Documento vigente para el propietario y continuidad sin Astra: [ROBUSTO_READY_FOR_OWNER_DECISIONS](ROBUSTO_READY_FOR_OWNER_DECISIONS.md). Las propuestas nuevas no aprueban allocations ni operaciones.
Entrada para otra sesión Codex: leer README, ROBUSTO_STATUS, ROBUSTO_CLOSURE, evidencia closure-validation y config/robusto-rehearsal-3.json. Comprobar `git status`, HEAD y origin/master. No seguir pasos antiguos de Deposit del segundo ensayo. No regenerar identidades, modificar horarios, repetir operaciones finalizadas ni asumir autorización para releases futuros.

## Backup público

`npm run backup:public` crea `target/backups/robusto-public-<commit12>.tar.gz` y `.tar.sha256` solo si RC actual limpio y reproducción verifican. Incluye inputs públicos completos, manifest de hashes, evidencia y artefactos SBF/IDL explícitos. Las tres piezas públicas del programa rehearsal ya desplegado se conservan bajo docs/evidence/rehearsal-builds/, con hashes fijados en config/rehearsal-deployment.json; el lector utiliza esa evidencia si no existe la caché target/rehearsal-builds. No requiere recompilar ni recrear el manifiesto histórico para hacer una lectura. Excluye .git, node_modules, target pesado, identidades privadas y keypairs. Los avisos de dependencias no desaparecen porque exista backup.

Antes de crear el backup, ejecutar `npm run audit:dependencies` sobre el mismo HEAD limpio. La auditoría registra hashes de todos los inputs públicos y el backup exige su coincidencia exacta con RC; informes fallidos, de otro commit, dirty o sin hashes no sirven. Orden final: commit, check:rc, verify:reproducible, audit:dependencies, verify:rc, package:rc, verify:package, backup:public. No editar fuentes entre esas validaciones. check:clean comprueba además un export Git con node_modules y caché Yarn nuevos.

Verificar antes de restaurar:

```sh
cd target/backups
sha256sum --check robusto-public-<commit12>.tar.sha256
# Desde el repositorio existente:
python3 scripts/backup-public.py --verify target/backups/robusto-public-<commit12>.tar.gz
```

Restaurar en carpeta NUEVA (no sobre el rehearsal ni sus claves): inspeccionar lista tar, exigir solo archivos regulares y rutas relativas sin traversal/symlinks, extraer con filtro seguro Python `tarfile.extractall(destination, filter='data')`. El verificador del backup valida inventario/hash/sidecar; no extrae nada por sí solo.

En carpeta restaurada: ejecutar verificación del mismo archivo con el script restaurado; cotejar backup-manifest.json y HEAD documentado. El backup no contiene base Git ni permite reconstruir claves privadas. Para continuidad exacta de Git, clonar origin en otra carpeta y hacer checkout del HEAD del manifest; comparar bytes públicos con manifest antes de usar. Si GitHub no está disponible, inicializar Git en la restauración y conservar en documentación el HEAD original; no presentar el nuevo commit local como el original.

Instalar herramientas fijadas de rust-toolchain.toml/CI y `yarn install --frozen-lockfile --ignore-scripts --production=false`. `npm run check:rc` reconstruye SBF/IDL, prueba dos identidades y valida artefactos. Las claves generadas automáticamente por build son locales/ignoradas, nunca identidades aprobadas de deploy. Consultar `npm run robusto:third-status` solo si red disponible; escribe evidencia nueva, no sobrescribe historia. No ejecutar robusto:recover antiguo: reconcilia el checkpoint ANTERIOR al retorno y ya no corresponde al saldo fuente actual.

## Lo que el backup no recupera

Custodia privada/payer/beneficiario del rehearsal no están en backup público. Los archivos locales privados existentes permanecen ignorados con directorios0700/archivos0600; no imprimirlos, copiarlos a evidencia ni pedir seeds en chat. Su recuperación requiere el procedimiento privado de custodia del propietario. No crear sustitutos ni resetear PDA/vault ante pérdida de firma.

Ante fallo de red tras una futura operación aprobada: leer journal de firma, consultar status/history y cuentas; confirmar finalized o investigar antes de cualquier reenvío. No repetir mint/deposit/initialize. Ninguna tarea automática de release está instalada; calendario futuro y autorización siguen separados.

Políticas aprobadas offline: `npm run robusto:production -- economics` y `npm run robusto:launch-policy -- validate`. config/robusto-launch-policy-approved.json conserva importes efectivos/fechas/identidades null y operaciones false. El comando dates solo propone; no ejecutar preparación de wallets definitivas ni adoptar fechas de docs sin aprobación. Siguiente etapa: [ROBUSTO_NEXT_STAGE_FOR_APPROVAL](ROBUSTO_NEXT_STAGE_FOR_APPROVAL.md).

Rehearsal Meteora completada: [evidencia pública](evidence/robusto/meteora-local-runtime.json), 17 transacciones solo locales, validador detenido y autorización expirada. No volver a ejecutar `robusto:rehearse-local` sin permiso nuevo. Reconstruction solo de código/binarios: `npm run build:meteora-local`; la auditoría externa `npm run audit:meteora-local` devuelve actualmente fallo explícito por tres advisories upstream y no debe silenciarse. `.robusto-local-private/` contiene identidades/ledger desechables ignorados; nunca se incluye en backup ni se copia como custodia de producción. Ver límites en [guía](ROBUSTO_METEORA_LOCAL_REHEARSAL.md).


## Plan final de preparación (2026-10-07)

Hoja con únicamente aprobaciones pendientes: [ROBUSTO_FINAL_OWNER_APPROVAL.md](ROBUSTO_FINAL_OWNER_APPROVAL.md). Secuencia futura y gates: [ROBUSTO_MAINNET_EXECUTION_PLAN.md](ROBUSTO_MAINNET_EXECUTION_PLAN.md). Son documentos de preparación, sin autorización de firmas/envíos/pagos/publicación. El propietario aceptó continuar la preparación con Meteora con conocimiento explícito de los 3 advisories y 7 warnings, aún sin resolver. No rehacer rehearsal general; no cambiar calendario Devnet.


## Decisiones del propietario registradas — 2026-10-07 UTC

Desde `faaa1c71a623e12792e86653e28396251293a897`, aprobadas únicamente para preparación: Meteora DAMM v2 unilateral, ROBUSTO/SOL, OnlyB, objetivo 1M ROBUSTO, fixed 25 bps, sin dynamic fee, rango objetivo 3×, sin permanent lock, metadata mutable, mint authority retenida y Arweave preferido. El propietario acepta continuar con conocimiento explícito de 3 advisories/7 warnings, que siguen sin resolver. Rehearsal P0/Pmax USD y SOL/USD=100 son TEST_ONLY y no se registran como precio final. El precio definitivo se calcula con cotización vigente y requerirá aprobación previa a Mainnet. Vestings aprobados: team 365 días de espera +730 lineales; reserve 180+1095, start=cliff tras espera; fecha/beneficiarios pendientes. Ver `docs/ROBUSTO_FINAL_OWNER_APPROVAL.md` y `docs/ROBUSTO_MAINNET_EXECUTION_PLAN.md`. Sin Mainnet, pagos, firmas, transacciones, wallets definitivas ni publicación autorizados.


## Identity & custody preparation

Consultar [ROBUSTO_MAINNET_IDENTITY_CUSTODY.md](ROBUSTO_MAINNET_IDENTITY_CUSTODY.md). El inventario público `config/robusto-mainnet-public-addresses.json` está vacío y es validable con `npm run robusto:custody-inventory`. No se generaron identidades definitivas. Corregir y probar la separación entre mint authority y distribución en el builder antes de crear identidades o preparar transacciones.
