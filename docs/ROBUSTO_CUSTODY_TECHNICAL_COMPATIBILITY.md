# Compatibilidad técnica: evidencia incremental

NOT_AUTHORIZED_FOR_MAINNET · MAINNET_DISABLED · OFFLINE_FIXTURE_ONLY.
Base revisada: `2d98fcf`. El híbrido y 365/730 se usan provisionalmente para desarrollo;
beneficiario y origen UTC siguen pendientes. No hay adopción operativa.

## Evidencia nueva y alcance

Se amplía el validador de custodia existente, sin nuevo planificador:

- Upgrade usa el consumidor `LOADER_AUTHORITY`, no la etiqueta Anchor; metadata
  queda como consumidor externo específico. No se certifica su implementación.
- `MULTISIG_MANAGED_ACCOUNT` es distinto de `PROGRAM_MULTISIG_PDA`: que un programa
  administre una cuenta no demuestra quién puede otorgar su privilegio signer.
- Matriz determinista de 24 celdas en `custody-technical-compatibility.json`.
- Doce hashes de source/lock en `custody-signer-source-hashes.json`, con pruebas
  contra archivos del checkout y crates locales. Son integridad local, no atestación.
- Contabilidad founder vault reutiliza el límite de release existente para separar
  saldo, derecho pendiente, déficit y excedente. Nunca acredita rescate ni propiedad.
- Treinta comparaciones del modelo TS contra `VestingAccount::vested_amount` real,
  enlazado como biblioteca nativa; no se copia el algoritmo Rust ni se ejecuta SBF.

## Matriz de evidencia de firma

S = interfaz/condición de firma demostrada en source; integración ejecutable aún
pendiente. I = ruta directa incompatible demostrada para una cuenta SPL multisig
sin privilegio signer propio. P = mecanismo concreto y privilegio signer pendientes.
Ninguna celda certifica custodia real, firma criptográfica, disponibilidad o producción.

| Frontera | Individual | Multisig SPL | PDA gobernanza | Cuenta administrada por programa multifirma |
| --- | --- | --- | --- | --- |
| Mint/freeze SPL | S | S, interfaz con miembros; no ejecución demostrada | P | P |
| Transferencias de asignaciones SPL | S | S, interfaz con miembros; no ejecución demostrada | P | P |
| Upgrade loader | S | I, no interpreta miembros SPL | P | P |
| Beneficiary vesting | S, precedentes SBF con permiso sintético | I, Anchor exige is_signer | P | P |
| Authority deposit vesting | S, precedentes SBF con permiso sintético | I, Signer y CPI sin miembros | P | P |
| Posición Meteora | P, además exige owner/delegate y permisos | I para ruta directa revisada | P | P |

Las celdas S tienen `compatibility=PENDING_EXECUTION_PROOF` y
`interfaceEvidence=SIGNER_FORM_SUPPORTED_BY_SOURCE`; nunca se convierten en
compatibilidad integral por diseño teórico. Las I rechazan la **sustitución directa**,
no toda posible composición con otro programa que otorgue firma por una vía probada.

Fuentes verificadas: Anchor `Signer::try_from` comprueba `info.is_signer`, no el
contenido de una cuenta multisig; SPL Token interface construye autoridad sin firma
propia si hay miembros y marca estos como signers. Esa API no prueba su processor
en ejecución. Loader v3 `upgrade` exige authority signer. El wrapper Anchor SPL de
deposit pasa lista vacía de miembros y cuatro cuentas; source.owner debe ser
authority. Meteora exige Signer y NFT/owner/delegate según permisos. Versiones y
bytes exactos quedan en el inventario de hashes, incluido Cargo.lock.

Una PDA gobernada necesitaría CPI `invoke_signed` del programa que controla sus
seeds, reenvío de cuentas y privilegios correctos. Una cuenta simplemente administrada
puede ser dato sin capacidad de firmar. No se eligió ni ejecutó programa multifirma,
no se probaron quórum/rotación ni se generaron identidades. Metadata permanece
pendiente de su programa, flags y mecanismo concretos.

## Paridad del vesting provisional

