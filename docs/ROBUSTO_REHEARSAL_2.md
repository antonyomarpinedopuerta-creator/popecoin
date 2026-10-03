# ROBUSTO — segundo rehearsal, preparación sin envío

El primer vesting terminó; no volver a liberar ni reinicializar esa PDA. Supply de prueba: 10,000,000 unidades base = 10 tokens con 6 decimales. No mint adicional.

## Secuencia y autorizaciones separadas

1. `npm run robusto:recover`: verificar Devnet/genesis, ELF, cuentas y release final; conservar el JSON público en `docs/evidence/robusto/`.
2. `npm run robusto:prepare-recycle`: preparar UNA TransferChecked unsigned desde la ATA del beneficiario antiguo `GThf94JHTRKpQtk1jBubduGgazGq1YBLDnqpDqFRWLRJ` a source `DHyysduG5SxsqiupB7Zvw32fLq14BUVBZbHKbXBqYcN6`, por 10,000,000 unidades base del mint `CfHGrav3zjZyAEdspKwdBGW3yBHYkiz6cYpeeQXoujvo`. Firmantes futuros: payer `4nt7G7nXvBNvygsDjn4zS9vQCR1Zgn1GTpyh8Snh5N7m` y beneficiario antiguo `BUzXyQ5EREcrQsNDpRsByU56TU9bU5mh3hxUtyB8q4nc`. Rent cero; fee exacta consultada por mensaje. No contiene MintTo ni release.
3. Mostrar propuesta y obtener autorización antes de firmar/enviar. Antes de firma: nuevo snapshot, genesis, supply, owners, freeze/delegate, fee y blockhash. Simular unsigned con `sigVerify:false`; exigir resultado exitoso; revalidar. Si expiró, reconstruir únicamente la misma operación y volver a cotizar. Guardar signature antes del envío. Resultado incierto: consultar esa signature y balances; nunca reenviar automáticamente.
4. Tras finalización: source=10,000,000, beneficiario antiguo=0, vault antiguo=0, released antiguo=10,000,000, supply intacto. Desde ese momento la reconciliación del ensayo antiguo que exige saldo del beneficiario=total dejará de aplicar: conservar el checkpoint anterior y verificar la transferencia como etapa distinta.
5. Seleccionar una nueva identidad dedicada mediante un flujo seguro del operador; no usar ninguna identidad histórica protegida ni el beneficiario anterior. El archivo `config/robusto-rehearsal-2.json` deja beneficiary y startUtc null deliberadamente. No se generaron ni leyeron claves. Calcular ATA/PDA/vault con el planner existente y comprobar ausencia on-chain antes de autorizar su creación.
6. Crear ATA nueva, Initialize y Deposit mediante los planners existentes, una operación revisada por vez. El input del segundo ensayo se pasa a `prepareVestingOne`; no reemplazar silenciosamente la configuración del primero. No mint nuevo, deploy ni rebuild.

## Calendario relativo al reloj de Devnet

No fijar hoy una fecha que expire esperando autorización. Al preparar Initialize, usar chain time fresco T; start=T+2400s, cliff=start+60s, end=start+3600s. Congelar ese calendario después de Initialize y leerlo siempre de la cuenta.

| Hito | Momento objetivo | Evidencia obligatoria |
|---|---|---|
| Pre-cliff | Tras Deposit, con >=1800s hasta cliff | Una simulación unsigned: NothingToRelease (6002); sin enviar; balances intactos |
| Primer parcial | start+900s | Snapshot, liberable >0 y <total, >=300s hasta end; release finalized, deltas reales |
| Segundo release | start+2100s | released previo >0, nueva acumulación >0, >=300s hasta end; finalized, deltas reales |
| Final | chain time >=end | Solo remanente >0; finalized y reconciliación |

A los tiempos objetivo exactos, los acumulados serían 2,500,000 / 5,833,333 / 10,000,000 unidades base. Los importes reales dependen del Clock al incluir cada release; no son importes codificados en la instrucción. La segunda diferencia ilustrativa sería 3,333,333 si el primer release ocurrió exactamente en su objetivo.

No dormir ni esperar en bucles largos en la laptop. Registrar checkpoints duraderos tras cada paso y verificar chain time al retomar. Si se pierde la ventana parcial, declarar la prueba incompleta; jamás llamar parcial a un release final. El calendario admite 1 hora de vesting; el margen previo permite preparar/simular sin apuro. Las autorizaciones deben llegar dentro de las ventanas; no existe aprobación general de estas operaciones.

## Cierre de evidencia

Guardar por paso: snapshot previo/posterior, chain time, genesis, operación, cuentas, signature, estado finalized/err, slot, fee, balances y supply. La reconciliación final exige source=0, vault nuevo=0, beneficiario nuevo=total=supply=released, shortfall=0. El primer ensayo verificó pre-cliff simulado y final; los dos parciales del segundo siguen PENDING hasta evidencia RPC real.

## Comandos preparados

`npm run robusto:prepare-vesting -- schedule` consulta chain time y propone calendario cuando se haya seleccionado el nuevo beneficiario. No escribe ni cambia un calendario existente; copiar una propuesta revisada a la configuración únicamente antes de Initialize.
`npm run robusto:prepare-vesting -- ata-beneficiary` prepara la ATA nueva. El mismo comando acepta snapshot, initialize, deposit, release-precliff, release-partial, release-repeated, release-final y reconcile-final. Los pasos de transacción solo producen mensajes unsigned, nunca firman/envían. Con beneficiary/startUtc pendientes el wrapper falla cerrado.
`npm run robusto:prepare-recycle -- --simulate` permite simular la devolución unsigned y guardar logs/balances simulados; no equivale a una transferencia ejecutada.
