# ROBUSTO: planificador operativo abstracto 10B/9

`NOT_AUTHORIZED_FOR_MAINNET` · `MAINNET_DISABLED` · `OFFLINE_FIXTURE_ONLY`.

El nombre, suministro de 10.000.000.000 tokens, nueve decimales y cinco asignaciones
son los datos confirmados para esta fase. El manifiesto anterior conserva sus
etiquetas históricas de propuesta y no se reescribe ni se adopta en producción.
El planificador independiente reutiliza su validación exacta, el inventario de mint
y el adaptador abstracto de vesting; no importa builders ejecutables.

## Uso offline

```sh
npm run robusto:plan-10b9-offline
npm run test:robusto-10b9-operational-plan
node --require ts-node/register tests/robusto-10b9-offline.test.ts
node --require ts-node/register tests/robusto-10b9-vesting-preparation.test.ts
node --require ts-node/register tests/robusto-10b9-mint-inventory.test.ts
./node_modules/.bin/tsc --noEmit
python3 -m unittest tests/test_audit_inventory.py tests/test_external_audit_package.py tests/test_10b9_runtime_evidence.py tests/test_unsigned_runtime_evidence.py
git diff --check
```

El CLI acepta cero argumentos y emite JSON a stdout. No guarda archivos por sí
mismo. `docs/evidence/robusto/10b9-operational-plan.json` conserva su salida exacta;
una prueba compara los bytes. `planSha256` cubre JSON canónico sin ese campo;
`inputSha256` cubre todas las declaraciones y referencias, incluidas en la salida.
El inventario de auditoría incluye hashes del nuevo código y de esta evidencia.
No se añaden dependencias ni se requiere red.

Validación de esta entrega: 23 tests nuevos del planificador, 40 regresiones
existentes (17 manifiesto, 13 vesting, 10 inventario) y 14 tests Python de
integridad/evidencia, todos aprobados; TypeScript y `git diff --check` aprobados.
Se mantienen coincidentes los 129 hashes fuente Meteora, su lock y las dos copias
ELF fijadas; la tercera salida `cargo-build/.../cp_amm.so` continúa discrepando y
no se incorpora como artefacto verificado.

## Etapas y alcance

| Etapa | Estado del input fijo | Condición / alcance |
| --- | --- | --- |
| Identidad mint | BLOCKED | No existe mint seleccionado ni verificación autenticada |
| Supply y decimales | READY_FOR_REVIEW | Aritmética del manifiesto; no estado de un mint real |
| Autoridades | PENDING | Declaración y referencia de revisión por cada rol |
| Cinco asignaciones | READY_FOR_REVIEW | Suma exacta de 10^19 unidades, dentro de u64 |
| Custodios | PENDING | Cinco custodios, beneficiario y revisión de recuperación |
| Vesting fundador | BLOCKED | 365/730 sin aprobación, beneficiario ni origen temporal |
| Requisitos de liquidez | BLOCKED | Mint verificado, activo y financiación externa, posición y riesgos |
| Seguridad final | BLOCKED | Diez hallazgos Meteora, atomicidad nativa y auditoría independiente |

Estado global actual: **BLOCKED**. `READY_FOR_REVIEW` significa que una entrada
está disponible para revisión; nunca autoriza operaciones. Las referencias
`DECLARED_REVIEWED` son declaraciones locales no autenticadas, no firmas ni
verificación de financiación, custodia o estado de cadena. Una referencia faltante
no puede ser reemplazada por un booleano. `NONE` es una declaración de autoridad
ausente y necesita revisión explícita; `null` siempre sigue pendiente.

La API `buildPendingOperationalInput(manifest)` crea únicamente una plantilla
sin identidades. `buildOperationalPlan(manifest, input)` valida cantidades,
roles, revisiones, calendario y checklist. Su modo `FINAL_REVIEW` exige campos
completos y rechaza los bloqueos restantes. `OPERATIONAL_PREPARATION` también
rechaza: el inventario existente solo acepta `LOCAL_DECLARATION` con
`rpcStateVerified=false`. No existe una opción de bypass ni un booleano que
convierta esa declaración en mint verificado. La adquisición y autenticación
futuras de evidencia de cadena necesitan otra fase autorizada; aquí no se implementan.

El calendario suministrado se valida mediante el helper hipotético existente:
1.000.000 tokens = 10^15 unidades; start=cliff=origen+365 días y end=start+730 días,
en segundos exactos dentro de i64. No se aprueba ese calendario ni se cambian
contratos o PDA. Beneficiario perdido carece de recuperación administrativa y las
donaciones directas al vault pueden quedar bloqueadas. Custodios compartidos
se señalan explícitamente como concentración de control; sintaxis pública no
demuestra control, independencia ni capacidad de recuperación.

Liquidez y mercado conserva 4.000.000.000 tokens = 4×10^18 unidades. El checklist
exige referencia de activo de cotización, financiación externa separada de quote
y comisiones, custodio de posición y evaluación Meteora. No propone precio,
capital disponible, reservas, valoración ni trades. La asignación no demuestra
depósito. Aunque existan referencias locales, el gate de mint y la revisión de
seguridad permanecen bloqueados. M-03 y M-04 siguen abiertos: flag defectuoso
reproducido sin impacto económico demostrado y mantenimiento/deserialización
indirecta pendiente, respectivamente. No se cierra ninguno de los otros ocho IDs.

## Compatibilidad histórica y evidencia previa

| Componente conservado | Perfil / riesgo de uso accidental |
| --- | --- |
| `config/robusto-production.json`, `scripts/robusto-production.ts` | ROBUSTO 1B/6, supply 10^15 unidades; incluye builders transaccionales y cotización RPC; no importado ni ejecutado por el planificador |
| `scripts/production-plan.ts` | Perfil aún anterior PAPA, 10M/6 y beneficiarios históricos; tampoco corresponde a ROBUSTO 10B/9 |
| `scripts/robusto-10b9-alternative.ts`, `scripts/robusto-meteora-10b9.ts` | Fixtures de instrucciones SBF 10B/9 y 9/6, separados del nuevo checklist sin instrucciones; no son una ruta operativa autorizada |
| Manifiesto, inventario, adaptador abstracto 10B/9 | Reutilizados sin cambios en sus contratos o perfiles |

10B/9 necesita 10^19 unidades base frente a 10^15 de 1B/6: factor 10.000.
Reutilizar escala, supply o repartos antiguos es incorrecto. El planificador rechaza
ambos perfiles históricos y cualquier alteración del manifiesto. No se sustituyen
scripts antiguos ni se crean instrucciones, cuentas, claves, firmas o transacciones.

Se verificó el archivo de auditoría previo
`target/robusto-external-audit-d2bda9a27e9e.tar.gz` contra SHA-256 retenido
`1e3e97c0d00f67fb7ce239e16282f00b3a5b51b22a77675985ed97ba0a44fc8a`.
Su evidencia de 157 casos corresponde a `d2bda9a`, no al nuevo commit.
Este cambio de checklist no modifica fuentes runtime, locks ni ELF: no justifica
repetir el gate SBF costoso. Un paquete del nuevo HEAD requerirá repetir ese gate
cuando se necesite entregar dicho candidato al auditor. No se actualiza ni publica
el paquete histórico. `NATIVE_ATOMICITY_NOT_VERIFIED` permanece vigente:
InvokeContext y descarte del harness no demuestran rollback nativo de Bank.

La revisión independiente, financiación real, custodios y recuperación, autoridades
y aceptación de riesgos siguen pendientes. ROBUSTO no se declara auditado ni listo
para producción.