`npm run test:founder-vesting-parity` construye exclusivamente la biblioteca host
con Cargo offline/locked. Un ejecutable mínimo llama a la función matemática real
del contrato. Recibe 30 vectores generados por el modelo TypeScript existente:
cliff−1, cliff, cliff+1, cuartos de liberación, end−1, end y end+1, con tres orígenes
aritméticos, incluidos extremos de i64. No son fechas de lanzamiento propuestas.

Reporte: `target/founder-vesting-native-parity-report.json`, con HEAD, limpieza,
hashes de source, vectores, biblioteca, ejecutable y salida. Invalida el éxito
anterior antes de empezar y rechaza salidas parciales, repetidas, alteradas o
reordenadas. El build host puede necesitar caché Cargo ya aprovisionada; no usa red.
El reporte del HEAD anterior no acredita el nuevo: repetir tras el commit limpio.

Nivel: **NATIVE_HOST_MATH_NOT_SBF**. No demuestra Signer, Clock autenticado, CPI,
financiación, rollback nativo ni actualización del estado released. Los Pubkey
default de la estructura nativa son campos matemáticos sin identidad o cuenta creada.

Los nuevos tests distinguen start=cliff=365 de start=0/cliff=365: este último
acumularía un tercio del millón al vencer el cliff y no representa la propuesta.
El último segundo conserva el residuo de redondeo; el final alcanza exactamente
10^15 unidades. El máximo origen no negativo que deja end en i64::MAX se acepta;
un segundo más se rechaza. Cadenas fecha, negativos y cantidades numéricas inseguras
no se aceptan como timestamps enteros del adaptador. No hay conversión de fecha
UTC ni selección de beneficiario; una declaración sintáctica no verifica existencia.

## Tres riesgos críticos

| Riesgo | Código / reproducción segura nueva | Mitigación y límites |
| --- | --- | --- |
| A: pérdida permanente beneficiary | `initialize.rs` guarda beneficiary; `release.rs` exige su Signer, igualdad y destino propio; ABI solo initialize/deposit/release. La inspección y rechazos de permisos prueban ausencia de sustitución, no pérdida de una clave real | Custodia/backup antes de fijarlo sin cambiar contrato; vehículo de gobierno solo tras compatibilidad demostrada. Rotación futura necesitaría nuevo diseño; no puede recuperar pérdida ya consumada sin un poder preacordado |
| B: excedente atrapado | `deposit.rs` exige vault≤total y remanente exacto antes de release; `release.rs` limita derecho. Tests 10B/9: después de liberar 1/4, vault=3/4+1 deja exceso1; tras liberar todo, donación1 sigue sin derecho de claim. Es contabilidad host, complementa siete casos SBF históricos | Comprobar saldo/monitorizar reduce errores, no impide donación externa. No atribuir remitente por saldo; modificar contrato para refund/sweep requiere consentimiento/procedencia e invariantes auditadas |
| C: upgrade comprometido | No se define en initialize/deposit/release: es potestad del loader externo. Source loader exige authority signer; el validador no acepta `programImmutable`, `upgradeSafe` o `recoveryProven` inventados. No se ejecuta upgrade ni se prueba un exploit | Gobierno compatible, separación y revisión reducen acción unilateral pero no eliminan colusión. Renunciar impide fixes y exige autorización futura tras auditoría; ningún helper host demuestra seguridad del upgrade |

La nueva contabilidad muestra además: un vault con TOTAL−1 no financia una claim
final de TOTAL; un depósito directo posterior a release puede financiar el saldo
pendiente, mientras `deposit` permanece prohibido. Exceso no amplía la asignación,
no prueba propiedad del donante ni autoriza retiro. Regresión de reloj por debajo
de released se rechaza por resta inválida, sin wrap.

## Decisión de ingeniería y eventual versión futura

**Mantener el contrato actual sin cambios como candidato de referencia** para
desarrollo. No se encontró necesidad técnica de cambiarlo solo para la matemática
365/730 o un beneficiary individual que cumpla Signer. Esto no aprueba operación:
depende de aceptar pérdida de acceso, excedentes sin rescate y gobierno del upgrade.
Las dependencias multifirma concretas siguen bloqueadas; no se suplanta esa prueba
mediante otra implementación del vesting.

