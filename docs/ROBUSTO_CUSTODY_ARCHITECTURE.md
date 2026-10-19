# ROBUSTO 10B/9: custodia, autoridades y vesting

NOT_AUTHORIZED_FOR_MAINNET · MAINNET_DISABLED · OFFLINE_FIXTURE_ONLY.
Recomendación provisional; no selección de proveedores, identidades, permisos ni calendario.

## Implementado frente a propuesto

El contrato conserva solo initialize/deposit/release. Initialize exige payer,
authority y beneficiary como `Signer`; valida monto positivo, start≤cliff≤end y
start<end. Deposit exige authority guardada, source suyo del mismo mint, remanente
exacto y released=0. Release exige beneficiary guardado y destino suyo del mismo
mint; usa Clock, floor entero y suma acumulada. No impone 10B/9, separación de
roles, multisig, recuperación ni política de mint/freeze.

El inventario valida sintaxis pública y cantidades pero no existencia, control o
estado de cadena. El planificador conserva sus ocho etapas y BLOCKED; no cambia.
El nuevo `robusto-custody-controls.ts` es un validador de capacidades y separación,
no otro planificador. Reutiliza manifiesto, inventario y adaptador existentes.
Comprueba once roles, rechaza permisos ajenos, recuperación ficticia y multisig
SPL como signer Anchor. Detecta dirección repetida y grupo compartido: cambiar
etiquetas no oculta una dirección repetida. Grupos distintos no prueban
independencia de personas/dispositivos ni ausencia de colusión.

`requireComplete=true` exige inventario completo y rechaza concentración o
compatibilidad pendiente. Es política conservadora de revisión, no regla del
contrato. Compartir custodio fundador/beneficiary puede ser justificable pero se
señala para decisión independiente; no se acepta automáticamente. Posición Meteora
y PDA multifirma siguen pendientes incluso con declaraciones completas. Ningún
resultado habilita implementación ni prueba existencia de un beneficiary base58.

## Matriz de permisos y límites

| Rol | Puede / no puede | Pérdida y concentración | Renuncia / implementación futura |
| --- | --- | --- | --- |
| Mint authority | Emitir y cambiar authority según SPL; no liberar vault por ese rol | Compromiso permite dilución mientras exista; pérdida impide cambios | NONE tras emisión completa sería irreversible; revisar supply/distribución y revocación en fase autorizada |
| Freeze authority | Congelar/descongelar cuentas; no tomar fondos por ese permiso | Compromiso bloquea disponibilidad; pérdida puede dejar cuentas congeladas | NONE elimina acciones futuras; revisar cuentas ya congeladas y política antes de renunciar |
| Metadata update | Editar campos permitidos; no cambiar supply ni calendario | Compromiso altera presentación/URI según permisos; pérdida limita mantenimiento | Inmutabilidad depende de programa/flags; NONE no equivale automáticamente a toda renuncia; revisar estado exacto |
| Program upgrade | Sustituir código si loader lo permite; no es rescue del contrato actual | Compromiso puede alterar reglas y apropiarse de vaults existentes con código malicioso | Renuncia vuelve inmutable según loader, sin reparar bugs futuros; revisar ELF, gobierno y procedimiento |
| Liquidez/mercado, 4.000M | Mover saldo propio; no controlar otras asignaciones | Pérdida inmoviliza su saldo; unión con NFT/upgrade concentra fondos y administración | Rotar custodia según SPL/vehículo, no abandonar acceso; financiación quote separada |
| Comunidad, 3.000M | Mover saldo propio bajo política futura; no hay distribución comunitaria automática | Compromiso permite perder asignación; grupo común concentra riesgo | Gobierno, límites, rotación y presupuestos pendientes |
| Reserva estratégica, 1.500M | Controlar saldo propio; no otros fondos | Pérdida compromete reservas | Separar de operaciones/upgrade; política de gasto y recuperación pendiente |
| Desarrollo/operaciones, 1.499M | Controlar saldo propio; no mint ni release ajeno | Exposición frecuente y riesgo de extracción operativa | Separar tesorería de operación diaria; límites y financiación pendientes |
| Custodio fundador, 1M | Control previo al depósito; luego vault es del PDA y derecho del beneficiary | Custodio no recupera principal depositado por ser fundador/authority | No abandonar acceso antes de financiar/verificar; distinguir custodia previa de beneficiary contractual |
| Beneficiary vesting | Cobrar vencido a cuenta propia, con firma y fondos; no cambiar calendario ni rescatar exceso | Sin acceso no hay release; disponibilidad depende de su custodia | No hay rotación/cancelación/cierre en ABI actual; decidir backups o vehículo compatible antes de initialize |
| Custodio posición Meteora | Owner NFT/delegados gestionan posición sujetos a permisos; no control universal del pool | Pérdida afecta LP; compromiso retira profundidad; delegados amplían superficie | Transferencia/delegación/locks dependen de estado/programa; verificar signer y permisos; no asumir liquidez perpetua |

