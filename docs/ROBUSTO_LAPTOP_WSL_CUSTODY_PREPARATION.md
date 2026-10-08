# ROBUSTO — preparación de custodia en la laptop Windows/WSL

**Estado:** `NOT_AUTHORIZED_FOR_MAINNET`. Documento de preparación, no ceremonia. No se generaron ni leyeron keys, seeds o frases; no se consultó RPC ni se firmó/transaccionó. La prueba descrita abajo es de propiedades del entorno, no una certificación forense del equipo.

## Resultado de la auditoría del entorno disponible

Inspección realizada el 2026-10-07 desde el WSL que contiene este checkout, sin buscar archivos de wallet:

| Área | Observación | Evaluación para secretos |
|---|---|---|
| Linux | Ubuntu en WSL2, kernel `6.18.33.2-microsoft-standard-WSL2`, usuario no-root | Plataforma utilizable para preparación, no aislada del Windows anfitrión |
| Repositorio/home | `/home` está en `ext4` persistente de WSL; home modo `750`, checkout `755` | El repo no aparece bajo una ruta Linux que se llame OneDrive/Dropbox/Drive/iCloud; eso no demuestra dónde está el VHDX ni si Windows respalda/sincroniza ese archivo |
| RAM | Cerca de 7.4 GiB totales y 6.6 GiB disponibles en el momento | Capacidad suficiente; disponibilidad no demuestra que páginas no se guarden en swap/pagefile |
| `/run` | `tmpfs`, aproximadamente 3.8 GiB libres, pero montado `ro` | No utilizable para temporales |
| `/dev/shm` | `tmpfs`, aproximadamente 3.8 GiB libres, pero montado `ro` y modo `755` | No utilizable actualmente; no es privado ni escribible |
| Swap WSL | Swap Linux de 2 GiB activo, con parte ocupada | **Bloqueo actual**: las páginas de tmpfs pueden acabar en swap persistente |
| Permisos | `umask 0022`; home `750`; repo `755` | **Bloqueo actual**: ajustar solo en sesión futura a `umask 077`, directorio RAM `0700`, keyfiles `0600` |
| Red | En esta vista no apareció ruta IPv4 predeterminada; no se pudo consultar Windows desde WSL (`wsl.exe`/PowerShell interop falló) | No demuestra que Wi-Fi/Ethernet del anfitrión estén desconectados. Se requiere apagar físicamente/conmutar toda conectividad en Windows antes de generar |
| Windows | Pagefile, hibernación/Inicio rápido, BitLocker, telemetría, red WSL, historial/transcripción y ubicación del VHDX no verificables desde este entorno | **Pendiente de comprobar manualmente en Windows**; WSL2 comparte el límite de confianza del anfitrión |
| Historial/logs | Este proceso era no interactivo, con history off y xtrace off. No se leyó ningún archivo de historial | No prueba la configuración del Windows Terminal, del shell interactivo futuro, PowerShell transcription ni eventos del host |
| Procesos | La vista de procesos del contenedor mostró solo procesos básicos de la sesión | Vista probablemente acotada; no permite auditar procesos del host Windows, agentes remotos, grabación o EDR |
| Git/cloud | HEAD era `d78fb77f4b4e68c219c4bd609dc8743832a11ceb`; checkout limpio y alineado con `origin/master` | No poner secretos en repo. La ruta Linux no basta para excluir backup/sync del VHDX en Windows |
| Herramientas | Solana keygen `3.1.10`, GnuPG `2.4.8`, OpenSSL `3.5.5` presentes; `cryptsetup` ausente | Solana CLI y GPG bastan para keyfiles en RAM y backup cifrado por archivo. No se ha generado nada. Transferencia al S22 no probada |

La comprobación de Windows falló por la interoperabilidad WSL→Windows y no se sustituyó por inspección de archivos del host. No se inspeccionaron archivos de claves existentes, `~/.config/solana/id.json`, historiales ni patrones de seed/private key.

