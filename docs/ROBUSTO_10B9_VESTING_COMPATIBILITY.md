# Compatibilidad de preparación ROBUSTO 10B/9 con vesting

**Estado:** `NOT_AUTHORIZED_FOR_MAINNET` · `MAINNET_DISABLED` · `OFFLINE_FIXTURE_ONLY`.
Este documento no aprueba beneficiario, calendario UTC, custodia, despliegue ni
operaciones. El calendario de 365 días de bloqueo y 730 días lineales permanece como
escenario y se expresa en días fijos de 86.400 segundos.

## Conclusión

La aritmética del contrato existente es compatible con la cantidad propuesta para el
fundador: 1.000.000 ROBUSTO a nueve decimales son exactamente
`1.000.000.000.000.000` unidades base. El argumento de `initialize.total_amount` y el
de `deposit.amount` son `u64`; ese importe cabe en `u64`. El supply de
`10.000.000.000.000.000.000` unidades base también cabe en `u64`, aunque el contrato
de vesting no almacena ni valida el supply global ni los decimales del mint.

La interfaz Anchor existente no necesita un cambio para representar este importe: usa
`u64` para la cantidad, `i64` para `start_time`, `cliff_time` y `end_time`, y `release()`
no recibe cantidad. La CPI `TransferChecked` toma los decimales del mint cargado. Esta
compatibilidad de tipos e interfaz no prueba que un mint real tenga nueve decimales,
que las cuentas futuras sean correctas, que el flujo completo de emisión esté aprobado,
ni que el programa desplegado sea este ELF.

## Revisión de instrucciones y custodia

| Ruta | Validación observada en fuente | Consecuencia para ROBUSTO 10B/9 | Riesgo o pendiente |
| --- | --- | --- | --- |
| `initialize` | Exige `total_amount > 0`, `start < end` y `start <= cliff <= end`; guarda autoridad, beneficiario, mint, cantidad y tiempos. Beneficiario, authority y payer son firmantes; PDA usa `vesting`, beneficiario y mint. | La cantidad del fundador cabe en `u64`; los tiempos deben ser segundos Unix representables como `i64`. | Los firmantes no se autentican en este adaptador; ningún beneficiario ni fecha se elige. Una PDA permite un estado por pareja beneficiario/mint, no varios calendarios. |
| `deposit` | Exige autoridad almacenada, mint y vault PDA correctos, owner/mint de la cuenta fuente, `released_amount == 0`, vault no superior al total y depósito exactamente igual al remanente. CPI usa `TransferChecked` con `mint.decimals`. | `1e15` unidades base cabe en la interfaz. Nueve decimales dependen del mint y deben validarse en el flujo exterior. | Donaciones directas al vault pueden producir exceso que bloquea el depósito exacto; no existe recuperación administrativa. Un mint/vault congelado o saldo insuficiente falla la CPI. |
| `release` | Exige firmante beneficiario, mint y vault vinculados; calcula devengo con el Clock, resta lo ya liberado, transfiere mediante CPI con PDA signer y actualiza `released_amount` después de la CPI. | El total del fundador cabe en `u64`; el estado limita su derecho a `total_amount`. | No hay recuperación administrativa si se pierde el acceso del beneficiario. Destino debe pertenecer al beneficiario y usar el mismo mint. |

`state.rs` amplía timestamps a `i128` antes de restar y multiplica en `u128`, redondea
hacia abajo a unidades base y devuelve el total al alcanzar `end_time`. La PDA de vesting
incluye `(beneficiary, mint)`: para esa pareja no se puede inicializar un segundo
calendario distinto con el mismo seed. El vault está bajo la PDA; no se encontró una
instrucción administrativa de retiro o confiscación. Una transferencia accidental al
vault puede quedar inmovilizada por diseño.

## Adaptador offline

`scripts/robusto-10b9-vesting-preparation.ts` acepta exclusivamente el manifiesto que
coincide con la configuración local revisada y su hash. Produce un plan abstracto
determinista con las cinco categorías separadas. Registra solo para el fundador el
escenario relativo `start = cliff = base + 31.536.000 s`, `end = start + 63.072.000 s`.
El plan enumera los roles de firma observados en el contrato (payer, authority y
beneficiario en `initialize`; authority en `deposit`; beneficiario en `release`) sin
asignarles identidades. Beneficiario, autoridad, base temporal absoluta, activación y
las cuatro políticas de distribución siguen pendientes. No serializa instrucciones ni
determina cuentas o direcciones.

La función de calendario hipotético valida límites `i64`, cantidad exacta y los días
escogidos, pero es un validador aritmético local: la referencia de beneficiario es un
campo opaco de fixture, no se valida como dirección Solana ni prueba identidad o
autorización. La contabilidad de liberación también es una cota matemática y no actualiza
estado del programa. Ambos prototipos requieren revisión independiente antes de usarse
como base para integración.

Ejecutar las pruebas dirigidas:

```sh
npm run test:robusto-10b9-offline
npm run test:robusto-10b9-vesting-preparation
./node_modules/.bin/tsc --noEmit
```

El plan abstracto puede inspeccionarse con `npm run robusto:prepare-10b9-vesting`; emite
JSON a stdout y no acepta parámetros. No es un builder de instrucciones.

## Qué demuestra y qué no

- **Aritmética:** comprobada por pruebas TypeScript para 10B/9, `u64`, founder `1e15`,
  conservación y límites hipotéticos `i64`.
- **Interfaz:** inspección de las firmas Anchor y constraints actuales; no se alteró ABI,
  IDL, seed PDA ni contrato.
- **SBF:** el expediente 10B/9 ya documenta un harness `InvokeContext` con permisos
  sintéticos, CPI de System/SPL y los 11 casos del fixture. El harness no genera claves
  ni firmas y no equivale a autenticación criptográfica, transacción completa, cluster ni
  rollback nativo. Esa evidencia anterior no se vuelve a contar como una prueba ejecutada
  en esta revisión.
- **Esta revisión:** solo ejecuta pruebas host nuevas del adaptador; no recompila ni
  ejecuta SBF porque el contrato no cambió y hacerlo repetiría la evidencia existente.

El adaptador no reemplaza `scripts/robusto-production.ts`, cuyo constructor y perfil son
históricos de 1B/6 y cuatro buckets. Tampoco resuelve la integración futura de las cinco
categorías en una ceremonia de emisión/distribución, custodia, mint real, permisos,
identidades, calendario UTC, recuperación de acceso, depósitos excedentes, auditoría o
atomicidad nativa. La compatibilidad solo puede describirse como **compatibilidad
offline de cantidad/interfaz preparada**, no como compatibilidad de lanzamiento ni
seguridad de producción.