Considerar vNext únicamente si el propietario requiere capacidades hoy ausentes:

1. **Rotación consensuada de beneficiary.** Especificar consentimiento verificable
   del beneficiary actual y del nuevo, sin fallback administrativo implícito. Seeds
   actuales incorporan beneficiary: cambiar solo el campo rompería PDA. Requeriría
   identificador estable nuevo, seed original inmutable separado del beneficiario
   activo o migración explícita a otra posición. No recupera automáticamente una
   identidad ya perdida. Una recuperación por tercero preacordada sería una nueva
   potestad que exige decisión explícita, no una consecuencia de "multisig".
2. **Excedentes atribuibles.** Reutilizar como punto de estudio el prototipo host
   existente de créditos; no duplicarlo ni llamarlo contrato. Nuevos depósitos
   necesitarían recibo ligado a origen, monto y CPI exitoso. Refund solo al titular
   del crédito y nunca dejando vault<total−released. Donaciones directas no obtienen
   propiedad retrospectiva; política de fondos sin atribución requiere decisión.
3. **Multisig SPL directo en funding.** Si fuese requisito, revisar ABI y validación
   de threshold/miembros/source owner; no basta quitar `Signer`. Una PDA con CPI
   compatible podría evitar cambio, pero esa ruta debe probarse primero.

Amenazas vNext: robo por authority/recovery, colusión del quórum, sustitución de
destino, créditos falsificados/repetidos, aliases, privilege escalation, CPI fallida
tras escritura, rotación y release en secuencia, seed collision y doble asignación.
Pruebas propuestas: owner/mint/source, firmas y umbral, límites i64/u64, invariantes
principal+créditos, Clock regresivo, fronteras de migración y secuencias con fallo
tardío en procesador nativo autorizado. Conservar todos los negativos del contrato
actual y comparar igualdad de derechos antes/después, sin rescate unilateral.

Migración: no existe close/migrate en ABI actual; otro programa no puede disponer
del vault original por copiar seeds. Mover principal dependería de poderes futuros
expresamente autorizados o liberación legítima; no prometer migración sin coste o
sin consentimiento. Exigir especificación, auditoría de ABI/ELF nuevos, revisión de
custodia, funding/rent, pruebas de upgrade/rollback y aprobación independiente.
Nada de lo anterior está implementado en el contrato.

## Verificación y bloqueos

```sh
npm run test:robusto-custody-compatibility
npm run test:robusto-custody-controls
python3 -m unittest tests/test_founder_vesting_parity.py
npm run test:founder-vesting-parity
node --require ts-node/register tests/robusto-10b9-vesting-preparation.test.ts
node --require ts-node/register tests/robusto-10b9-operational-plan.test.ts
python3 -m unittest tests/test_audit_inventory.py tests/test_external_audit_package.py tests/test_10b9_runtime_evidence.py tests/test_unsigned_runtime_evidence.py
./node_modules/.bin/tsc --noEmit
git diff --check
```

Se conserva sin modificar el perfil histórico, contratos, IDL, seeds, ELF SBF y web
V2. No se repite el gate SBF de 157 casos: no cambian sus fuentes ni artefactos.
Los 30 casos nuevos invocan solo matemática nativa host. Diez findings Meteora,
M-03/M-04 incluidos, siguen abiertos; atomicidad sigue NATIVE_ATOMICITY_NOT_VERIFIED.
Pendientes del propietario: arquitectura/vehículo final, distribución de control,
beneficiary/recuperación, origen UTC, aprobación del calendario, política upgrade,
aceptación de inmovilización y financiación. Ninguna recomendación autoriza operar.

Validación de esta entrega: 94 pruebas automatizadas aprobadas (17 nuevas de
compatibilidad, 23 controles de custodia, 13 adaptador, 23 planificador, 14 Python
de auditoría y 4 Python de evidencia de paridad/source), más 30 comparaciones
nativas. TypeScript y `git diff --check` aprobados. La corrida nativa final debe
quedar ligada al commit limpio de esta entrega en el reporte local indicado.
