# ROBUSTO — prueba física de fixture cifrado S22

Fecha: 2026-10-10. Estado: **PASSED_PHYSICAL_FIXTURE_OWNER_CONFIRMED / NOT_AUTHORIZED_FOR_MAINNET**.

## Transporte físico confirmado por el propietario

El propietario confirmó que el Samsung aparece como «S22 de Antony», desbloqueado y conectado mediante USB, con almacenamiento interno accesible en Windows Explorer. Confirmó que ambos archivos ficticios están en `Download` del teléfono y que los arrastró desde allí hasta una carpeta nueva de Ubuntu:

`/home/antony/ROBUSTO-S22-RECUPERACION-FISICA-20261010-03`

La procedencia USB/MTP y el uso de carpeta nueva son confirmaciones del propietario; el agente no observó directamente Explorer ni enumeró el teléfono. No se reutilizó la carpeta de la primera verificación, cuya copia tenía procedencia ambigua por un aviso de archivos existentes. La inspección de la carpeta `-03` se hizo después de la transferencia; no se certificó directamente que estuviera vacía antes.

## Verificación local ejecutada

Origen de comparación: `/home/antony/ROBUSTO-S22-TEST-20261010`.

Ambos archivos originales y recuperados existen como archivos regulares, sin enlaces simbólicos. SHA-256 calculado sobre los bytes de cada copia:

| Archivo | Bytes recuperados | SHA-256 original = recuperado |
|---|---:|---|
| ROBUSTO_S22_TEST_ONLY.gpg | 143 | `f8f5370dba7dc499fe10c7a50856bd41e6801048f89d6f2663aed1fbdcb02aef` |
| ROBUSTO_S22_TEST_ONLY.sha256 | 131 | `a6e3614be1da87fd03784d59956766f100263b40b7b2c2d67bdb5dc593adb92e` |

Los dos manifiestos contienen el hash correcto del ciphertext original. Su ruta textual apunta al archivo original: no se usó esa ruta para verificar la copia recuperada; se calculó explícitamente el hash del archivo de `-03`.

Comando ejecutado:

```bash
bash scripts/robusto-phone-transfer-fixture.sh verify /home/antony/ROBUSTO-S22-RECUPERACION-FISICA-20261010-03/ROBUSTO_S22_TEST_ONLY.gpg f8f5370dba7dc499fe10c7a50856bd41e6801048f89d6f2663aed1fbdcb02aef
```

Salida: `PASS returned ciphertext hash and dummy decrypt/restore`; código de salida 0. GnuPG descifró el archivo recuperado en un directorio temporal y el script comparó exactamente el texto ficticio esperado. Solo se limpiaron los temporales internos del verificador; no se modificaron ni eliminaron originales, archivos recuperados ni archivos del teléfono.

## Alcance y límites

Completada la prueba de almacenamiento y recuperación del fixture por USB con transporte confirmado por el propietario y hashes/descifrado comprobados localmente. No se usaron servicios externos ni nube. No se generaron wallets, claves privadas reales, firmas o transacciones; no se consultó Mainnet. La frase del fixture es pública y nunca debe usarse para respaldos reales.

Esto valida el flujo de transporte y recuperación de datos ficticios en WSL, no descifrado Android, restauración de un signer real, recuperación en otro equipo, independencia de copias ni seguridad del host. Los controles de custodia y estabilidad siguen pendientes. **MAINNET_DISABLED / NOT_AUTHORIZED_FOR_MAINNET** permanecen vigentes.
