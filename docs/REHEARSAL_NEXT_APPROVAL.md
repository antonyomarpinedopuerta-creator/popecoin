# Estado de financiación y continuación Devnet

## Resultado del único airdrop autorizado

La solicitud de 2 SOL Devnet al payer
`4nt7G7nXvBNvygsDjn4zS9vQCR1Zgn1GTpyh8Snh5N7m` fue intentada una sola vez y
rechazada por el RPC con `-32603 Internal error`; no devolvió firma. Saldo previo
0 SOL en slot `505730503`; saldo posterior 0 SOL en slot `505730843`. Genesis
antes/después correcto: `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`.
Evidencia pública: `target/rehearsal-evidence/19d8bf9-6nLZrtmi/airdrop-01-{response,before,after}.json`.
El expediente está ignorado por Git. No repetir esta solicitud ni usar otro faucet.
Cualquier financiación nueva necesitaría autorización posterior específica.

El rent pico conservador estimado del deploy es 2.366172560 SOL Devnet sin fees;
el rehearsal completo se estimó en 2.373091520 SOL sin fees. Son estimates, no cap
total aprobado. El payer actualmente tiene cero saldo.

## Planner disponible

`npm run prepare:rehearsal-tx -- <step>` construye exactamente una transacción
unsigned por invocación y termina. Detalles y comandos en
[REHEARSAL_ONE_TX.md](REHEARSAL_ONE_TX.md). No firma, simula ni transmite. No invoca
Solana CLI ni lee wallet/keypairs. Usa RPC Devnet fijado y genesis guard. Su salida
muestra fee, rent, saldo y `adequatelyFunded`. Falta un sender externo revisado:
cada mensaje unsigned requerirá revisión, firma/envío con aprobación individual y
confirmación antes de preparar el siguiente. `solana program deploy` y
`write-buffer` no se usarán porque automatizan más de un envío.

El buffer se deriva de payer + seed público fijado + loader v3; no hace falta una
tercera identidad. `buffer-create` aún sería una creación on-chain independiente,
pendiente de aprobación. Un `Write` por llamada; offset y hash revisados cada vez.
El deploy requiere verificar primero todos los bytes del buffer. Program verify
consulta readonly Program/ProgramData después del deploy aprobado.

La herramienta SPL para crear/inicializar el mint, ATAs y emitir tokens, y los
planes transaccionales individuales con comprobación de estado para initialize,
deposit y release todavía no están implementados. El plan ABI actual solo deriva
instrucciones. Mantener configuración mint/authority/beneficiary/schedule pendiente;
no usar scripts legacy.

No hacer ahora una petición de fondos, buffer, mint, cuentas, firma/simulación,
envío o deploy. Mainnet no es parte del rehearsal.
