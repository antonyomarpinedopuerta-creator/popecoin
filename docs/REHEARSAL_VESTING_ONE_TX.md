# Planner de vesting Devnet por transacción

`scripts/rehearsal-vesting-one-tx.ts` solo lee RPC y prepara una transacción
unsigned para una única operación por invocación. No tiene signer, simulación ni
sender. Antes de continuar, fija Devnet RPC/genesis, valida los Program/ProgramData
del loader, compara autoridad y bytes ELF con el candidato/hashes locales, carga el
IDL fijado por hash, y lee mint + vault/source/beneficiary + vesting en un único
`getMultipleAccountsInfoAndContext` slot. El timestamp se obtiene para ese slot.
Se rechazan roles protegidos, autoridades/decimals/freeze inesperados, cuentas
incorrectas, schedule distinto, saldos no reconciliados y cuotas/fees desconocidas.

Con direcciones públicas aprobadas en `config/rehearsal-plan.json`, ejecuta cada
paso por separado y revisa de nuevo el mensaje y su hash antes de cualquier firma:

```sh
npm run prepare:rehearsal-vesting -- snapshot
npm run prepare:rehearsal-vesting -- initialize
npm run prepare:rehearsal-vesting -- deposit
npm run prepare:rehearsal-vesting -- release-precliff
npm run prepare:rehearsal-vesting -- release-partial
npm run prepare:rehearsal-vesting -- release-repeated
npm run prepare:rehearsal-vesting -- release-final
npm run prepare:rehearsal-vesting -- snapshot
npm run prepare:rehearsal-vesting -- reconcile-final
```

`initialize` requiere supply y source ATA exactamente iguales al total y beneficiary
en cero; su máximo inmediato incluye rent estimada para la cuenta Anchor de 145
bytes y el vault SPL clásico de 165 bytes. `deposit` solo acepta vault vacío, source
con todo el total y `released_amount=0`, porque el programa exige transferir el
importe restante exacto. Releases requieren depósito completo, source cero y
beneficiary balance igual a `released_amount`. Partial/repeated solo se preparan
cuando existe releasable positivo y quedan más de cinco minutos hasta el end.
Repeated requiere además release anterior y accrual nuevo. Final requiere chain time
en/tras end. El programa calcula el importe con `Clock` al incluir: el campo
`expectedAmountAtSnapshot` es una estimación en el slot observado y release no
codifica cantidad.

El pre-cliff unsigned release solo se prepara cuando el timestamp confirmado está
al menos 30 minutos antes del cliff y calcula vested=0; se espera `NothingToRelease`
si se incluye antes del cliff. Su blockhash tiene expiración finita. No firmar ni
enviar después de que expire; no regenerar/refrescar sin revisar y aprobar ese
mensaje nuevo. Partial/repeated tienen margen mayor que el tiempo nominal de vida
del blockhash para evitar cruzar end antes de incluir. Una aprobación nunca habilita
la siguiente operación. El workflow no contiene executor de firma/envío.

Los comandos actuales fallan cerrados porque mint, authority, beneficiary, amount
y schedule siguen pendientes. No se generaron identidades, no se guardan snapshots
automáticamente y no hay operación on-chain autorizada. Conserva stdout de
`snapshot`/`reconcile-final` solo como evidencia pública si luego se aprueba el flujo;
no agregues archivos privados ni keypairs al repositorio.
