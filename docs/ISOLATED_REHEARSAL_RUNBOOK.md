# Rehearsal aislado PAPA: procedimiento con paradas obligatorias

Estado: PREPARADO PARA REVISIÓN; ninguna operación firmada autorizada.
Base externa: bdbf93588d6f4346f4cce18d043f2abc4ddf59dd, Actions
36539185798, completed/success, validate (first)/(second) y compare success.
**EXTERNALLY VERIFIED: success** aplica exclusivamente a esa revisión, no acredita
el ciclo Devnet ni cambios posteriores.

## 0. Próxima parada: identidad del programa

DETENERSE antes de crear identidades. Propuesta para autorización posterior:
crear UNA identidad Ed25519 nueva, exclusivamente para el programa del rehearsal
Devnet, mediante custodia externa controlada por el operador. Guardar el secreto
solo en esa custodia, con etiqueta `PAPA / Devnet rehearsal / program / <session>`;
no crear un JSON en este repositorio, target, /tmp ni ~/.config/solana/id.json.
El proveedor/dispositivo de custodia concreto debe ser elegido por el usuario antes
de crearla; no existe todavía una ubicación privada aprobada. En el repositorio
solo se guardará su dirección pública en `config/rehearsal-plan.json:program`.
Crear la identidad offline cuesta **0 SOL de Devnet** y no crea una cuenta on-chain.
Su propósito es fijar el Program ID del ELF y autorizar la creación inicial del
programa mediante una integración externa compatible. No es el payer ni supone
una elección automática de upgrade authority. No exportar claves para acomodar
un deployer incompatible: detenerse y revisar la integración.

Después de crearla y aprobar su dirección pública: comprobar que es nueva y no
protegida, construir con build:rehearsal y verificar hashes. No desplegar todavía.
Payer, upgrade authority, mint identity, mint authority, authority y beneficiary
requieren elecciones públicas/custodia separadas; nunca deducirlas de configuración
CLI global. Payer puede ser authority si se aprueba; beneficiary debe ser distinto.
Program ID y mint deben ser distintos entre sí y de todos los signers.

## 1. Artefactos y configuración pública

Usar exclusivamente `docs/REHEARSAL_BUILD.md` para construir con el Program ID
aprobado. Nunca cargo build-sbf, anchor build/deploy/keys sync, build:devnet ni scripts
legacy de mutación. El fixture YMN9... del handoff NO es una identidad aprobada.

1. Registrar Git HEAD y resultado CI propio. Ejecutar build:rehearsal con ID público
   y plataforma instalada explícitos; no generar un keypair para compilar.
2. Ejecutar `npm run build:rehearsal -- --program-id ID_APROBADO --verify WORKSPACE`.
   Conservar SHA-256 de program.so, idl.json y manifest.json fuera del workspace,
   en el expediente público. Comparar con esos pins antes de cada operación;
   no reemplazar pins para que una discrepancia deje de fallar.
3. Registrar que el IDL es adaptado del ABI release y que el binario aún no tiene
   validación runtime para esta identidad. La comparación de bytes embebidos no
   sustituye ejecución, revisión o reproducción independiente.
4. Completar config/rehearsal-plan.json solo con direcciones nuevas aprobadas,
   cantidad exacta en unidades base y tiempos UTC aprobados. Mantener null hasta
   conocerlos. Configurar además en el expediente upgradeAuthority, mintAuthority,
   tokenProgram clásico, decimals=6, freezeAuthority=null, RPC/genesis, hashes y
   presupuesto; no existe fallback para campos pendientes.
5. `npm run prepare:rehearsal` deriva PDAs/ATAs e instrucciones sin firmas. Rechaza
   identidades históricas/de producción conocidas y el mint de producción si está
   configurado. La exclusividad/custodia de una dirección exige revisión humana.
   Confirmar explícitamente la lista de direcciones protegidas del operador: ningún
   algoritmo puede identificar todos sus otros mints reales por su dirección.