Revalidación del 2026-10-08 desde `53df7a45c88d27c752c172abf63f2a2fb6a6bc9b`: el preflight volvió a dar 3 `BLOCK` (umask `0022`, swap Linux activo, falta `/mnt/robusto-ram`) y 5 `UNKNOWN`. Las consultas Windows de solo lectura (`powershell.exe` y `wsl.exe --status`) fallaron con `UtilBindVsockAnyPort:309: socket failed 1`; BitLocker, hibernación, pagefile, Windows Security, configuración efectiva de red WSL y cloud/sync quedan **NO VERIFICADO**. No se ejecutó PowerShell elevado ni se reinició WSL.

El propietario confirma que el Samsung Galaxy S22 funciona, se puede desbloquear y admite transferencia por USB. Esto se registra como confirmación, no como evidencia de prueba: WSL no enumeró dispositivo USB/MTP y no se hizo ida/vuelta de un fixture. Un preflight en subshell con `umask 077` reduce los bloqueos a 2 (swap y tmpfs); no altera configuración persistente. No se montó tmpfs porque requiere privilegios y no se cambió `.wslconfig`/reinició WSL porque requieren autorización previa.

La laptop podría servir como entorno de contingencia **solo después** de corregir los bloqueos y aceptar explícitamente el mayor riesgo de software frente a hardware signer. WSL2 no protege secretos contra malware/admin en Windows, captura de memoria, pagefile, hibernación, snapshots del VHDX o acceso físico. Desactivar el swap interno de WSL y usar tmpfs reduce exposición, pero no prueba que Windows nunca pagine la memoria de la VM. BitLocker protege datos apagados en disco si está activo, no un host comprometido mientras la sesión está abierta.

## Conclusión sobre backup con el hardware disponible

El propietario seleccionó el S22 como segunda ubicación de recuperación y fijó presupuesto adicional cero. La confirmación de desbloqueo y USB reduce la incertidumbre de acceso, pero **la recuperación cifrada todavía no está validada** porque falta copiar, devolver, comparar hash y restaurar un fixture. No hay que comprar USB adicional para el procedimiento elegido.

## Preflight actualizado y correcciones propuestas (2026-10-08)

La ejecución solicitada de `bash scripts/robusto-laptop-custody-preflight.sh` observó WSL2, usuario no-root, `umask 0022`, swap `/dev/sdc` de 2 GiB activo (unos 200 MiB usados), más de 1 GiB disponible, ninguna ruta IPv4 predeterminada visible y las herramientas Solana keygen, GPG, OpenSSL, `findmnt` y `swapon` instaladas. `cryptsetup` falta, pero no es requisito para el cifrado GPG por archivo. Resultado: `BLOCK=3`, `UNKNOWN=5`; no se inspeccionaron wallets, shell history ni RPC.

Cambios preparados, no aplicados:

1. En un shell de ceremonia nuevo ejecutar `umask 077` y comprobar `umask`; no hace falta persistirlo en `.bashrc`.
2. Fusionar (sin sobrescribir otras opciones) en `%UserProfile%\\.wslconfig`, dentro de `[wsl2]`: `swap=0`, `networkingMode=none`, `localhostForwarding=false`. Aplicarlo requiere `wsl --shutdown` y reiniciar la distro; no se hizo.
3. Después de verificar `swapon --show` vacío, crear el tmpfs dedicado con privilegios: `sudo install -d -o "$(id -u)" -g "$(id -g)" -m 0700 /mnt/robusto-ram`; `sudo mount -t tmpfs -o size=256M,mode=0700,uid="$(id -u)",gid="$(id -g)",nosuid,nodev,noexec tmpfs /mnt/robusto-ram`. Verificar tipo `tmpfs`, montaje `rw`, opciones `nosuid,nodev,noexec`, propietario actual, modo `700` y escritura con un archivo vacío. Si algo falla, detenerse.
4. Comprobar manualmente en Windows y conservar evidencia no sensible: BitLocker `Protection On` en el volumen que contiene el VHDX, hibernación/Inicio rápido, pagefile y su volumen, Windows Security, ajustes de red WSL y que VHDX/copia local no estén sincronizados. Todo ello sigue **NO VERIFICADO** en esta sesión.

No se modificó Windows, no se reinició WSL y no se ejecutó ningún comando administrativo; se solicitará autorización antes de hacerlo.

