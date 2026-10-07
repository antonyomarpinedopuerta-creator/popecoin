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
| Herramientas | Solana keygen `3.1.10`, GnuPG `2.4.8`, OpenSSL `3.5.5` presentes; `cryptsetup` ausente | Solana CLI y GPG bastan para keyfiles en RAM y backup cifrado por archivo. No se ha generado nada. USB/WSL passthrough aún debe probarse con datos ficticios |

La comprobación de Windows falló por la interoperabilidad WSL→Windows y no se sustituyó por inspección de archivos del host. No se inspeccionaron archivos de claves existentes, `~/.config/solana/id.json`, historiales ni patrones de seed/private key.

La laptop podría servir como entorno de contingencia **solo después** de corregir los bloqueos y aceptar explícitamente el mayor riesgo de software frente a hardware signer. WSL2 no protege secretos contra malware/admin en Windows, captura de memoria, pagefile, hibernación, snapshots del VHDX o acceso físico. Desactivar el swap interno de WSL y usar tmpfs reduce exposición, pero no prueba que Windows nunca pagine la memoria de la VM. BitLocker protege datos apagados en disco si está activo, no un host comprometido mientras la sesión está abierta.

## Conclusión sobre backup con el hardware disponible

Con solo esta laptop y sin medio externo no hay recuperación redundante razonablemente segura. Guardar dos copias cifradas dentro del mismo SSD/VHDX no protege contra pérdida, corrupción, robo, ransomware ni fallo de la laptop. Usar el celular para authorities está descartado por el propietario. **No se deben generar las ocho identidades hasta contar con almacenamiento de backup offline separado y configuración anfitriona verificada.**

Recomendación mínima para independencia de recuperación: adquirir **dos USB nuevos** de capacidad básica, sin software propietario/autoejecutable, y mantenerlos físicamente separados. Guardar en ambos, cifrados por GPG, una copia de cada keyfile; almacenar las passphrases únicas en sobres separados de los USB, en ubicaciones distintas. Usar un USB en una ubicación de recuperación fuera del lugar de la laptop. Las claves en claro solo deben existir en RAM. Antes de confiarles nada, formatear/verificar los medios y ensayar montaje/lectura con archivos ficticios sin secretos, con Wi-Fi/Ethernet apagados.

Un mínimo alternativo de **un USB** solo sería aceptable si el propietario verifica Windows BitLocker en el volumen del VHDX, confirma que el VHDX no entra en OneDrive/otro sync/backups no controlados, y mantiene una copia cifrada en ese volumen más la copia GPG offline en USB. Esa opción tiene menos independencia y depende de controles de Windows aún no verificados; por eso recomiendo dos USB y no la considero disponible hoy.

## Cambios y comprobaciones obligatorios antes de la ceremonia

1. Instalar actualizaciones de Windows/WSL desde fuentes oficiales antes de iniciar; reiniciar y comprobar el estado de seguridad con Windows Security. Activar BitLocker/device encryption en el volumen de sistema que contiene el VHDX y guardar su recovery key fuera de la laptop; no copiar recovery key ni wallets al repositorio.
2. En Windows, verificar BitLocker realmente `Protection On` en el volumen que contiene el VHDX; confirmar que pagefile/hiberfile quedan en volumen cifrado. Microsoft documenta que pagefile, crash dump e hiberfil están protegidos por defecto si el volumen del sistema usa BitLocker; eso protege almacenamiento apagado, no malware o memoria de un Windows desbloqueado. Desactivar hibernación e Inicio rápido para la ventana de la ceremonia y apagar completamente al final. No desactivar pagefile de Windows si puede inestabilizar el sistema.
3. Crear/inspeccionar `%UserProfile%\.wslconfig` manualmente sin sobrescribir otros ajustes: en `[wsl2]`, configurar `swap=0`, `networkingMode=none`, `localhostForwarding=false`. Reiniciar completamente con `wsl --shutdown` y volver a verificar dentro de WSL que no existe swap ni ruta/interfaz de salida. Microsoft documenta `swap=0`, `networkingMode=none` y que los cambios requieren reinicio completo de WSL. Además, desconectar físicamente Ethernet, apagar Wi-Fi y Bluetooth del anfitrión. No confiar únicamente en firewall o DNS.
4. Para la ceremonia, desactivar ejecución de binarios Windows desde WSL (`interop.enabled=false`) y reiniciar WSL. Se puede mantener el automount de DrvFS estrictamente para escribir los ciphertexts al USB montado, siempre que se haya probado antes con fixtures y que el USB no esté sincronizado; no abrir el repo ni otros directorios host. No dejar aplicaciones Windows, terminales extra, screen capture, clipboard managers, sync ni software remoto activos. Usar una sesión nueva, local y sin shell history/transcripción.
5. Repetir `bash scripts/robusto-laptop-custody-preflight.sh` con una carpeta RAM preparada. Debe dar cero `BLOCK`; cada `UNKNOWN` sobre Windows debe resolverse manualmente y documentarse. Confirmar de forma presencial el estado físico sin conexión. No continuar si el script dice que no es WSL2, hay swap, tmpfs no escribible/privado, umask incorrecto, herramientas ausentes o existe ruta de red.
6. Probar escritura y recuperación de ciphertext usando archivos ficticios, nunca wallet material: mount USB, GPG simétrico, copiar ciphertext a ambos medios, leer/decrypt a tmpfs, comparar hash del fixture y desmontar. Confirmar que Windows Defender u otro endpoint no sincroniza el volumen USB ni los temporales.

