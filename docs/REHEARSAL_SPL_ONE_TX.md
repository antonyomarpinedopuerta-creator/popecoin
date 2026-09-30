# Preparadores SPL del rehearsal Devnet

`scripts/rehearsal-spl-one-tx.ts` prepara como máximo un mensaje unsigned por
invocación y nunca firma, simula, ni envía. Fija el RPC de Devnet y verifica su
genesis. Usa exclusivamente el Token Program clásico; no admite Token-2022. La
configuración actual tiene `mint`, `authority` y `beneficiary` pendientes, por lo
que cada comando de preparación falla cerrado hasta completar públicamente esos
campos con direcciones nuevas aprobadas. No generar keypairs desde este script.

Cada operación se ejecuta por separado, tras configurar valores públicos y revisar
el mensaje/coste:

```sh
npm run prepare:rehearsal-spl -- mint-create
npm run prepare:rehearsal-spl -- mint-verify
npm run prepare:rehearsal-spl -- ata-authority-create
npm run prepare:rehearsal-spl -- ata-beneficiary-create
npm run prepare:rehearsal-spl -- ata-verify
npm run prepare:rehearsal-spl -- mint-to
```

`mint-create` requiere una dirección mint on-curve nueva: prepara CreateAccount +
InitializeMint2 atómicos, decimals=6, mint authority=authority y freeze authority
nula; requiere firmas de payer y mint. `mint-to` exige supply cero, autoridad,
decimals, freeze authority y ATA de source verificados y emite MintToChecked por
la cantidad exacta de `amount`. Cada ATA se prepara en su propia transacción
idempotente; una ATA existente se valida y no se vuelve a crear. Los verificadores
de mint y ATAs son read-only.

No ejecutar estos comandos ahora: mint/authority/beneficiary permanecen pendientes
de decisión y el payer tiene 0 SOL. Mostrar el mensaje, coste, destinatarios y
firmantes exactos; pedir aprobación individual antes de cualquier firma/envío. Una
aprobación nunca se reutiliza para otra operación. El script no implementa
`initialize`, `deposit`, releases ni reconciliación on-chain. `prepare-rehearsal.ts`
sigue siendo solo generador offline de instruction data; no atribuirle verificación
de estado/clock ni aprobación temporal. Antes de completar esas operaciones hace
falta un planner dedicado que derive y verifique vesting/vault, valide estado del
vesting, supply/balances y chain clock, calcule el importe vested a ese slot y
reconcilie los campos Anchor con balances SPL tomados coherentemente por slot.
El intento pre-cliff no se debe preparar como transacción firmable si el reloj
actual o la ventana de inclusión pudieran cruzar el cliff: un release podría
tener éxito en vez de fallar y mover tokens.