La authority de **financiación del vesting** es otro rol lógico: deposit requiere
su firma y source.owner coincidente. Payer financia creación en initialize. El
contrato no obliga a que payer/authority/beneficiary sean distintos. No se añaden
identidades para esos roles. La permission `transfer_own_tokens` del custodio
fundador solo describe fondos disponibles fuera del vault: no permite transferir
principal no vencido desde el PDA.

## Compatibilidad de firma verificada estáticamente

Anchor exige `Signer<'info>`: pasar cuenta multisig SPL y miembros no satisface
automáticamente ese campo. El wrapper `anchor-spl 1.2.0/src/token.rs::transfer_checked`
resuelto por Cargo.lock usa `&[]` como lista de signers SPL y pasa únicamente
from/mint/to/authority; no añade miembros multisig al CPI de deposit. Esta es la
versión resuelta, distinta del rango 1.1.2 del manifiesto. No se modifica el lock.

Un multisig SPL nativo es candidato para instrucciones SPL que interpreten sus
miembros; no prueba compatibilidad con metadata, loader, vesting ni posición.
Una PDA de un programa multifirma podría obtener privilegio signer por CPI
`invoke_signed` del programa propietario. Requiere revisar programa externo,
forwarding de cuentas, writable, source/destino, owner token y límites CPI. No se
ha probado con el ELF ni se aprueba como beneficiary aquí.

Meteora fijado a `a85c926...`, `ix_remove_liquidity.rs`, exige `signer: Signer`,
NFT del mint de posición y amount=1. `position.rs::assert_authority_with_owner_destinations`
acepta owner o delegate sujeto a permisos y, en ciertos casos, destinos ATA del
owner. Por eso cualquier multisig no equivale automáticamente a owner autorizado.
El validador rechaza SPL multisig directamente como signer de posición; una PDA
de gobierno queda sujeta a prueba de compatibilidad, no a aprobación automática.
Los operadores externos de status/fees y upgrade siguen siendo poderes externos.

## Comparación de arquitecturas

| Modelo | Seguridad / recuperación | Complejidad, dependencias y costes futuros | Compatibilidad |
| --- | --- | --- | --- |
| A: individuos separados | Reduce concentración si personas/dispositivos son independientes; cada signer sigue siendo punto único ante pérdida/compromiso | Menos infraestructura; backups, hardware y formación requieren financiación | Cercano a Signer actual; posesión y recuperación reales pendientes |
| B: multisig administrativo compatible | Umbral puede tolerar pérdida de miembros y limitar acción unilateral; persisten colusión, falta de quórum y software comprometido | Programa externo o SPL nativo según función; revisión, rent/fees y coordinación adicionales, sin cotizaciones | SPL multisig no reemplaza Signer Anchor; PDA por CPI pendiente de prueba; no obliga a cambiar beneficiarios |
| C: híbrido, fondos separados | Administración colegiada y beneficiary individual donde se requiere; no elimina pérdida del beneficiary ni poder del upgrade | Más componentes/procedimientos que A; costes futuros de gobierno, revisión y monitorización | Mejor candidato provisional sin cambiar ABI, condicionado a compatibilidad exacta y custodia individual revisada |

Recomendación provisional: **C**. Separar tesorerías, administración y posición;
estudiar multisig para metadata/upgrade y custodios administrativos compatibles;
beneficiary individual únicamente si el propietario acepta pérdida de acceso y
acredita recuperación de custodia fuera del contrato. No se elige proveedor,
umbral, miembros, hardware ni direcciones. Una función incompatible permanece
bloqueada; no se añade rescate unilateral. A es más simple pero mantiene puntos
únicos; B integral no es compatible por defecto.

## Comparación matemática del millón fundador

`compareFounderVestingScenarios` amplía el adaptador existente con bigint. La
alternativa simple es **desbloqueo único tras 365 días**: start=0 y cliff=end=365,
válido para initialize. Reduce fases/reclamaciones pero concentra toda la
disponibilidad al vencer y elimina liberación gradual; no se selecciona.
La propuesta original usa start=cliff=365 y end=1095 días.

Sin origen UTC: solo offsets. 6/12/18/24 representan cuartos de 730 días:
182,5/365/547,5/730 días, no meses calendario. 182,5 días equivalen a 15.768.000
segundos exactos. Meses calendario exigirían fecha y decisión explícitas.

| Momento | Original: vencido / restante, ROBUSTO | Único día 365: vencido / restante, ROBUSTO |
| --- | --- | --- |
| Inicial | 0 / 1.000.000 | 0 / 1.000.000 |
| Fin bloqueo | 0 / 1.000.000 | 1.000.000 / 0 |
| +6 meses equivalentes | 250.000 / 750.000 | 1.000.000 / 0 |
| +12 | 500.000 / 500.000 | 1.000.000 / 0 |
| +18 | 750.000 / 250.000 | 1.000.000 / 0 |
| +24 | 1.000.000 / 0 | 1.000.000 / 0 |