La opción WSL `networkingMode=none` está documentada por Microsoft como red WSL desconectada. Esto es defensa adicional; la ceremonia exige además desconexión del anfitrión para evitar conectividad por interop u otros medios.

## Ceremonia futura propuesta, solo después de autorización específica

No ejecutar ahora. Las decisiones de ROBUSTO no cambian: ocho roles separados; `team_founder` es wallet principal del propietario; `reserve` permanece separada; no fecha base de vesting.

1. Preparar la laptop según la sección anterior, sin abrir el repositorio. Apagar Wi-Fi, Bluetooth y Ethernet en Windows; retirar cualquier conexión de red. Terminar todos los WSL y arrancar solo la distro dedicada después de aplicar `networkingMode=none` y `swap=0`.
2. En WSL, comprobar `findmnt`, `swapon --show`, `/proc/net/route`, `umask`, modo/owner de la carpeta y que ningún path temporal esté bajo `/home`, `/mnt/c`, repo, `/tmp` o directorio sincronizado. Crear un mount `tmpfs` dedicado de 256 MiB con opciones `mode=0700,nosuid,nodev,noexec`; el procedimiento futuro debe detenerse si no se puede montar o si el filesystem no aparece como tmpfs escribible.
3. Deshabilitar history/xtrace en la sesión, no usar `sudo` para generar, no abrir una shell persistente con logging. Crear cada keypair directamente en la carpeta tmpfs, con Solana CLI oficial y modo silencioso; salida/log solo puede incluir direcciones públicas y estados. Nunca usar el default `~/.config/solana/id.json`. Mantener un archivo diferente por rol; no derivar/compartir claves.
4. Para cada rol, extraer únicamente su dirección con `solana-keygen pubkey <archivo-en-tmpfs>`. Comparar ocho direcciones distintas, on-curve, con inventario histórico Devnet/rehearsal sin usar RPC. Un choque detiene la ceremonia y obliga a regenerar esa identidad. Ningún keyfile se abre, imprime, copia al repo o escribe en disco no volátil.
5. Cifrar cada keyfile usando GPG simétrico AES-256 y `--no-symkey-cache`, escribiendo ciphertext directamente al USB 1 y USB 2 mientras el anfitrión permanece offline. Passphrases únicas se introducen únicamente en prompt oculto; no ponerlas en argv/env/history. Almacenarlas en papel sellado, separadas de los USB y de ubicaciones distintas. No hacer backup de claves sin cifrar ni subir ciphertexts a cloud.
6. Probar por separado ambas copias: descifrar cada ciphertext directamente a otra ruta tmpfs privada y comparar su public address con la dirección anotada. Registrar únicamente `ROLE`, dirección pública, `PASS/FAIL` y fecha. No registrar passphrases. Si falla un medio, detenerse y reemplazarlo antes de terminar.
7. Confirmar que no quedó swap, desmontar/eliminar el tmpfs y apagar WSL y Windows por completo. La desaparición del mount no equivale a borrado criptográfico de memoria persistente del anfitrión; pagefile/hibernación/snapshot seguirán siendo riesgo residual si la configuración no fue comprobada.
8. Solo tras la ceremonia y en una sesión posterior online, registrar manualmente en `config/robusto-mainnet-public-addresses.json` las ocho direcciones públicas. Ejecutar validador y security scan; revisar que diff contiene exclusivamente `ROLE -> PUBLIC ADDRESS`. Ningún secreto sale de la laptop.

La generación de las ocho identidades, aunque sea offline, requiere una autorización explícita posterior. Esta preparación no autoriza autoridad on-chain, firmar, financiar ni operar Mainnet.

## Herramienta de preflight

`scripts/robusto-laptop-custody-preflight.sh` solo informa propiedades de Linux/WSL, permisos, mounts, swap, rutas visibles y existencia de herramientas. No abre archivos de wallet ni contacta RPC. Es deliberadamente conservador y deja como `UNKNOWN` lo que solo puede verificarse en el host Windows. **Un resultado PASS no constituye aprobación para generar keys**; para la condición actual se espera `BLOCK` por swap activo, umask permisivo y ausencia de `/mnt/robusto-ram`.

## Fuentes oficiales

- Microsoft Learn, [configuración avanzada de WSL](https://learn.microsoft.com/en-us/windows/wsl/wsl-config): opciones `.wslconfig`, `swap=0`, `networkingMode=none` y necesidad de reiniciar WSL para aplicar configuración; [interoperabilidad WSL](https://learn.microsoft.com/en-us/windows/wsl/wsl-config#interop): control de ejecución de binarios Windows desde Linux.
- Microsoft Learn, [contramedidas BitLocker](https://learn.microsoft.com/en-us/windows/security/operating-system-security/data-protection/bitlocker/countermeasures): pagefile, crash dump e hiberfil en volumen cifrado y límites de protección frente a memoria accesible con el sistema desbloqueado.
- Solana, [CLI Basics](https://solana.com/docs/intro/installation/solana-cli-basics) y [código oficial `solana-keygen`](https://github.com/solana-labs/solana/blob/master/keygen/src/keygen.rs): keypair CLI es texto plano por defecto; ruta explícita y `--silent` requeridos para evitar que la frase salga en pantalla.
- GnuPG, [manual oficial de comandos](https://gnupg.org/documentation/manuals/gnupg/Operational-GPG-Commands.html): cifrado simétrico con passphrase y AES-256.
