# ROBUSTO — identidad y custodia Mainnet (preparación)

**Estado:** `MAINNET_DISABLED` / `NOT_AUTHORIZED_FOR_MAINNET`. Diseño recomendado, sin direcciones definitivas. No se generaron, cargaron ni consultaron keypairs en esta etapa; no se leyeron archivos de wallet. No usar identidades de PAPA, Devnet, rehearsal ni `~/.config/solana/id.json`.

## Arquitectura recomendada

Usar ocho wallets on-curve distintas, una por rol, creadas en una sesión Linux aislada sin red y guardadas como archivos cifrados offline. El propietario confirma que el Samsung S22 se desbloquea y admite transferencia USB; falta una prueba física de ida/vuelta y recuperación con fixture. El preflight actual sigue mostrando swap, `umask` permisivo y tmpfs dedicado ausente; controles de Windows no verificados. La laptop **todavía no está lista**. Aun mitigado, WSL2 no iguala hardware signer ni protege contra Windows comprometido.

Las direcciones públicas se anotan en `config/robusto-mainnet-public-addresses.json`; el inventario contiene solo rol → address. Los builders actuales exigen firmantes individuales on-curve. No declarar soporte multisig/PDA signer: si se desea multisig, primero se diseña, implementa y prueba ese adapter para Token, Metaplex, vesting y upgrade loader.

| Rol | Wallet/keypair | Cuenta/token destino | Uso y firma |
|---|---|---|---|
| `market` | Sí, independiente; offline | ATA ROBUSTO del owner market. Custodia también la ATA que recibe el NFT de posición | Recibe el bucket aprobado de 500M; inventario objetivo de pool 1M queda en esta tesorería hasta la operación aprobada. Firma depósito/administración/retirada de la posición mediante el owner del NFT y transferencias market aprobadas. No es mint authority ni payer. |
| `community` | Sí, independiente; firma de campaña separada | ATA ROBUSTO comunitaria | Recibe el bucket 150M. Hasta 2M es solo techo de circulación inicial; el remanente 148M permanece en la misma tesorería fría, sin desembolsos automáticos. Cada gasto/campaña requiere aprobación individual. La separación es de custodia/proceso, no bloqueo programático. |
| `reserve` | Sí, keypair beneficiaria independiente | Los 300M aprobados quedan en la token vault ATA cuyo owner es la vesting PDA; luego las liberaciones llegan a la ATA ROBUSTO del beneficiario | Firma como beneficiario al inicializar el schedule y al reclamar. No recibe el principal directamente en una wallet disponible durante vesting. Beneficiario/custodia aún sin decidir. |
| `team_founder` | Sí, keypair beneficiaria independiente | Los 50M aprobados quedan en su vesting vault ATA; liberaciones a su ATA ROBUSTO | Firma como beneficiario al inicializar y reclamar. **Recomendación para wallet principal del propietario:** usar esta wallet como dirección principal para visualizar y controlar la asignación founder, si el propietario es el beneficiario. La dirección concreta depende de esa decisión pendiente. |
| `operational_payer` | Sí, independiente; saldo SOL limitado | System account; no recibe buckets de ROBUSTO | Paga rent/fees de cuentas y mensajes autorizados. Nunca actúa como mint authority, autoridad de metadata, upgrade authority, beneficiario ni custodio del NFT. |
| `mint_authority` | Sí, independiente y fría | Autoridad del mint, no ATA de custodia objetivo | Firma únicamente emisión aprobada/reconciliación y las instrucciones que el estándar requiera para crear metadata. Se conserva por ahora. No debería custodiar el supply fuente ni el NFT. No revocar. |
| `metadata_update_authority` | Sí, independiente y fría | Campo update authority de Metaplex Metadata PDA | Firma cambios aprobados de URI/datos; metadata continúa mutable. No comparte clave con mint o upgrade. |
| `program_upgrade_authority` | Sí, independiente y fría si se despliega el programa de vesting ROBUSTO | Authority del ProgramData del programa propio | Firma upgrades revisados del programa propio. Si no se despliega ese programa, rol `N/A`; no es autoridad del programa Meteora. Meteora mantiene la autoridad que tenga su deployer. No revocar ninguna authority. |

