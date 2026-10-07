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

Las ocho funciones significan ocho pubkeys distintas si `program_upgrade_authority` aplica. Una misma persona puede ser responsable de más de un rol solo si se acepta expresamente, pero las claves/controladores deben seguir separados. La propuesta recomendada es custodios/medios separados; duplicar claves en una sola máquina no cuenta como separación.

### Cuentas derivadas y cuentas con keypair de una sola vez

- ATA ROBUSTO de market, community, team beneficiary y reserve beneficiary: derivadas de `(owner, mint, token program)`; no generan seed/keypair propia. El programa actual también crea la ATA del beneficiario para recibir releases.
- Vesting state y vault para team/reserve: PDAs del programa, derivadas de seeds públicas, beneficiary, mint y program ID. Vault token account es una ATA cuyo token authority/owner es la PDA de vesting. Ninguna private key corresponde a esas PDAs.
- Metaplex metadata: PDA derivada de metadata program y mint; update authority es una de las wallets independientes anteriores.
- Meteora pool, vaults y cuentas de position: cuentas derivadas/creadas conforme al source/IDL oficial fijado y al estado final. El NFT de posición se mantiene en la token account del custodio market. En la rehearsal el mint del NFT requirió un signer de creación temporal; comprobar la instrucción y los signers del release exacto antes de Mainnet.
- ROBUSTO mint clásico: la instrucción actual crea un nuevo account `Mint` con `SystemProgram.createAccount`, por lo que necesita un keypair de mint de una sola vez para crear esa cuenta; no es una autoridad perpetua. Mantener ese material privado hasta confirmar la creación y luego eliminarlo de dispositivos/respaldos temporales de acuerdo al procedimiento seguro. El mint address queda público.
- Cuentas Program/ProgramData, posiciones y vaults no son wallets. No asignarles keypairs ficticios. ProgramData authority es `program_upgrade_authority` si se despliega nuestro programa.

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

### Bloqueo que debe resolverse antes de crear identidades

El builder actual (`scripts/robusto-production.ts`) crea la source ATA a nombre de `mintAuthority`, acuña ahí los 1e15 base units y usa esa misma autoridad como firmante de transfers y depósitos de vesting. Eso mezcla emisión y custodia temporal del supply completo; **no cumple la separación recomendada**.

Antes de generar identidades, actualizar y probar el builder para que:

1. Cree la source ATA temporal bajo una autoridad de distribución separada de `mint_authority` (recomendación: wallet market fría dedicada; la wallet market recibiría temporalmente todo el supply durante la distribución).
2. `mint_authority` firme `MintToChecked` solamente; la autoridad de distribución firme transfers al ATA community y depósitos a los vesting vaults. Team/reserve wallets firman como beneficiarios sus `Initialize`.
3. Requiera reconciliación del source a cero y balances finales de buckets/vaults al supply exacto, y falle ante reuse de autoridad, recipient/ATA incorrecta o distribución parcial.
4. Muestre explícitamente que market tendrá control transitorio del supply completo entre la acuñación y los transfers. Preparar secuencia segura, límites y autorizaciones por instrucción antes de cualquier mensaje Mainnet.

No generar identidades para un flujo que aún mezcla autoridades. La source temporal usa el rol market existente, así no se añade un noveno custodio permanente; exige que la wallet market sea fría y permanezca sin firmar mercado/marketing mientras mantiene saldo transitorio.

## Procedimiento futuro del propietario para crear las identidades

Solo tras autorización específica de crear identidades; estos pasos aún no se ejecutan:

