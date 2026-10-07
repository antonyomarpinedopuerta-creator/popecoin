# ROBUSTO — autoridades conservadas

La topología de Mainnet y la política de recuperación se preparan en [ROBUSTO_MAINNET_IDENTITY_CUSTODY.md](ROBUSTO_MAINNET_IDENTITY_CUSTODY.md). El inventario público sigue vacío. El builder aún acopla mint authority con la cuenta fuente/distribución y debe separarse antes de crear identidades definitivas.

No se revoca ni transfiere ninguna autoridad aquí. Tres custodias distintas:

| Autoridad | Poder | Política actual |
|---|---|---|
| Mint authority | Crear supply SPL adicional mientras siga activa | Conservar. Emisión candidata única 1e15 raw; reconciliar antes de considerar revocación futura |
| Metadata update authority | Actualizar nombre/símbolo/URI dentro del estándar; URI apunta a descripción/imagen/enlaces | Conservar separada, metadata mutable; no hacer immutable |
| Program upgrade authority | Actualizar binario y sus reglas | Conservar separada; revisión/custodia de upgrades pendiente |

Payer operativo separado. Public keys/config no contienen secretos; keys nunca en Git/chat. Hardware o multisig y control de los signers son decisiones pendientes, no hechos certificados. Los builders actuales usan signers individuales; PDA/multisig exige diseño e integración explícitos. Múltiples claves en una misma máquina no equivalen a independencia de custodia.

Cambios posteriores de metadata: aprobar contenido y archivo exacto, generar JSON separado, publicar nuevos bytes en hosting elegido, comparar descargas, fijar digest/URI nuevos, preparar `buildMetadataUpdate`, simular estado real con update authority, revisar y aprobar firma. Conservar isMutable=true y autoridad existente. No sustituir la imagen oficial por una generada. Nombre ≤32 bytes y símbolo ≤10 bytes; cambiar estos datos no altera mint/supply ni vesting. [Estándar Metaplex](https://www.metaplex.com/docs/smart-contracts/token-metadata/update).

## Revocación futura de mint authority

Solo después de aprobación irreversible explícita: revisar supply definitivo, distribución/vesting reconciliados, metadata y autoridades verificadas, control/custodia y cobertura de costes. Tomar snapshot fresco en red verificada. `prepareMintRevocation` produce únicamente SetAuthority(MintTokens, null), exige token de aprobación ligado a SHA256 del plan y ejecuta reconciliación sobre snapshot aportado; no verifica por sí solo que ese snapshot sea fresco/RPC auténtico. Debe venir de `verifyProductionSnapshot` y revisión operativa. No se llama en este cierre salvo test de rechazo sin autorización. Simular/revisar mensaje exacto antes de firma externa. Guardar firma/slot y verificar mintAuthority=null, supply intacto, freeze=null. Irreversible: no es posible restaurar capacidad de emisión.

## Retirar update authority / hacer metadata immutable

NO permitido por política vigente. Si el propietario cambia esa política en el futuro, requiere autorización separada que reconozca pérdida de actualización de nombre/descripción/imagen/enlaces, conservación del contenido publicado y custodia de recuperación. Revisar versión/semántica Metaplex vigente, simular operación exacta y verificar después. No hay builder automático para hacer immutable o asignar una autoridad inaccesible. Immutable no revierte a mutable en el estándar actual; no usar esta opción como ahorro de capital.

## Revocación futura de program upgrade authority

NO permitida ahora. Requisitos: revisión independiente, reproducción del binario real, lifecycle de producción probado, ningún cambio necesario conocido, aceptación explícita de que los bugs no podrán corregirse con upgrade. Preparar operación loader SetAuthority(None) con herramientas oficiales verificadas para la versión vigente; simular/revisar/firma separada, y comprobar ProgramData.upgradeAuthority=null y ELF intacto. Nunca añadir `--final` a un deploy por defecto.

Una transferencia futura a una nueva custodia exige verificar tanto al emisor como al receptor, red, mensaje y recuperación antes de ejecutar. No confundir transferir autoridad con revocarla. No se han generado claves de producción.