## Conteo exacto de identidades y wallet principal

Para conservar los ocho roles definidos y satisfacer el builder/inventario actual, se crearán **8 keypairs duraderos e independientes**, uno por cada rol de la tabla. Cada keypair corresponde a una única dirección on-curve; no se comparte una clave entre roles. `program_upgrade_authority` será identidad separada; solo se asignará a ProgramData si el propietario decide desplegar el programa propio de vesting ROBUSTO. Si no se despliega, esa clave queda sin asignar ni financiar y el rol es `N/A` para ese despliegue.

En la futura creación del mint SPL clásico hará falta **1 keypair temporal adicional para la cuenta mint**, porque el builder usa `SystemProgram.createAccount` y la cuenta nueva debe firmar su creación. No es una novena wallet de custodia ni autoridad; firma solo esa creación. Tras confirmar la cuenta y su dirección, se elimina el material temporal según el procedimiento de borrado del medio y se conserva únicamente la dirección pública. `mint_authority` sigue siendo otra identidad.

**Conteo exacto de identidades duraderas:** 8. El builder SPL actual añade 1 signer/keypair temporal para crear la cuenta mint (9 keypairs generados en total hasta acuñar; solo 8 quedan como roles de custodia). La rehearsal local Meteora también requirió un signer distinto para `positionNftMint`; por eso el plan de mercado debe prever otro signer temporal en esa etapa. Como el adapter de pool de producción aún no está cerrado, ese signer se considera condicional hasta comprobar el builder/instrucción final. No se incluye ninguno de esos signers temporales en el inventario público de roles. Ninguno se crea ahora. “Keypair” no implica exportar o guardar un archivo JSON.

La wallet principal del propietario para ROBUSTO será `team_founder`, según la decisión del propietario. Recibirá únicamente liberaciones del vesting y permitirá al beneficiario firmar sus claims; no será wallet de mercado ni autoridad de emisión. Para consulta se puede usar su dirección como watch-only. No importar la clave a Phantom ni a una aplicación conectada; una futura firma se hará desde un procedimiento offline revisado.

Los ocho roles necesitan direcciones on-curve firmantes separadas con el builder actual. Una PDA no puede reemplazar directamente una de esas identidades: el validador exige on-curve y el builder usa firmantes individuales. Cualquier adopción de multisig/PDA como autoridad requiere implementar y probar primero el soporte correspondiente para SPL Token, Metaplex, vesting y upgrade loader; no se presume compatible en esta etapa.

### Cuentas derivadas y cuentas con keypair de una sola vez

- ATA ROBUSTO de market, community, team beneficiary y reserve beneficiary: derivadas de `(owner, mint, token program)`; no generan seed/keypair propia. El programa actual también crea la ATA del beneficiario para recibir releases.
- Vesting state y vault para team/reserve: PDAs del programa, derivadas de seeds públicas, beneficiary, mint y program ID. Vault token account es una ATA cuyo token authority/owner es la PDA de vesting. Ninguna private key corresponde a esas PDAs.
- Metaplex metadata: PDA derivada de metadata program y mint; update authority es una de las wallets independientes anteriores.
- Meteora pool, vaults y cuentas de position: cuentas derivadas/creadas conforme al source/IDL oficial fijado y al estado final. El NFT de posición se mantiene en la token account del custodio market. En la rehearsal el mint del NFT requirió un signer de creación temporal; comprobar la instrucción y los signers del release exacto antes de Mainnet.
- ROBUSTO mint clásico: la instrucción actual crea un nuevo account `Mint` con `SystemProgram.createAccount`, por lo que necesita un keypair de mint de una sola vez para crear esa cuenta; no es una autoridad perpetua. Mantener ese material privado hasta confirmar la creación y luego eliminarlo de dispositivos/respaldos temporales de acuerdo al procedimiento seguro. El mint address queda público.
- Cuentas Program/ProgramData, posiciones y vaults no son wallets. No asignarles keypairs ficticios. ProgramData authority es `program_upgrade_authority` si se despliega nuestro programa.
- No requieren keypair: las ATAs (derivadas de owner/mint/token program), los vesting state/vault PDAs y sus ATAs controladas por PDA, Metaplex metadata PDA, ProgramData PDA y cuentas derivadas de pool/vault/position. El NFT de posición es un activo mantenido en una token account, no una wallet. Crear estas cuentas puede requerir rent/fees, pero no añade identidades de custodia.

