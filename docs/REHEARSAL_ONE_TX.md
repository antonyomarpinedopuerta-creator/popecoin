# Preparar una transacción Devnet por invocación

`scripts/rehearsal-one-tx.ts` construye **un solo mensaje unsigned** y termina.
No importa módulos de firma, no carga keypairs, no simula ni expone métodos de envío.
Su único endpoint es `https://api.devnet.solana.com`; valida genesis Devnet al
principio y al final. No consulta SOLANA_URL, Anchor.toml, CLI config ni wallet
predeterminada. La salida incluye bloque/hash expiración, signers requeridos,
bytes/base64 unsigned, hash del mensaje, fee exacta por `getFeeForMessage`, rent y
saldo observado. `adequatelyFunded=false` obliga a detener la revisión. La salida
sigue siendo solo un plan público; no autoriza, firma, simula ni transmite la tx.

El candidato se descubre solo por public Program ID y los tres SHA-256 fijados en
`config/rehearsal-deployment.json`; se rechaza cero o más de una coincidencia,
symlinks, estado incompleto, IDL discrepante y ELF que exceda maxProgramBytes.
Los roles conocidos de producción/históricos/allocation y el mint de producción
configurado están protegidos. No añadir globals ni opciones de endpoint al comando.
Una nueva configuración necesita revalidación explícita.

Ejecutar una sola fase por llamada. `SESSION` representa un nombre nuevo de
expediente público. Crear primero su directorio privado ignorado; `noclobber` evita
sobrescribir una evidencia. El `node` directo evita que npm anteponga banners al JSON:

```sh
mkdir -m 700 -p target/rehearsal-evidence/SESSION
set -o noclobber
node --require ts-node/register scripts/rehearsal-one-tx.ts buffer-create --bufferSeed papa-buffer-19d8bf9 > target/rehearsal-evidence/SESSION/01-buffer-create.json
node --require ts-node/register scripts/rehearsal-one-tx.ts buffer-write --bufferSeed papa-buffer-19d8bf9 --offset 0 --length 600 > target/rehearsal-evidence/SESSION/02-buffer-write-000000.json
node --require ts-node/register scripts/rehearsal-one-tx.ts buffer-verify --bufferSeed papa-buffer-19d8bf9 > target/rehearsal-evidence/SESSION/03-buffer-verify.json
node --require ts-node/register scripts/rehearsal-one-tx.ts program-deploy --bufferSeed papa-buffer-19d8bf9 > target/rehearsal-evidence/SESSION/04-program-deploy.json
node --require ts-node/register scripts/rehearsal-one-tx.ts program-verify > target/rehearsal-evidence/SESSION/05-program-verify.json
```

Para cada fragmento, reejecutar `buffer-write` con el siguiente offset público y
una longitud <=650; esperar la revisión externa, firma/envío separado autorizado y
confirmación antes de invocar el siguiente fragmento. No usar loops. El preparador
comprueba en RPC que los bytes anteriores coincidan con el ELF, el resto esté a
cero y que el offset apunte al prefijo vigente. `buffer-verify` exige todos los
bytes exactos, authority, owner, tamaño y zero padding antes de planear deploy.
`program-deploy` exige Program/ProgramData ausentes y buffer completo; combina solo
CreateAccount(program)+DeployWithMaxDataLen en un mensaje atómico. `program-verify`
solo consulta Program/ProgramData y compara authority/hash/ELF.

`createAccountWithSeed` deriva el buffer de payer + seed público fijado en
`config/rehearsal-deployment.json` + owner loader; no
requiere generar una tercera keypair. El seed es dato público repetible, no secreto.
No se crea el buffer hasta que alguien firme y envíe externamente el mensaje con
aprobación específica. La creación exige payer; Write exige payer + upgrade
authority; deploy exige payer + Program ID + upgrade authority. La inicialización
del buffer guarda upgrade authority como autoridad. Nunca utilizar firmas cargadas
por scripts locales. Cada mensaje tiene una sola fee quote; rent de buffer y de
programa/ProgramData se informa por separado y se agrega conservadoramente a la
necesidad de saldo. No se compensa el rent del buffer por posibles refunds.

La base de código **no tiene un submitter**: el JSON no se envía automáticamente.
Una custodia externa debe revisar/signar el único mensaje y ejecutar una sola
solicitud RPC bajo aprobación humana. Blockhash expirado implica volver a preparar,
revisar y aprobar otro mensaje; ninguna aprobación se hereda. Un timeout tras envío
requiere confirmar estado/firma antes de proponer otro paso.

El script prepara las instrucciones equivalentes al loader v3 (InitializeBuffer=0,
Write=1, DeployWithMaxDataLen=2). Tests parsean el wire transaction, bytecode del
loader, signers, packet limit, buffer/layout/ProgramData, binario/IDL hashes y
fail-closed de endpoint, genesis, rent, fee, estado y padding. No usan keypairs.
No afirmar runtime hasta verificar cuenta desplegada; no afirmar deploy hasta
verificar transacción finalizada.

## Límites para el ciclo SPL/vesting

`npm run prepare:rehearsal` continúa siendo el plan unsigned probado de
initialize/deposit/release y requiere que todas las public addresses/schedule estén
aprobadas. Config permanece incompleta después del deploy preparation. Todavía no
hay builder de transacciones SPL para crear mint/ATAs/mintToChecked, ni lector que
valide en una transacción exacta estados de token/vesting para generar releases.
Antes de autorizar ese ciclo hay que preparar dichas fases como one-tx, con checks
mint clásico/6 decimals/freeze authority, owner/supply/ATA balances y cantidades
BigInt. Este límite está explícito: los scripts legacy no son sustitutos.