El plan lee el ABI release local; comparar su ABI con idl.json del workspace (solo
address puede diferir), verificar hashes y conservar ambos. No cambiar Anchor.toml
ni fuentes release. Evidencia pública: `target/rehearsal-evidence/<session>/`;
no guardar secretos, logs de wallets ni volcados de directorios de claves.

## 2. Barrera antes de CADA simulación y CADA firma/envío

La ejecución será manual por etapas mediante integración de custodia revisada,
que todavía está pendiente. Los scripts actuales no firman ni ejecutan este runbook.
No usar un comando deploy monolítico que firme/envíe múltiples transacciones sin
parar. Descomponer creación de buffer, cada write y deploy final; cada mensaje exige
su propia revisión. Si el deployer no permite estas paradas, NO usarlo.

Mostrar y guardar esta ficha completa, sustituyendo todos los campos pendientes:

```text
session / operationId / fase / timestamp UTC / Git HEAD / workflow
operación exacta e instrucciones ordenadas (programas, metas, writable, datos)
cluster: devnet
RPC: https://api.devnet.solana.com
genesis esperado y observado: EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG
Program ID / ProgramData / buffer si aplica / ELF, IDL y manifest SHA-256
mint / token program / decimals / mint authority / freeze authority
payer / authority / beneficiary / upgrade authority
signers requeridos exactos y signers ofrecidos por custodia
source / vault / destination / vesting / todas las cuentas creadas
cantidad base exacta o regla temporal de release y máximo autorizado
rent, fee, prioridad y transferencias SOL, en lamports y SOL de Devnet
coste máximo de esta operación, coste acumulado y saldo disponible
estado/slot/Clock previo, blockhash, lastValidBlockHeight, hash del mensaje
resultado esperado / reversibilidad / evidencia que se guardará
aprobación: PENDIENTE (simulation o sign/send, nunca ambas implícitamente)
```

Para deployment anterior al mint: indicar `mint: no creado, no aplica a esta
operación`, junto con payer/authority/beneficiary elegidos; no sustituir desconocidos
por wallets por defecto. Los campos requeridos por la operación no pueden ser null.
Antes de firmar, el mint debe coincidir exactamente con la dirección aprobada cuando
la operación lo use. Mostrar 0 tokens para operaciones que solo consumen SOL.

Leer genesis y estado por RPC explícito, sin redirects ni fallback. Exigir owners,
longitudes/discriminadores, PDAs/ATAs, mint, autoridades, ausencia de freeze,
delegates/close authorities inesperados y signers EXACTOS. Antes de crear, las
cuentas nuevas deben estar ausentes. Tras deploy verificar loader, ProgramData,
upgrade authority y ELF exacto (separar cabecera y padding del loader, no comparar
el hash del account completo con el ELF). El programa debe ser ejecutable.
Revalidar hashes, genesis, estado y mensaje antes de firmar; fail-closed ante RPC
fallido, respuesta incompleta, cambio de estado relevante o discrepancia.

Primero aprobación para simulación externa con custodia; mostrar resultado y
solicitar después aprobación de firma/envío del mensaje exacto. Un fallo esperado
solo puede enviarse con autorización explícita para ese error y su fee. Un fallo
inesperado detiene la secuencia. Cambiar blockhash/instrucciones/coste/firmantes,
reintentar o crear otra transacción exige nueva ficha y aprobación. Nunca pasar al
siguiente paso automáticamente. Tras envío incierto, consultar firma/estado antes
de proponer un nuevo intento; no duplicar un mintTo o deposit por timeout.

## 3. Rent, fees y financiación exclusivamente Devnet

El estimador seguro, sin claves ni configuración CLI, recibe dos tamaños públicos:

```sh
node --require ts-node/register scripts/rehearsal-rent.ts ELF_BYTES MAX_PROGRAM_BYTES
```