## Destino y distribución inicial propuestos

El supply/división ya aprobados se conservan: total `1.000.000.000 ROBUSTO`, `1e15` base units; 500M market, 150M community, 300M reserve, 50M team. Freeze authority `None`; metadata mutable. Los límites iniciales aprobados siguen siendo máximos, no transferencias: mercado ≤3M (objetivo operativo 1M), comunidad ≤2M, circulación total ≤5M; reserve/equipo cero circulación inicial.

Después de la asignación total, los saldos objetivo por cuenta son:

| Cuenta final | Tokens | Base units | Observación |
|---|---:|---:|---|
| ATA market | 500.000.000 | 500.000.000.000.000 | Solo hasta cantidad aprobada se aporta a pool; 1M es objetivo, no depósito automático. |
| ATA community | 150.000.000 | 150.000.000.000.000 | Hasta 2M de techo inicial; restante bajo control frío, sin auto-gasto. |
| Vesting vault PDA reserve | 300.000.000 | 300.000.000.000.000 | `start=cliff=base+180d`; end = start + 1095d. |
| Vesting vault PDA team | 50.000.000 | 50.000.000.000.000 | `start=cliff=base+365d`; end = start + 730d. |
| **Total** | **1.000.000.000** | **1.000.000.000.000.000** | Reconciliar supply y cada ATA/vault antes de cualquier gasto. |

### Flujo de emisión y distribución preparado

El builder (`scripts/robusto-production.ts`) separa emisión y custodia: `mintAuthority` firma la única instrucción `MintToChecked` por 1e15 base units; el ATA `market` (también `distributionSourceOwner`) recibe y distribuye el supply. Esa wallet es el rol market ya aprobado, no una novena identidad. `config/robusto-production.json:distributionSourceOwner` debe coincidir exactamente con el bucket `market_ecosystem_launch`.

1. Crear el mint con decimals 6 y freeze authority `None`; crear el ATA market, que será source ATA y cuenta final del bucket market.
2. La mint authority emite exactamente una vez el supply completo al ATA market. No firma transferencias ni depósitos, y no custodia tokens en su propia ATA.
3. Market firma el envío exacto de 150M al ATA community y los depósitos de 300M/50M a los vaults reserve/team. Reserve/team firman como beneficiarios sus inicializaciones; sus wallets no reciben el principal durante vesting.
4. Reconciliar supply=1e15, ATA market/source=500M, ATA community=150M, vault reserve=300M y vault team=50M. El ATA market compartido se cuenta una sola vez. El builder rechaza otros porcentajes, cantidades, beneficiarios/source distintos, vesting no aprobado, roles alias e identidades históricas.

El ATA market controla transitoriamente los 1B después de acuñar hasta terminar transfers y depósitos. Debe tratarse como etapa crítica: wallet market fría, ejecución por mensajes revisados y reconciliación antes de cualquier otra operación. El preflight impide repetir la emisión si supply o source ya tienen saldo.

## Procedimiento offline futuro para crear las identidades

Este procedimiento no se ejecuta ahora. La generación requiere autorización posterior específica y nunca debe hacerse en el equipo conectado a Internet que contiene el repositorio.