La distribución futura de copias será: una copia cifrada local en `~/.local/share/robusto-custody/` (directorio `0700`, ciphertexts `0600`) fuera del repo, en el volumen WSL cuyo VHDX debe estar protegido por BitLocker y excluido de sync/backups cloud; la segunda copia cifrada se transfiere al almacenamiento interno del S22, `Documents/ROBUSTO-CUSTODY/`, por cable. Los keyfiles en claro solo existirán en `/mnt/robusto-ram`. Ningún ciphertext va a OneDrive, Samsung Cloud, Google Drive u otro proveedor.

## Cambios y comprobaciones obligatorios antes de la ceremonia

1. Instalar actualizaciones de Windows/WSL desde fuentes oficiales antes de iniciar; reiniciar y comprobar el estado de seguridad con Windows Security. Activar BitLocker/device encryption en el volumen de sistema que contiene el VHDX y guardar su recovery key fuera de la laptop; no copiar recovery key ni wallets al repositorio.
2. En Windows, verificar BitLocker realmente `Protection On` en el volumen que contiene el VHDX; confirmar que pagefile/hiberfile quedan en volumen cifrado. Microsoft documenta que pagefile, crash dump e hiberfil están protegidos por defecto si el volumen del sistema usa BitLocker; eso protege almacenamiento apagado, no malware o memoria de un Windows desbloqueado. Desactivar hibernación e Inicio rápido para la ventana de la ceremonia y apagar completamente al final. No desactivar pagefile de Windows si puede inestabilizar el sistema.
3. Crear/inspeccionar `%UserProfile%\.wslconfig` manualmente sin sobrescribir otros ajustes: en `[wsl2]`, configurar `swap=0`, `networkingMode=none`, `localhostForwarding=false`. Reiniciar completamente con `wsl --shutdown` y volver a verificar dentro de WSL que no existe swap ni ruta/interfaz de salida. Microsoft documenta `swap=0`, `networkingMode=none` y que los cambios requieren reinicio completo de WSL. Además, desconectar físicamente Ethernet, apagar Wi-Fi y Bluetooth del anfitrión. No confiar únicamente en firewall o DNS.
4. Para la ceremonia, desactivar ejecución de binarios Windows desde WSL (`interop.enabled=false`) y reiniciar WSL. La transferencia MTP al S22 se hace desde Windows Explorer después de cifrar; el host verá solo ciphertext. Confirmar que el VHDX está fuera de rutas sync, y que la carpeta de ciphertext local no tiene backup automático. No dejar aplicaciones Windows, terminales extra, screen capture, clipboard managers, sync ni software remoto activos. Usar una sesión nueva, local y sin shell history/transcripción.
5. Repetir `bash scripts/robusto-laptop-custody-preflight.sh` con una carpeta RAM preparada. Debe dar cero `BLOCK`; cada `UNKNOWN` sobre Windows debe resolverse manualmente y documentarse. Confirmar de forma presencial el estado físico sin conexión. No continuar si el script dice que no es WSL2, hay swap, tmpfs no escribible/privado, umask incorrecto, herramientas ausentes o existe ruta de red.
6. Probar transferencia y recuperación con archivo ficticio: cifra en WSL, copia por MTP al S22, copia desde el S22 de vuelta a tmpfs, compara SHA-256 y descifra el fixture; borrar fixture local y teléfono. No continúa si no se puede desbloquear/autorizar el S22, copiar en ambos sentidos, o verificar el hash.

La opción WSL `networkingMode=none` está documentada por Microsoft como red WSL desconectada. Esto es defensa adicional; la ceremonia exige además desconexión del anfitrión para evitar conectividad por interop u otros medios.

## Samsung S22, cifrado y transferencia local

El formato portátil que se puede probar sin agregar dependencias es un archivo OpenPGP `.gpg` con GnuPG AES-256 y protección de integridad MDC, usando contraseña simétrica. Por compatibilidad se deja el modo predeterminado CFB+MDC; no forzar OCB/AEAD. GnuPG documenta que el modo simétrico predeterminado es CFB+MDC y que OCB es opcional. MDC detecta alteraciones, pero **no es AEAD moderno**: si se exige AEAD estricto, no hay en esta laptop/Android una combinación portátil probada sin instalar y verificar otra app. La contraseña debe tener alta entropía, no reutilizar contraseñas de cuentas y no se debe habilitar el caché de GPG (`--no-symkey-cache`).

