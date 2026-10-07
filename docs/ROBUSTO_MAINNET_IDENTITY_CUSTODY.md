# ROBUSTO — identidad y custodia Mainnet (preparación)

**Estado:** `MAINNET_DISABLED` / `NOT_AUTHORIZED_FOR_MAINNET`. Diseño recomendado, sin direcciones definitivas. No se generaron, cargaron ni consultaron keypairs en esta etapa; no se leyeron archivos de wallet. No usar identidades de PAPA, Devnet, rehearsal ni `~/.config/solana/id.json`.

## Arquitectura recomendada

Usar ocho wallets on-curve distintas, bajo control hardware/offline independiente. Las direcciones públicas se anotan en `config/robusto-mainnet-public-addresses.json`; el inventario contiene solo rol → address. Los builders actuales exigen firmantes individuales on-curve. No declarar soporte multisig/PDA signer: si se desea multisig, primero se diseña, implementa y prueba ese adapter para Token, Metaplex, vesting y upgrade loader.

| Rol | Wallet/keypair | Cuenta/token destino | Uso y firma |
|---|---|---|---|
| `market` | Sí, independiente; hardware signer frío | ATA ROBUSTO del owner market. Custodia también la ATA que recibe el NFT de posición | Recibe el bucket aprobado de 500M; inventario objetivo de pool 1M queda en esta tesorería hasta la operación aprobada. Firma depósito/administración/retirada de la posición mediante el owner del NFT y transferencias market aprobadas. No es mint authority ni payer. |
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

**Conteo para el ciclo completo:** 8 keypairs de rol duraderos + 1 keypair temporal de la cuenta mint en su etapa posterior. Ninguno se crea ahora. “Keypair” identifica el par criptográfico y no implica exportar o guardar un archivo JSON.

La wallet principal del propietario para ROBUSTO será `team_founder`, si el propietario confirma que es el beneficiario de los 50M. Recibirá únicamente liberaciones del vesting y permitirá al beneficiario firmar sus claims; no será wallet de mercado ni autoridad de emisión. Se podrá mostrar como watch-only o conectarse mediante hardware compatible. La aplicación/dispositivo concreto queda a elección del propietario; no se importará una seed en Phantom u otra app.

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

## Procedimiento futuro del propietario para crear las identidades

Solo tras autorización específica de crear identidades; estos pasos aún no se ejecutan:

1. **Cerrar titulares y recuperación.** Completar los responsables de cada rol, beneficiary team/reserve, quién recupera cada hardware signer y quién es el beneficiario founder. Confirmar al wallet team/founder como wallet principal del propietario, o registrar que esa propuesta se rechaza. No inventar fecha base: vesting base sigue siendo fecha real de lanzamiento.
2. **Cerrar el diseño técnico.** La separación mint authority/source market está implementada y probada. Antes de identidades, revisar mensajes unsigned finales con las direcciones públicas; confirmar compatibilidad on-curve y decidir si se desplegará el programa de vesting. No usar multisig hasta soporte probado.
3. **Preparar ambiente offline limpio.** Dispositivo dedicado y actualizado, software/hardware del fabricante verificado desde origen oficial, sin screen recording, sync, telemetría de clipboard ni shell-history. Nunca abrir o sobrescribir `~/.config/solana/id.json`; no importar wallets históricas/Devnet y no conectar Phantom automáticamente.
4. **Crear ocho identidades de rol.** Con firmware/software del fabricante verificado desde su origen oficial, generar una identidad nueva por rol en hardware signer o dispositivo offline dedicado. Cotejar cada dirección pública en la pantalla confiable del dispositivo y anotarla bajo el rol correspondiente. No derivar varias funciones de la misma clave. No crear el keypair temporal del mint en esta etapa.
5. **Respaldar y recuperar en privado.** Seguir el mecanismo documentado por el fabricante. Si usa frase de recuperación, escribirla a mano, comprobarla en el dispositivo y sellar cada respaldo físico por separado; no fotografiar, digitalizar, copiar al clipboard ni compartir. Guardar una copia redundante en otra ubicación física segura con acceso/custodio controlados. No añadir passphrase, Shamir ni software de terceros sin decisión y prueba específicas. Excluir todos los respaldos privados de Git/GitHub, logs, chat, backups públicos, OneDrive, Dropbox, email y cualquier cloud no autorizado.
6. **Probar recuperación offline.** En hardware compatible separado y sin RPC, comprobar que el respaldo restaura/controla la misma dirección pública. Registrar solo `PASS/FAIL`, rol, fecha y custodios, nunca material secreto. Si falla, no usar esa identidad; crear otra después de autorización y repetir la prueba.
7. **Comprobar separación y procedencia.** Verificar que las ocho direcciones son distintas, canónicas, on-curve y no están protegidas por el inventario histórico PAPA/Devnet/rehearsal. `npm run robusto:custody-inventory` ahora comprueba esas condiciones y rechaza direcciones históricas; luego cotejar manualmente cada dirección con la pantalla del hardware y el rol asignado.
8. **Registrar solo el inventario público, tras autorización específica.** Escribir únicamente `ROLE -> PUBLIC ADDRESS` en `config/robusto-mainnet-public-addresses.json`; sin nombres, custodios, ubicación, estado privado de recovery ni secretos. Ejecutar el validador y confirmar `COMPLETE_PUBLIC_ADDRESSES`, 8 roles y 8 direcciones únicas. Revisar `git diff`, correr security scan y comprobar manualmente que el cambio contiene solo direcciones públicas. El archivo permanece actualmente con todos los valores `null`.
9. **Vincular roles a cuentas.** Calcular mint, ATAs, vesting PDAs/vaults, metadata PDA y Meteora accounts usando las direcciones y mint/program IDs aprobados; verificar el cálculo independientemente y registrar solo public addresses. No crear ninguna cuenta hasta autorización transaccional separada.
10. **Wallet de visualización.** Usar `team_founder` como wallet principal del propietario si confirma que es su beneficiario. Consultar la dirección como watch-only o conectar el hardware compatible para firmar claims propios. Las demás funciones pueden añadirse como watch-only. El propietario elegirá aplicación o explorador; no se instalará Phantom ni se entregarán/importarán claves automáticamente.

