# ROBUSTO — continuidad y restauración pública

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
