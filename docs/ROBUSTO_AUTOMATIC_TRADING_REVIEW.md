# ROBUSTO — compraventa sin aprobación del creador

2026-10-11. NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED / OFFLINE_FIXTURE_ONLY.
Revisión del source Meteora `a85c926607433f23f0ea60f4ca7b1ae92f4156cb` y ELF
`a30610058262a5c87e1b22144ef6053ff2cd8bc9f97b7e978a51e28f8ec3ea3c`;
no describe un pool desplegado ni verifica su estado actual.

## Resultado y alcance

El diseño permissionless revisado no exige aprobación del creador por compra o venta.
`SwapCtx` exige permiso signer del usuario que entrega los tokens. La autoridad del
vault es una PDA del programa, cuyo permiso de CPI deriva del propio programa. No es
una clave del creador que deba estar disponible para cada operación. Los swaps no
llaman al programa de vesting ni al servidor de este repositorio.

El harness ejecuta B→A y A→B con un trader público ficticio distinto de payer y creator.
La cuenta creator se elimina del inventario del swap y el único signer solicitado
es trader. No se entrega la cuenta NFT de posición a la instrucción swap. Las CPI
SPL se ejecutan con los ELF fijados: no son mocks de transferencias. El permiso es
sintético, no prueba posesión de claves o verificación criptográfica de firmas.

Por diseño, después de un despliegue y pool reales autorizados, las operaciones
ocurrirían en Solana, aunque el computador del creador esté apagado. Cada usuario
necesitaría una wallet compatible, firma propia, conexión/RPC y una interfaz capaz de
construir el swap. No está demostrada disponibilidad de un frontend externo, listado,
ruteo de agregadores ni funcionamiento de una red real. El servidor local existente
no se convierte por esto en una aplicación pública autónoma. Tampoco se trata de
compras o ventas que ocurren sin que el usuario las solicite.

## Límites que sí pueden impedir operar

`pool_action_access/permissionless.rs::can_swap` requiere pool habilitado y activado.
La whitelist permite entrada anticipada de una dirección durante preactivación;
no restringe a los demás después de activación. No proponer whitelist como aprobación
manual de operaciones normales. Verificar pool status/activation/whitelist del estado
real antes de afirmar que un pool específico es libre.

`lib.rs::set_pool_status` exige OperatorPermission::SetPoolStatus; update_pool_fees
exige OperatorPermission::UpdatePoolFees. El administrador del protocolo gestiona
operadores. Estos poderes externos no son automáticamente del creador ROBUSTO y no
requieren su firma por swap, pero pueden cambiar disponibilidad/comisiones. No se
verificaron autoridades del despliegue real, y un upgrade externo podría cambiar reglas.

Liquidez, precio dentro del rango, slippage, saldo, owner/mint correctos, cuentas no
congeladas y límites aritméticos siguen siendo requisitos. El fixture comienza en
el extremo unilateral A: A→B falla por límite/liquidez (6015) antes de una compra B→A.
Después de esa compra, A→B entrega B y conserva saldos. No prometer ventas a cualquier
precio o importe ni confundir ausencia de aprobación con liquidez garantizada.

## Pruebas nuevas

Doce casos swap en total: B→A exitoso con trader independiente; cuatro rechazos B→A
por signer, fuente congelada, saldo cero y slippage; A→B exitoso; seis rechazos A→B
por frontera sin liquidez de salida, slippage, saldo cero, congelamiento, autoridad
fuente incorrecta e importe u64 máximo. Cada fallo exige código exacto, estado aceptado
intacto y conservación raw de A/B/lamports. Success exige entrada exacta y salida positiva.
No se demuestra rollback transaccional nativo: el engine descarta efectos por política
local. La prueba no completa todos los modos de swap, Token-2022 o adversarios posibles.

Trece casos de liquidez: los doce anteriores más rechazo InvalidAuthority(6053) de un
trader que intenta retirar la posición ajena. Comprar/vender no otorga propiedad del
NFT ni derechos sobre liquidez administrativa. El propietario o delegado permitido
puede retirar su posición; si retira profundidad puede perjudicar ventas normales.

## Permisos verificables

| Acción | Permiso/control | Evidencia local | Riesgo y mínimo propuesto |
| --- | --- | --- | --- |
| Comprar/vender | Usuario: signer y owner/delegate SPL válido; vault PDA | SwapCtx, ix_p_swap.rs; trader independiente en liquidity.rs | Sin aprobación ROBUSTO por operación; no añadir servidor del creador al camino de ejecución. |
| Aportar a posición existente | Owner NFT o delegado con AddLiquidity y permiso sobre fuentes | ix_add_liquidity.rs, state/position.rs; CPI add aprobado | No delegar innecesariamente; limitar saldo de operación. |
| Retirar liquidez | Owner NFT o delegado con permiso correspondiente, activación y liquidez disponibles | ix_remove_liquidity.rs, assert_authority_with_owner_destinations; trader ajeno rechazado | Custodiar NFT; retirar liquidez afecta profundidad. No confundir PDA vault con propietario NFT. |
| Delegar derechos de posición | Owner NFT y reglas de permisos + SPL delegate | ix_update_delegate_permission.rs; position.rs | Evitar delegados hasta justificar y probar alcance. No se ejercita toda delegación aquí. |
| Pausar pool/cambiar fees | Operador Meteora con permiso; admin controla operadores | lib.rs access_control, access_control.rs, operator handlers | Riesgo externo residual, revisar despliegue/operadores antes de producción. |
| Emitir ROBUSTO | Mint authority activa | robusto-production.ts: initializeMint2/MintToChecked | Identidad pendiente; emitir exacto/reconciliar y decidir después sobre revocación expresa. |
| Congelar token | Freeze authority si existe | Modelo constructor fija null; no mint real verificado | Recomendar ausencia para comercio libre; no es una decisión final autorizada en esta sesión. |
| Actualizar metadata | Update authority, metadata mutable | buildMetadataUpdate y verificaciones de snapshot | Poder separado, permisos/custodia mínimos; no afecta por sí solo saldos. |
| Cambiar contrato vesting | Upgrade authority del programa desplegado | verifyProgramData y owner loader | Poder crítico, separado del payer; proceso de revisión de upgrades. |
| Depositar vesting | Authority registrada y fuente válida; completar remanente antes de releases | instructions/deposit.rs | No da facultad de redirigir releases. |
| Liberar vesting | Beneficiario signer, destino suyo, mint y PDAs correctos | instructions/release.rs y casos SBF | Sin autorización del creador por release; sí firma del beneficiario. Sin rescate general implementado. |

No se ha asignado ninguno de estos poderes a identidades definitivas. El constructor
actual ya separa mintAuthority y distributionSourceOwner y rechaza que coincidan;
la documentación anterior que decía que seguían acopladas era obsoleta. No supone
que multisig esté integrada. Auditar implementación y custodia de roles finales.