OpenKeychain es una implementación OpenPGP conocida, de código abierto y disponible en Google Play; su documentación asigna la acción Abrir a archivos `.gpg` para descifrar y admite contraseña para cifrado simétrico. No se instaló ni probó en este S22. Si el propietario no quiere instalarla desde Play Store, el teléfono solo almacenará ciphertext y la recuperación se hará con GnuPG en un equipo confiable futuro. No instalar APKs de terceros/sideload ni extensiones desconocidas. Una prueba real de compatibilidad OpenKeychain queda pendiente antes de confiar en descifrado Android.

Transferencia prevista sin cloud: generar ciphertext en el tmpfs, conectar el S22 con cable USB-C de datos a Windows, desbloquear el teléfono, aceptar el permiso de datos si aparece y seleccionar MTP/“Transferring files”; copiar únicamente los `.gpg` a una carpeta manual en almacenamiento interno, por ejemplo `Documents/ROBUSTO-CUSTODY`. Samsung indica que se debe desbloquear el dispositivo y permitir el acceso para transferir; Android/One UI puede pedir además cambiar el modo USB. Para verificar el transporte, copiar cada ciphertext de vuelta a un área temporal y comparar `sha256sum` antes/después; luego comprobar decrypt+MDC en WSL solo con fixture ficticio o, en una futura ceremonia aislada, con el keyfile en RAM. No usar Quick Share, Bluetooth, Samsung Flow, Link to Windows, correo, mensajería, OneDrive, Google Drive, Samsung Cloud ni copias automáticas.

**La prueba laptop→teléfono no pudo realizarse aquí:** el propietario confirma que el S22 es desbloqueable y admite USB, pero no había dispositivo/mount MTP visible en esta sesión. Se añadió `scripts/robusto-phone-transfer-fixture.sh` para una prueba física con contenido ficticio. La frase incluida es pública e intencionalmente débil, exclusiva del fixture y nunca debe usarse para wallets.

Prueba física pendiente: ejecutar `bash scripts/robusto-phone-transfer-fixture.sh create <directorio-local-no-sincronizado>`, copiar `ROBUSTO_S22_TEST_ONLY.gpg` y su hash por MTP a `Documents/ROBUSTO-CUSTODY-TEST/`, devolver el ciphertext a la laptop y correr `bash scripts/robusto-phone-transfer-fixture.sh verify <archivo-devuelto.gpg> <sha256-original>`. Solo el resultado `PASS returned ciphertext hash and dummy decrypt/restore` demuestra ida/vuelta cifrada y restauración desde el teléfono. No hace falta instalar una app en Android: el descifrado del fixture público se realiza en WSL. El test de CI solo simula el transporte.

### Pantalla dañada y recuperación

La recuperación no se declara completada hasta ejecutar la prueba de fixture. La confirmación del propietario de que puede desbloquear el S22 y usar USB reduce la preocupación por la pantalla, pero no prueba todavía hash ni restauración real del ciphertext.

Antes de considerar el S22 como backup recuperable, el propietario debe probar con un archivo ficticio que puede: (a) desbloquear y habilitar MTP, (b) copiarlo al teléfono y devolverlo al portátil, (c) comparar hashes, y (d) si desea descifrado en el teléfono, abrir el `.gpg` en OpenKeychain desde Google Play y restaurar el fixture. Si la pantalla no permite esas acciones, **con presupuesto cero no hay procedimiento que yo pueda verificar que recupere el backup**. La opción mínima es reparar temporalmente la pantalla o pedir prestado un monitor/TV HDMI y adaptador USB-C compatible; si se requiere teclado/mouse, usar un hub que permita conectarlos. Un teléfono sin pantalla utilizable no debe ser el único backup.

La restauración en Android produce datos descifrados en el teléfono y lo convierte temporalmente en custodio de esos secretos; eso contradice la preferencia de no usarlo para custodiar authorities. Por ello la recomendación es guardar solo ciphertext en el S22 y restaurar/decrypt en un ordenador confiable de reemplazo cuando exista. Sin un equipo adicional futuro, la recuperación operativa del contenido no está completa.