## Controles anti-filtración

- Mantener secretos en hardware/offline; no usar archivos JSON de keypair en el workspace. `.gitignore` ya ignora nombres comunes, pero ignore no es control suficiente: no crear archivos secretos bajo el repo.
- El backup público debe contener únicamente repo/artefactos/evidencia pública; revisar inventario/hash y secret scan antes de publicarlo. Las claves no son recuperables desde ese backup.
- GitHub: proteger `master`, habilitar Secret Scanning y Push Protection donde estén disponibles, restringir acciones/tokens CI a mínimo permiso, no colocar valores privados en GitHub Actions secrets si no hay workflow que los necesite.
- Logs: comandos de custodia deben emitir status/address público solamente; no usar `set -x`, `cat`, `jq` o `tee` sobre wallet material. No capturar terminal de hardware ni clipboard. El validador actual procesa solamente el JSON público del inventario y errores genéricos.
- OneDrive/cloud: excluir explícitamente los dispositivos/medios y cualquier directorio de backup privado de sync; no confiar solo en un icono de carpeta. El inventario de addresses sí puede ser público, pero nunca se usará cloud como custodia de private keys.
- Chat: comunicar direcciones públicas si hace falta; nunca mnemonic, seed, private key, QR de recovery, wallet JSON ni fotos del hardware recovery.

## Pendiente inmediatamente después de esta preparación

1. Antes de crear las ocho identidades, el propietario debe confirmar beneficiarios de `team_founder` y `reserve`, titular/custodio y recuperador de cada rol, separación de dispositivos/medios, y si desplegará el programa de vesting propio (uso de `program_upgrade_authority`). La fecha base de vesting sigue pendiente y no se inventa en esta etapa.
2. El propietario debe escoger la aplicación (si desea una) para mostrar `team_founder`, y aprobar quién controla/accede a los respaldos físicos. `team_founder` será la wallet principal solo tras confirmar que el propietario es el beneficiario.
3. Después de autorización específica de crear identidades, se generan ocho signers de rol y se prueba su recuperación offline; solo las direcciones públicas se registran. El signer temporal del mint y las ATAs/PDAs corresponden a etapas posteriores.
4. Después aún quedan fecha base real, precio/rango actualizado con cotización, presupuesto, publicación metadata/Arweave, mecanismo de mercado y autorizaciones separadas por operación Mainnet.

Nada de esta etapa habilita Mainnet, RPC de escritura, fondos, mint, metadata, firmantes o transacciones.