1. **Cerrar titulares y recuperación.** Completar los responsables de cada rol, beneficiary team/reserve, quién recupera cada hardware signer y quién es el beneficiario founder. Confirmar al wallet team/founder como wallet principal del propietario, o registrar que esa propuesta se rechaza. No inventar fecha base: vesting base sigue siendo fecha real de lanzamiento.
2. **Cerrar el diseño técnico.** Corregir el builder para separar mint authority/source market, probar la matriz de firmantes, verificar compatibilidad on-curve y decidir si el programa de vesting se desplegará. No usar multisig hasta soporte probado.
3. **Preparar ambiente offline limpio.** Dispositivo dedicado y actualizado, software/hardware del fabricante verificado desde origen oficial, sin screen recording, sync, telemetría de clipboard ni shell-history. Nunca abrir o sobrescribir `~/.config/solana/id.json`; no importar wallets históricas/Devnet y no conectar Phantom automáticamente.
4. **Generar en hardware signer.** Crear ocho identidades independientes según cada rol —y el mint keypair temporal solo en su etapa— dentro del hardware signer/dispositivo offline. Nunca imprimir, copiar al clipboard, pasar por argumentos/env vars, pegar al chat o mostrar seed/private key. Verificar cada address en pantalla del hardware y exportar únicamente el address público.
5. **Copias privadas offline.** Anotar seed solo en respaldo físico seguro cuando el hardware lo requiera. Guardar copias cifradas de material privado en dos medios offline distintos bajo custodios/accesos separados, fuera de equipos conectados. No guardar secreto o seed en Git/GitHub, logs, ticket/chat, backup público, OneDrive, Dropbox, email ni cualquier cloud no autorizado. No respaldar imágenes de recovery phrase.
6. **Prueba de recuperación.** Verificar en dispositivo offline alternativo que el respaldo recupera la misma dirección, sin transmitir secretos ni conectarse a Mainnet. Documentar solo resultado/pass, custodio, fecha y fingerprint público del dispositivo si aplica.
7. **Verificar separación antes de registrar.** Comparar las ocho direcciones: ninguna igual a otra, histórica, Devnet, mint/program, o global keypair. Revisar algoritmo on-curve y builder público. Si address se repite, firma se filtró, la recuperación no coincide o un secreto tocó un canal conectado, destruir/revocar el proceso y reiniciar la identidad afectada antes de uso; no registrar ese material.
8. **Publicar solo inventario público.** Escribir únicamente los ocho addresses en `config/robusto-mainnet-public-addresses.json`. Ejecutar `npm run robusto:custody-inventory`; el validador acepta solo los ocho roles exactos, null o addresses canónicos on-curve únicos, y no imprime errores/input. Inspeccionar `git diff -- config/robusto-mainnet-public-addresses.json` para confirmar que solo hay public keys; escáner de secretos, revisión humana y push protection de GitHub antes del commit. El repositorio nunca guarda signer files.
9. **Vincular roles a cuentas.** Calcular mint, ATAs, vesting PDAs/vaults, metadata PDA y Meteora accounts usando las direcciones y mint/program IDs aprobados; verificar el cálculo independientemente y registrar solo public addresses. No crear ninguna cuenta hasta autorización transaccional separada.
10. **Wallet de visualización.** Añadir `team_founder` (cuando el propietario sea el beneficiario) como wallet principal de ROBUSTO para ver tokens liberados y firmar sus propios claims. Añadir market/community/reserve y demás roles como watch-only en la herramienta que el propietario elija, para revisar balances agregados. Las direcciones watch-only no permiten transferir. El propietario elige wallet/app; el procedimiento no instala Phantom ni entrega claves a una app.

## Controles anti-filtración

- Mantener secretos en hardware/offline; no usar archivos JSON de keypair en el workspace. `.gitignore` ya ignora nombres comunes, pero ignore no es control suficiente: no crear archivos secretos bajo el repo.
- El backup público debe contener únicamente repo/artefactos/evidencia pública; revisar inventario/hash y secret scan antes de publicarlo. Las claves no son recuperables desde ese backup.
- GitHub: proteger `master`, habilitar Secret Scanning y Push Protection donde estén disponibles, restringir acciones/tokens CI a mínimo permiso, no colocar valores privados en GitHub Actions secrets si no hay workflow que los necesite.
- Logs: comandos de custodia deben emitir status/address público solamente; no usar `set -x`, `cat`, `jq` o `tee` sobre wallet material. No capturar terminal de hardware ni clipboard. El validador actual procesa solamente el JSON público del inventario y errores genéricos.
- OneDrive/cloud: excluir explícitamente los dispositivos/medios y cualquier directorio de backup privado de sync; no confiar solo en un icono de carpeta. El inventario de addresses sí puede ser público, pero nunca se usará cloud como custodia de private keys.
- Chat: comunicar direcciones públicas si hace falta; nunca mnemonic, seed, private key, QR de recovery, wallet JSON ni fotos del hardware recovery.

## Pendiente inmediatamente después de esta preparación

1. Implementar/pruebar el cambio del builder que separa market distribution source de mint authority; actualizar tests para todos los signer roles sin generar identidades definitivas.
2. Propietario asigna titulares/custodios, recuperadores y beneficiarios team/reserve; decide si team/founder será su wallet principal. No se puede rellenar inventario hasta que las identidades se creen por el propietario.
3. Solo entonces, con autorización separada y sin operaciones blockchain, el propietario crea los signers y registra sus public addresses; revisar ATAs/PDA previews.
4. Persisten después precio/rango SOL final con live quote y aprobación, importe efectivo/campañas, presupuesto y gastos Arweave, y autorizaciones independientes por transacción.

Nada de esta etapa habilita Mainnet, RPC de escritura, fondos, mint, metadata, firmantes o transacciones.