Usar longitud real de program.so verificado y capacidad exacta prevista del loader
v3. Consulta genesis y rent para programa (36), ProgramData (45+capacidad), buffer
(37+ELF), mint (82), source/destination/vault (165 cada uno), vesting (145).
Es presupuesto conservador de rent pico, sin descontar recuperaciones del buffer;
si cambian loader, tamaños o cuentas adicionales, esta estimación no es válida.
No aprueba una cantidad ni emite un límite total: fees/total permanecen null.

Para cada mensaje exacto sin firmas consultar
[getFeeForMessage](https://solana.com/docs/rpc/http/getfeeformessage); null/error
obliga a parar. Fijar prioridad y compute limit explícitos, sin tips ni reintentos
automáticos. Sumar fees cotizadas y rent/transferencias de esa operación, mostrar
cap aprobado en lamports y SOL (1 SOL = 1e9 lamports). El despliegue requiere sumar
TODOS los mensajes de buffer/write/deploy, incluyendo firmas múltiples. No estimar
el coste total solo a partir del tamaño del ELF o una tarifa fija por transacción.
Rent se consulta por tamaño mediante
[getMinimumBalanceForRentExemption](https://solana.com/docs/rpc/http/getminimumbalanceforrentexemption).

El importe definitivo está bloqueado hasta contar con el ELF del ID real y mensajes
exactos. Financiar exclusivamente con SOL de faucet Devnet, mediante autorización
separada; no comprar SOL, no puentes, no transferencias Mainnet. Un airdrop también
es una operación de red y no está autorizado ahora. No recuperar rent cerrando
cuentas ni cambiar autoridades como parte automática del ensayo.

## 4. Secuencia con aprobación individual

Todas las filas heredan la ficha anterior y se detienen antes de actuar.
Transacciones confirmadas y fees no son reversibles; nuevas transferencias de vuelta
son otras operaciones. Vesting no ofrece cancelación, rescate ni cierre.

| Etapa | Operación / signers adicionales al payer | Cantidad y efecto esperado | Evidencia específica |
|---|---|---|---|
| Identidades | Creación externa, aprobada una por una; sin transacción | 0 SOL; direcciones nuevas con custodia aislada | Solo public keys y roles, nunca secretos |
| Financiación | Faucet Devnet, aprobación aparte | SOL Devnet hasta cap aprobado | Firma/slot/saldo previo y posterior |
| Deploy | Buffer create (buffer), cada write (buffer authority), deploy final (program y autoridades exigidas por mensaje) | 0 tokens; rent + fee por mensaje, publicar ELF revisado | Cada firma y slot, loader/ProgramData, authority, ELF/hash |
| Mint | Crear e inicializar mint SPL clásico (mint identity) | 6 decimals, supply=0, mintAuthority aprobada, freezeAuthority=None desde creación | Owner, longitud, campos mint y firma |
| Source ATA | Crear ATA de authority | 0 tokens, rent + fee | Derivación/owner/mint/balance=0 |
| Beneficiary ATA | Crear ATA de beneficiary | 0 tokens, rent + fee | Derivación/owner/mint/balance=0 |
| Tokens | mintToChecked (mint authority) | Exactamente T, 1..100000000 unidades base; supply=T, source=T | Supply y saldos antes/después |
| Initialize | Payer, authority, beneficiary | T comprometido; vault vacío y vesting released=0 | PDAs, campos schedule/roles, vault owner=vesting |
| Deposit | Authority | T de source a vault; source=0, vault=T | Saldos y released=0 |
| Pre-cliff | Beneficiary | Esperado NothingToRelease, 0 tokens; fee si envío fallido aprobado | Simulación o tx fallida claramente distinguidas, error, slot, saldos sin cambio |
| Parcial | Beneficiary, cliff <= Clock < end | A(t)-released, positivo y menor que saldo total inicial | Delta vault/destination, released, slot/tiempo |
| Repetidos | Beneficiary, cada intento por separado | 0/error si nada nuevo; éxito si tiempo devengó más | Regla temporal, resultado y delta real por firma |
| Final | Beneficiary, Clock >= end | T-released; vault=0, destination=T, released=T | Estado final y conciliación |
| Informe | Solo lectura/offline | 0 SOL | Inventario, hashes y resultados completos |

Elegir start/cliff/end DESPUÉS de setup/deploy para dejar tiempo suficiente a las
aprobaciones. Sugerencia para revisión: start futuro, cliff=start+600s,
end=start+1800s; no rellenar fechas automáticamente. Consultar Clock de red, no
reloj local. Si se pierde la ventana pre-cliff o parcial, declarar prueba pendiente;
no cambiar el schedule on-chain ni reutilizar un vesting ocupado. Un nuevo mint/
beneficiary/schedule requiere nueva aprobación. No prometer completar todas las
ventanas si las aprobaciones tardan más que el schedule.

## 5. Reconciliación reproducible y reporte

Usar enteros base (BigInt), nunca floats. Del código state.rs:
A(t)=0 antes de cliff; A(t)=T desde end; en medio,
A(t)=floor(T*(t-start)/(end-start)). El cliff habilita acumulación desde start.
Release esperado = A(t)-released_pre. Un release repetido puede ser positivo.
El bloque/tiempo RPC cercano puede diferir del Clock exacto de ejecución: guardar
context slots y muestras Clock anterior/posterior, acotar A(t) entre ambas y
verificar además delta exacto mediante meta.pre/postTokenBalances, logs y estado.
No inventar timestamp exacto; si no se puede acotar dentro de una ventana requerida,
marcar ese checkpoint inconcluso. El final requiere Clock confirmado >= end.

Guardar por operación únicamente JSON público: ficha aprobada, mensaje/hash,
aprobación y alcance, simulation/context/logs públicos, firma si se envió,
getTransaction con meta.err/fee/pre/post balances y slot, snapshots antes/después
(owner/discriminador/mint/authority/balances/Clock), y resultado expected/actual.
Confirmar finalización antes de certificar resultados finales. Una simulación
fallida no es una transacción on-chain fallida. Sin firma no inventar una.

Para todos los pasos posteriores a mintTo: source+vault+destination=T; supply=T
(tratar vault todavía inexistente como saldo cero). Desde initialize,
released=destination (destination empieza en cero). Después del deposit completo:
vault=T-released y source=0. Al final source=0, vault=0, destination=T, released=T.
Si aparecen donaciones, mint adicional, delegates o transferencias externas,
detenerse: no ajustar la expectativa para ocultar la discrepancia. Fallos esperados
conservan estado/tokens; sus fees se contabilizan aparte.

Crear report.json con schemaVersion, session, Git HEAD/CI, cluster/genesis, roles,
plan y artefactos/hashes, operaciones ordenadas y sus archivos/hashes, resultados
pre-cliff/partial/repeated/final, ecuaciones de conciliación, SOL gastado (fees y
rent separados), limitaciones y status passed/failed/incomplete. Un checkpoint
faltante o inconcluso impide passed. Crear SHA256SUMS enumerando explícitamente
solo archivos públicos del expediente (no recorrer wallets ni target en bloque).
El informe debe poder recalcularse offline desde mensajes, receipts y snapshots
conservados; no depender de que RPC conserve indefinidamente el historial.

## Límite de implementación actual

Disponibles: builder/verificador, plan ABI/PDAs, estimador RPC de rent y este
procedimiento. Pendientes antes de operar: custodia elegida, identidades aprobadas,
ELF real, integración de mensajes/simulación/firma con paradas por transacción,
validación de estado y generador de informe sobre receipts reales. Ningún documento
es una autorización ni sustituye esas comprobaciones. No hay executor firmado
habilitado ni autorización permanente. La próxima acción es pedir aprobación para
la identidad de la sección 0, no crearla.
