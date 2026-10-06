> Cierre posterior: [ROBUSTO_CLOSURE](ROBUSTO_CLOSURE.md) y [validación](evidence/robusto/closure-validation.md). Contrato/ABI/binary del ensayo intactos; genesis guards de metadata históricos añadidos; 48 Rust/89 cliente/47 Python en pruebas del cierre. Limitaciones Deposit/exceso y avisos de dependencias conservados. No auditoría independiente.

# ROBUSTO — revisión interna de seguridad 2026-10-04 UTC

No es auditoría independiente. No se modificó contrato, ABI, seeds, autoridades ni binarios. Código revisado: Initialize, Deposit, Release, VestingAccount y constraints Anchor. Suite Rust existente ejecutada offline con caché: 47 PASS (36 integración LiteSVM/SBF, 1 carga, 10 aritmética). Registro completo en evidence/robusto/rust-tests-2026-10-04.log.

| Área | Hallazgo y límite |
|---|---|
| Mint adicional | La mint authority del ensayo sigue activa. Supply actual 10000000 verificado, pero no es criptográficamente fijo mientras exista esa autoridad. No se revoca en esta sesión. El futuro supply fijo requiere emisión/distribución verificada y autorización separada de revocación. |
| Freeze | Mint rehearsal freezeAuthority=null. El programa acepta mints SPL clásicos en general; no exige freeze=null ni 6 decimales por sí mismo. Los planners imponen esos parámetros para este ensayo. Producción debe verificarlos expresamente. |
| Upgrade | Programa actual actualizable; autoridad EcWN9K2zyrXfUnbji8WyUmRwhezGcqvtSGnBB1yixjYb. Una actualización autorizada puede cambiar reglas; custodia y política final siguen pendientes. No se transfirió/revocó autoridad. |
| Metadata | Independiente de mint authority. Propuesta mutable, update authority separada; public key/custodia/URI aún pendientes. Validación sintáctica no prueba control de claves. No metadata on-chain publicada. |
| Signers | Initialize exige payer, authority y beneficiary; deposit exige authority asociada; release exige beneficiario almacenado. Tests cubren firmas ausentes y sustituidas. |
| Ownership/PDA | Cuenta Anchor del programa, mint/vault SPL clásico, seeds vesting+beneficiary+mint y vault+vesting, owner/mint de source/destino restringidos; tests sustituyen cuentas y PDAs. |
| Aritmética | Calendario válido, diferencias i128 antes de convertir; producto u128 para u64 máximo; checked_sub/checked_add. Tests cubren rango completo i64, u64 máximo, redondeo y reloj regresivo. |
| Repetidos | Se libera vested-released. Sin acumulación nueva rechaza NothingToRelease; tras end/total también. Transacciones fallidas revierten estado y CPI; prueba de dos releases en una transacción. |
| Depósito posterior a release | Deposit rechaza SIEMPRE released>0, incluso si falta financiación. No es un mecanismo de recarga general. |
| Financiación parcial | Transferencias SPL directas pueden financiar parcialmente el vault; el programa no exige vault totalmente financiado antes del primer release. Si un release tiene fondos suficientes puede ocurrir y bloquear futuros Deposit. Transferencia SPL directa todavía puede aportar el faltante; debe revisarse/autorizase por separado. |
| Exceso | Cualquiera puede donar SPL directamente al vault. Release está limitado a total; lo sobrante no tiene rescue/close/cancel y puede quedar bloqueado permanentemente bajo la PDA. Deposit también rechaza vault>total. No enviar excedentes. |
| Bloqueo | No reset, cierre, cancelación ni cambio de beneficiario. Pérdida de firma del beneficiario, calendario o congelación en otros mints pueden bloquear acceso. El rent de PDA/vault no tiene recuperación expuesta. |
| Devnet vs producción | Identidades, mint, parámetros, custodia y presupuesto deben verificarse de nuevo. Pruebas Devnet y artefacto local de identidad histórica no autorizan usarlo en producción ROBUSTO. |

No se identificó una nueva ruta de retiro no autorizado en esta revisión. No se añadió rescue ni backdoor. Si se decide cambiar financiación posterior al release o recuperar excesos, eso requiere una decisión de diseño explícita, revisión y nuevos tests antes de implementación.

La generación de la nueva identidad fue autorizada explícitamente por el usuario: directorio privado 0700, archivo 0600, Git ignore comprobado, creación exclusiva sin sobrescritura, fsync. Se guarda solo la identidad pública en Git. El backup público deliberadamente NO sirve como recuperación de esa clave; custodia/respaldo privado seguro sigue siendo responsabilidad operativa separada.
