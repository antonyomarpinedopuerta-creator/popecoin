# Metadata ROBUSTO

Marca: ROBUSTO. Símbolo de metadata: ROBUSTO; representación pública: $ROBUSTO. Decimales del mint: 6.

Imagen oficial pendiente: perro negro/gris abrazando un cohete. Ruta reservada: `metadata/robusto/robusto-logo.png`. No se encontró un archivo identificable como ROBUSTO en el repositorio ni en las carpetas habituales revisadas. No generar sustituto ni copiar los logos PAPA.

`metadata.template.json` es un borrador NO PUBLICABLE: image=null. La descripción queda para revisión editorial. Al recibir la imagen oficial, verificarla visualmente y registrar su SHA-256 aprobado en `config/robusto-production.json`; publicar solo tras autorización en almacenamiento duradero y registrar imageUri real. `npm run robusto:prepare-metadata` exige archivo/hash y URI válida y genera bytes separados en `target/robusto-metadata/`. No publica ni realiza transacciones.

La metadata on-chain deberá tener isMutable=true y conservar una update authority bajo custodia aprobada. Poder actualizar metadata es independiente de dejar fijo el supply del mint. Cambios posteriores de nombre/logo requieren publicar nuevos bytes y actualizar la URI; no se revoca esa autoridad. Una URI content-addressed no implica que la cuenta on-chain sea inmutable.

`metadata/metadata.json`, `papa-logo.png` y `popecoin-logo.png` son históricos e intactos. Los comandos antiguos de metadata siguen siendo para PAPA, no deben usarse para ROBUSTO.