1. **Preparar estación.** Seguir `ROBUSTO_LAPTOP_WSL_CUSTODY_PREPARATION.md`: host desconectado físicamente, WSL `networkingMode=none`, `swap=0`, hibernación/Fast Startup desactivados, BitLocker verificado, copia GPG local y recuperación S22 por MTP probada con fixtures. Solana documenta que keypair CLI es texto plano y por defecto usa `~/.config/solana/id.json`; siempre se usará una ruta temporal explícita, nunca la configuración global. No leer ni sobrescribir identidades existentes.
2. **Preparar RAM y permisos.** `/run` y `/dev/shm` actuales son tmpfs de solo lectura. Tras deshabilitar WSL swap, crear tmpfs dedicado `/mnt/robusto-ram`; verificar tmpfs escribible, modo `0700`, `nosuid,nodev,noexec`, propietario correcto y escritura. Usar `umask 077`; detenerse si el preflight no queda sin `BLOCK` o algún control del host sigue sin verificar. No se aplicaron estos cambios ni se reinició WSL.
3. **Generar sin revelar.** Usar Solana CLI oficial verificado, con ruta explícita `/mnt/robusto-ram/<role>.json` y `--silent`, una identidad nueva por rol. El código oficial indica que `--silent` no muestra la frase de recuperación. Revisar versión/comando antes de usar. No usar `set -x`; no poner secretos en argumentos, variables, historial, configuración o clipboard. Los JSON son secretos en claro aunque estén en RAM: permisos `0600`, directorio `0700`, jamás copiarlos al repo.
4. **Separar identidades.** Crear cada rol por separado, sin reutilizar secretos ni derivar funciones de una frase compartida. `operational_payer` se mantiene independiente y con saldo operativo mínimo solo cuando exista autorización. `mint_authority`, `metadata_update_authority` y `program_upgrade_authority` permanecen offline y separados; no cargarlos junto al payer. `team_founder` es la wallet principal del propietario; `reserve` conserva custodio y proceso separados. La fecha base sigue pendiente.
5. **Respaldar solo cifrado.** Crear ciphertext GPG AES-256/MDC por rol en carpeta local privada fuera del repo, bajo el volumen WSL protegido por BitLocker, y copiarlo por cable al S22. La transferencia MTP al teléfono debe haberse probado antes con fixtures y el S22 desbloqueable; no usar cloud. Desactivar caché de passphrase (`--no-symkey-cache`); ingresarla solo en prompt oculto, nunca como argumento, variable o log. Guardar passphrases únicas en papel sellado separado de ambos dispositivos. No archivar JSON sin cifrar.
6. **Probar recuperación sin red.** En la estación aislada, montar un segundo tmpfs privado y descifrar cada copia directamente allí, nunca al repo o disco normal. Ejecutar `solana-keygen pubkey <ruta-temporal>` y comparar con la dirección pública anotada. Guardar solo rol, dirección, fecha y `PASS`; no abrir ni imprimir el archivo privado. Repetir desde la segunda copia. Ante discrepancia, registrar `FAIL` y detenerse. Apagar la estación al acabar para vaciar RAM.
7. **Extraer solo direcciones públicas.** `solana-keygen pubkey <ruta-en-tmpfs>` imprime únicamente la dirección pública. Copiarla a mano al inventario por rol sin mover el JSON. Verificar ocho direcciones únicas, canónicas y on-curve y compararlas con las direcciones protegidas de Devnet/rehearsal; cualquier colisión detiene la ceremonia y exige reemplazar la identidad. No se necesita RPC.
8. **Registrar inventario tras autorización.** Editar `config/robusto-mainnet-public-addresses.json` únicamente con `ROLE -> PUBLIC ADDRESS`. No incluir nombres legales, ubicaciones, custodios, rutas de backup, QR ni estado secreto. Ejecutar `npm run robusto:custody-inventory`; revisar que el diff contenga solo ocho direcciones públicas. Esto no asigna autoridades ni crea cuentas.
9. **Eliminar temporales con cautela.** Tras confirmar dos backups recuperables, eliminar las rutas temporales y apagar. No confiar en `shred` sobre SSD, flash, copy-on-write o journaling: no garantiza borrado físico. La defensa es que los secretos en claro solo existieron en RAM con swap/hibernación desactivados. Si alguno llegó a almacenamiento persistente, considerar comprometida la identidad y detenerse para rotación/recreación autorizada.
10. **Firma futura separada.** Esta ceremonia solo crea y respalda identidades; no autoriza firmas o transacciones. Antes de cualquier operación se diseñará un flujo offline de firma con mensajes legibles y verificación independiente de cluster, genesis, direcciones y cantidades. No copiar claves a Phantom ni a equipo online. Si no existe un método de firma offline compatible, detenerse y conseguir hardware wallet o custodia/multisig soportada, en vez de cargar ocho claves en línea.