Cada token tiene 10^9 unidades. La evidencia exacta
`docs/evidence/robusto/founder-vesting-comparison.json` se comprueba byte a byte.
Son **derechos matemáticamente vencidos**, no transferencias observadas:
`actualReleasedBaseUnits=null`. Restante es total menos derecho vencido, no saldo
autenticado de una cuenta. El contrato requiere Clock, firma, destino y CPI;
solo un release exitoso actualiza released. Un vault insuficiente puede impedir
cobro aunque haya derecho vencido. Cliff posterior a start acumula antes del cliff;
start=cliff evita ese catch-up en la propuesta original. No se prueba ejecución
SBF de la alternativa ni estados malformados con este modelo.

## Fondos inmovilizados: evidencia y mitigación

| Riesgo | Evidencia / protección actual | Mitigación y cambio contractual |
| --- | --- | --- |
| Pérdida beneficiary | Firma y destino propio en source/casos SBF históricos; pérdida real es hipotética | Backups/custodia antes de elegirlo, sin cambio. Rotación contractual futura requeriría diseño/consentimiento, nuevo ABI y auditoría; no recupera una clave ya perdida |
| Exceso vault | Casos históricos: donación10, vault110/total100, release100 y exceso10 atrapado; deposit rechaza exceso | Evitar errores/monitorizar, sin poder impedir donaciones. Sweep exigiría cambio auditado de procedencia/consentimiento; no existe |
| Depósitos directos | SPL directo no crea recibo de propiedad; bajo total, deposit completa remanente; tras release deposit está deshabilitado | Verificar saldo y no atribuir propiedad retrospectiva. Recuperación exige diseño nuevo; prototipo host previo no está en contrato |
| Error de asignación | Manifest/inventario rechazan alteración 10B/9; contrato acepta otros montos positivos y calendarios válidos | Doble revisión de cantidades/bytes/identidades antes de futura operación, sin cambio. Corregir beneficiary/calendario posteriormente no está disponible |
| Reutilizar PDA | Seeds beneficiary+mint, `init`, sin cierre: una posición por par; calendario no cambia PDA | Comprobar posición previa en fase de estado autorizada. Varios calendarios por par necesitarían cambio; no derivar nuevas direcciones aquí |
| Rescate supuesto | No rescue/cancel/close/cambio beneficiary; authority deposit no puede reclamar | Rechazar falsa recuperación y aceptar límites. Cualquier nuevo mecanismo exige decisión y auditoría; no backdoor |
| Upgrade comprometido | Capacidad externa de reemplazar código; no exploit ejecutado. Puede afectar vaults existentes | Separación, gobierno compatible y revisión. Custodiar authority no modifica contrato; renuncia irreversible exige autorización y revisión |

Ausencia de rescate no protege frente a upgrade malicioso. Los siete casos de
custodia y 157 casos SBF siguen siendo históricos: no se repiten sin cambiar
runtime/contrato/ELF. Se verificó el paquete previo de `d2bda9a` contra hash retenido
`1e3e97c0d00f67fb7ce239e16282f00b3a5b51b22a77675985ed97ba0a44fc8a`;
no acredita ejecución de este HEAD. Atomicidad nativa sigue sin verificar.

## Decisiones y validación

Confirmado: ROBUSTO, 10B, nueve decimales y cinco asignaciones exactas. Pendiente:
arquitectura final, umbral/miembros, custodios/recuperación, beneficiary, calendario
y origen UTC, políticas mint/freeze/metadata/upgrade, posición/delegados.

Auditor externo: Anchor/ABI, aliases y destinos, compatibilidad real multisig,
recuperación/quórum, migración/inmutabilidad y procedencia de artefactos. Meteora
conserva diez findings, incluidos M-03/M-04: custodia no corrige ruint ni bincode.
`NATIVE_ATOMICITY_NOT_VERIFIED` permanece.

Financiación futura: hardware/procedimientos, revisión externa, rent/fees y capital
quote/LP. No hay importes ni capital confirmado. Nada se crea, firma, conecta,
despliega, financia ni gasta. No se declara ROBUSTO auditado ni listo para producción.

Validación de esta entrega: 23 pruebas nuevas de controles/comparación, 63
regresiones TypeScript existentes (17 manifiesto, 13 adaptador, 10 inventario,
23 planificador), 12 de matemática Rust y 14 Python: **112 aprobadas**.
También TypeScript y `git diff --check`. El JSON de comparación no contiene commit
ni fecha para evitar autorreferencia y conservar reproducibilidad.

```sh
npm run test:robusto-custody-controls
node --require ts-node/register tests/robusto-10b9-vesting-preparation.test.ts
node --require ts-node/register tests/robusto-10b9-operational-plan.test.ts
node --require ts-node/register tests/robusto-10b9-offline.test.ts
node --require ts-node/register tests/robusto-10b9-mint-inventory.test.ts
cargo test --offline --locked -p popecoin_vesting --test test_vesting
python3 -m unittest tests/test_audit_inventory.py tests/test_external_audit_package.py tests/test_10b9_runtime_evidence.py tests/test_unsigned_runtime_evidence.py
./node_modules/.bin/tsc --noEmit
git diff --check
```
