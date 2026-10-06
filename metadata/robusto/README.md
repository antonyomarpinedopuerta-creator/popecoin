# Metadata ROBUSTO

Marca: ROBUSTO. Símbolo de metadata: ROBUSTO; representación pública: $ROBUSTO. Decimales del mint: 6.

Estado: **OFFICIAL_USER_ASSET_VALIDATED**. Logo exacto aportado por el propietario en `metadata/robusto/robusto-logo.png`, 1254 × 1254, 1.496.214 bytes. SHA-256: `32c93f1971eb4a03f5c9b0fc6a5e87b1dc20f3028b5b73d01eeabd29cf5355ce`. [Registro del asset](OFFICIAL_ASSET.md).

`metadata.template.json` es un borrador NO PUBLICABLE: image=null. Nombre, símbolo, descripción exacta y omisión de web están aprobados; ver [CONTENT_APPROVAL.json](CONTENT_APPROVAL.json). Arweave es la preferencia aprobada, sin proveedor ni coste elegido y sin autorización de subida, publicación o pagos. El logo está incorporado y su hash fijado en `config/robusto-production.json`; publicar solo tras autorización en almacenamiento duradero y registrar imageUri real. `npm run robusto:prepare-metadata` exige archivo/hash y URI válida y genera bytes separados en `target/robusto-metadata/`. No publica ni realiza transacciones.

La metadata on-chain deberá tener isMutable=true y conservar una update authority bajo custodia aprobada. Poder actualizar metadata es independiente de dejar fijo el supply del mint. Cambios posteriores de nombre/logo requieren publicar nuevos bytes y actualizar la URI; no se revoca esa autoridad. Una URI content-addressed no implica que la cuenta on-chain sea inmutable.

`metadata/metadata.json`, `papa-logo.png` y `popecoin-logo.png` son históricos e intactos. Los comandos antiguos de metadata siguen siendo para PAPA, no deben usarse para ROBUSTO.

La configuración candidata se marca NOT_AUTHORIZED_FOR_MAINNET. Mint authority y metadata update authority tienen campos separados; el validador rechaza claves inválidas/default y la reutilización del mismo firmante de mint/upgrade para metadata. Custodia multisig/PDA requeriría revisión explícita; no se infiere de una dirección.

Cierre: validación PNG de estructura/chunks/CRC y hash (no sustituye aprobación visual); `robusto:metadata-publication` prepara manifiesto proveedor-neutral y compara descargas locales byte a byte. external_url=null expresa la decisión aprobada de omitir web y el generador no lo incluye en el JSON final. image/URI permanecen pendientes. Actualización de nombre/URI y políticas: [ROBUSTO_AUTHORITIES](../../docs/ROBUSTO_AUTHORITIES.md). No uploader/proveedor seleccionado ni publicación ejecutada.