## Controles anti-filtración

- Mantener secretos en RAM temporal y backups cifrados offline; no usar archivos JSON de keypair en el workspace. `.gitignore` ya ignora nombres comunes, pero ignore no es control suficiente: no crear archivos secretos bajo el repo.
- El backup público debe contener únicamente repo/artefactos/evidencia pública; revisar inventario/hash y secret scan antes de publicarlo. Las claves no son recuperables desde ese backup.
- GitHub: proteger `master`, habilitar Secret Scanning y Push Protection donde estén disponibles, restringir acciones/tokens CI a mínimo permiso, no colocar valores privados en GitHub Actions secrets si no hay workflow que los necesite.
- Logs: comandos de custodia deben emitir status/address público solamente; no usar `set -x`, `cat`, `jq` o `tee` sobre wallet material. No grabar la pantalla ni usar clipboard durante la ceremonia. El validador actual procesa solamente el JSON público del inventario y errores genéricos.
- OneDrive/cloud: no usar OneDrive, Dropbox, correo, cloud backup ni backups públicos para medios o archivos de clave, cifrados o no, salvo decisión explícita futura. El inventario de direcciones sí puede ser público, pero cloud nunca custodiará claves privadas.
- Chat: comunicar direcciones públicas si hace falta; nunca mnemonic, seed, private key, QR de recovery, wallet JSON ni fotos del hardware recovery.

## Pendiente inmediatamente después de esta preparación

1. Antes de crear identidades, el propietario designa titular/custodio y recuperador por rol, el lugar físico para guardar la passphrase de recuperación y verifica host, WSL, cifrado de disco, swap y pantalla/MTP del S22. `team_founder` es la wallet principal; `reserve` permanece bajo custodia separada. La fecha base sigue pendiente.
2. El requisito inmediato es resolver los controles de la laptop, verificar Windows y completar una prueba física MTP/recuperación del fixture en el S22. La confirmación del propietario de que se desbloquea y transfiere por USB no sustituye esa prueba. Después se requiere autorización específica para generar ocho identidades; no incluye asignar autoridades, financiar, firmar o transaccionar.
3. Tras esa autorización, el propietario ejecuta la ceremonia localmente y registra solo las direcciones públicas. El signer temporal del mint y las ATAs/PDAs corresponden a etapas posteriores.
4. Después aún quedan fecha base real, precio/rango actualizado con cotización, presupuesto, publicación metadata/Arweave, mecanismo de mercado y autorizaciones separadas por operación Mainnet.

Nada de esta etapa habilita Mainnet, RPC de escritura, fondos, mint, metadata, firmantes o transacciones. Fuentes oficiales: [Solana CLI Basics](https://solana.com/docs/intro/installation/solana-cli-basics), [código oficial de keygen](https://github.com/solana-labs/solana/blob/master/keygen/src/keygen.rs) y [manual de GnuPG](https://gnupg.org/documentation/manuals/gnupg/Operational-GPG-Commands.html).