### Contraseña y copias locales

- Usar una passphrase larga, aleatoria y única. Idealmente separar passphrase por rol/archivo para que una filtración no abra las ocho autoridades; la passphrase no debe ser igual al PIN del teléfono o contraseña Windows.
- Guardar las passphrases fuera del laptop y del S22, en papel dentro de sobre cerrado y en ubicación física distinta de ambos dispositivos; no fotografiar, copiar a portapapeles, almacenar en password manager cloud ni enviar por mensajes. El propietario debe designar un lugar que pueda recuperar; si no hay medio físico para conservar la contraseña, no crear el backup.
- En el teléfono conservar solo ciphertext; desactivar backup/sync de la carpeta objetivo, confirmar que los archivos no están bajo Gallery/Camera, OneDrive, Google Photos/Drive o Samsung Cloud. No abrir el ciphertext en otras apps que creen copias caché.
- No crear una copia en claro en Downloads, Windows `%TEMP%`, repo, `/mnt/c`, OneDrive, clipboard o `~/.config/solana`. En futuro, los `.json` solo existirán en tmpfs; cifrar desde esa ruta. La carpeta de fixture local se elimina al salir del test; el script usa únicamente datos dummy.
- Durante la prueba Android, hacerla offline, sin depuración USB/ADB y con un fixture no sensible. Al terminar, borrar solo el fixture y verificar que no sigue en papelera/recientes; no usar app de “limpieza” de terceros.

El S22 sí agrega una segunda clase de dispositivo frente a un fallo del SSD/VHDX, pero laptop y teléfono pueden perderse juntos. Hasta pasar la prueba física de transferencia y recuperación, no contarlo como backup válido.

## Ceremonia futura propuesta, solo después de autorización específica

No ejecutar ahora. Las decisiones de ROBUSTO no cambian: ocho roles separados; `team_founder` es wallet principal del propietario; `reserve` permanece separada; no fecha base de vesting.

1. Preparar la laptop según la sección anterior, sin abrir el repositorio. Apagar Wi-Fi, Bluetooth y Ethernet en Windows; retirar cualquier conexión de red. Terminar todos los WSL y arrancar solo la distro dedicada después de aplicar `networkingMode=none` y `swap=0`.
2. En WSL, comprobar `findmnt`, `swapon --show`, `/proc/net/route`, `umask`, modo/owner de la carpeta y que ningún path temporal esté bajo repo, `/mnt/c`, `/tmp` o directorio sincronizado. Después de confirmar `swap=0`, crear `/mnt/robusto-ram` como tmpfs de 256 MiB (`mode=0700,nosuid,nodev,noexec`) y propiedad del usuario; verificar que realmente es `tmpfs` escribible. Crear el directorio ciphertext local con `install -d -m 700 ~/.local/share/robusto-custody`. No ejecutar estos comandos ni crear directorios ahora.
3. Deshabilitar history/xtrace en la sesión, no usar `sudo` para generar, no abrir una shell persistente con logging. Crear cada keypair directamente en la carpeta tmpfs, con Solana CLI oficial y modo silencioso; salida/log solo puede incluir direcciones públicas y estados. Nunca usar el default `~/.config/solana/id.json`. Mantener un archivo diferente por rol; no derivar/compartir claves.
4. Para cada rol, extraer únicamente su dirección con `solana-keygen pubkey <archivo-en-tmpfs>`. Comparar ocho direcciones distintas, on-curve, con inventario histórico Devnet/rehearsal sin usar RPC. Un choque detiene la ceremonia y obliga a regenerar esa identidad. Ningún keyfile se abre, imprime, copia al repo o escribe en disco no volátil.
5. Cifrar cada keyfile usando GPG simétrico AES-256/MDC y `--no-symkey-cache`, generando un `.gpg` directamente en `~/.local/share/robusto-custody/<role>.json.gpg` con modo `0600`. Copiar únicamente ese ciphertext al S22 por MTP mientras el anfitrión permanece sin Internet. Passphrases únicas se ingresan en prompt oculto; no ponerlas en argv/env/history. Escribirlas en papel sellado y guardarlo separado de laptop y S22. No hacer backups de claves sin cifrar ni subir ciphertext a cloud.
6. Recuperar prueba desde ambas ubicaciones: descifrar el ciphertext local y el que se recuperó de S22 directamente a tmpfs privado; comparar public address con la dirección anotada. Registrar únicamente `ROLE`, dirección pública, `PASS/FAIL` y fecha. No registrar passphrases. Si el S22 no se puede desbloquear/transferir, detenerse; el plan de backup no está validado.
7. Confirmar que no quedó swap, desmontar/eliminar el tmpfs y apagar WSL y Windows por completo. La desaparición del mount no equivale a borrado criptográfico de memoria persistente del anfitrión; pagefile/hibernación/snapshot seguirán siendo riesgo residual si la configuración no fue comprobada.
8. Solo tras la ceremonia y en una sesión posterior online, registrar manualmente en `config/robusto-mainnet-public-addresses.json` las ocho direcciones públicas. Ejecutar validador y security scan; revisar que diff contiene exclusivamente `ROLE -> PUBLIC ADDRESS`. Ningún secreto sale de la laptop.

La generación de las ocho identidades, aunque sea offline, requiere una autorización explícita posterior. Esta preparación no autoriza autoridad on-chain, firmar, financiar ni operar Mainnet.

## Herramienta de preflight

`scripts/robusto-laptop-custody-preflight.sh` solo informa propiedades de Linux/WSL, permisos, mounts, swap, rutas visibles y existencia de herramientas. No abre archivos de wallet ni contacta RPC. Es deliberadamente conservador y deja como `UNKNOWN` lo que solo puede verificarse en el host Windows. **Un resultado PASS no constituye aprobación para generar keys**; para la condición actual se espera `BLOCK` por swap activo, umask permisivo y ausencia de `/mnt/robusto-ram`.

## Fuentes oficiales

- Microsoft Learn, [configuración avanzada de WSL](https://learn.microsoft.com/en-us/windows/wsl/wsl-config): opciones `.wslconfig`, `swap=0`, `networkingMode=none` y necesidad de reiniciar WSL para aplicar configuración; [interoperabilidad WSL](https://learn.microsoft.com/en-us/windows/wsl/wsl-config#interop): control de ejecución de binarios Windows desde Linux.
- Microsoft Learn, [contramedidas BitLocker](https://learn.microsoft.com/en-us/windows/security/operating-system-security/data-protection/bitlocker/countermeasures): pagefile, crash dump e hiberfil en volumen cifrado y límites de protección frente a memoria accesible con el sistema desbloqueado.
- Samsung Support, [transferencia por cable](https://www.samsung.com/us/support/answer/ANS10002839/), [modo USB](https://www.samsung.com/us/support/answer/ANS10013049/), [FAQ DeX](https://www.samsung.com/us/support/answer/ANS10001972/) y [uso de pantalla DeX](https://www.samsung.com/us/support/answer/ANS10001955/): desbloqueo/MTP, compatibilidad de S22, requisitos de interacción y versiones no soportadas de DeX para PC.
- OpenKeychain, [ficha oficial de Google Play](https://play.google.com/store/apps/details?id=org.sufficientlysecure.keychain) y [documentación de descifrado de `.gpg`](https://github.com/open-keychain/open-keychain/wiki/Intents).
- GnuPG, [opciones OpenPGP](https://gnupg.org/documentation/manuals/gnupg/OpenPGP-Options.html): CFB+MDC predeterminado, OCB opcional y sus diferencias.
- Solana, [CLI Basics](https://solana.com/docs/intro/installation/solana-cli-basics) y [código oficial `solana-keygen`](https://github.com/solana-labs/solana/blob/master/keygen/src/keygen.rs): keypair CLI es texto plano por defecto; ruta explícita y `--silent` requeridos para evitar que la frase salga en pantalla.
- GnuPG, [manual oficial de comandos](https://gnupg.org/documentation/manuals/gnupg/Operational-GPG-Commands.html): cifrado simétrico con passphrase y AES-256.
