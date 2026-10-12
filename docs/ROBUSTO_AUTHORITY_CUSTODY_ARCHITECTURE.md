# ROBUSTO — arquitectura propuesta de autoridades y custodia

Estado: `NOT_AUTHORIZED_FOR_MAINNET` / `MAINNET_DISABLED` /
`OFFLINE_FIXTURE_ONLY`. Diseño y revisión documental; no asigna direcciones ni
beneficiarios, no genera wallets/claves, no cambia programas/configuración y no
autoriza operaciones. Las cantidades económicas se mantienen exactamente como en
[la especificación confirmada](ROBUSTO_CONFIRMED_TOKENOMICS.md). Nueve decimales fueron
seleccionados para el perfil objetivo; no están aplicados en la configuración operativa.

## Hallazgos técnicos que condicionan la propuesta

- La ruta actual `scripts/robusto-production.ts` valida el perfil histórico de 1.000M,
  seis decimales y cuatro buckets. Requiere separar `mintAuthority` de
  `distributionSourceOwner`; no acepta todavía cinco custodias/allocations 10B/9.
  El fixture 10B/9 y sus autoridades sintéticas no son una ruta de producción.
- En el contrato revisado, `initialize` fija en la cuenta vesting a `authority`,
  `beneficiary`, mint, importe y calendario. `deposit` requiere al authority registrado,
  la fuente del mismo owner/mint y completar el saldo exacto restante del vault;
  rechaza nuevos depósitos luego de una liberación. `release` requiere firma del
  beneficiario registrado, mint y destino de su propiedad; el vault es una PDA y la
  transferencia usa esa PDA como autoridad CPI. No hay cancelación, cambio de
  beneficiario ni rescate de tokens por admin. La PDA de vesting se deriva de
  beneficiario+mint, así que solo soporta un estado/calendario para esa pareja; si dos
  buckets tienen el mismo beneficiario pero calendarios distintos, la arquitectura
  actual no permite separarlos sin rediseño. Perder la clave del beneficiario puede
  bloquear fondos permanentemente.
- El tipo `Mint`/`TransferChecked` del programa corresponde al SPL Token clásico; los
  builders productivos también mantienen decimals=6. Elegir nueve decimales exige
  adaptar y verificar el flujo completo, no solo cambiar una constante.
- La revisión de Meteora documenta que un usuario firma su propio swap; el creator de
  ROBUSTO no firma cada compra/venta. Esto no elimina el requisito de usuario/wallet,
  cuenta fuente válida, pool activado, balances y liquidez. Operadores Meteora pueden
  cambiar estado/fees conforme a permisos de protocolo, y el owner/delegado de una
  posición puede retirar su liquidez propia. No se verificó un pool real ni sus
  autoridades actuales.

## Modelo mínimo de roles

Separar significa separar **poder, cuenta y proceso de aprobación**, no solo crear
varias direcciones. Cinco buckets no obligan a cinco beneficiarios particulares, ni
este documento los inventa. Recomendación: una custodia/tesorería dedicada por categoría
y responsables independientes cuando sea viable; no compartir una sola clave humana
entre buckets. Mantener payer y autoridades de protocolo fuera de las tesorerías.

| Rol/categoría | Asignación económica | Control recomendado | Límites que deben imponerse | Riesgo / estado |
| --- | ---: | --- | --- | --- |
| Liquidez y mercado | 4.000.000.000 ROBUSTO | Tesorería mercado separada; el owner del NFT/posición LP se define aparte y conserva solo derechos de esa posición | Aprobar por separado el tramo depositado, destino, rango, pareja, slippage, retiro y reporte. Mantener remanente separado del NFT | El bucket no es LP automático. Owner del NFT puede retirar su posición y reducir profundidad. No hay capital USDC comprometido. |
| Comunidad | 3.000.000.000 | Tesorería comunitaria dedicada con regla pública de subvención/campaña aún por decidir | Límites por campaña, doble revisión y reconciliación; no transferencia abierta por defecto | Sin beneficiarios, calendario o uso aprobados; control de la clave da capacidad de transferir saldo de tesorería. |
| Reserva estratégica | 1.500.000.000 | Custodia aparte con política de uso y calendario aún por decidir | Sin retiro discrecional hasta que se aprueben propósito, autorizadores y reglas | El contrato actual de vesting no es una cuenta de reserva multiuso ni tiene rescate admin. Una PDA de vesting no debe reutilizarse como “caja fuerte” sin diseño. |
| Desarrollo y operaciones | 1.499.000.000 | Tesorería de presupuesto separada del payer SOL y de upgrade authority | Tramos, topes y registros; aprobación dual para transferencias fuera de presupuesto | El saldo de la tesorería es transferible por quien la custodie salvo locks específicos aprobados. No existe calendario confirmado. |
| Fundador | 1.000.000 | Beneficiario individual solo si se confirma; custodia del vault por PDA del programa y cuenta de destino del beneficiario | Escenario de vesting 365 días sin devengo + 730 lineales; `S` UTC y beneficiario pendientes | La liberación requiere firma del beneficiario. Sin rescate administrativo: pérdida de acceso puede ser irreversible. No confundir con autoridad de mint, market o programa. |
| Payer operativo | No recibe asignación ROBUSTO | Cuenta técnica independiente con solo SOL necesario | Presupuesto máximo por etapa; no usar como autoridad de mint, custodio de buckets o owner del NFT | Si se compromete, expone SOL/fees y operaciones que requieran su firma, no debe controlar supply. |
| Mint authority | No es una categoría tokenómica | Custodia de emisión independiente y restringida durante una emisión futura autorizada | Solo cantidad exacta; reconciliar suministro total y cada destino antes de considerar cierre | Si se retiene, puede emitir; su pérdida antes de emisión puede impedir completar supply. Revocar es irreversible. |
| Metadata update authority | No es custodia de tokens | Separada de mint/upgrade y de tesorerías | Cambios con JSON/URI/hash revisados; metadata mutable solo si se elige | Puede alterar información visible/URI y habilitar phishing, no cambia por sí sola balances. |
| Program upgrade authority | No es custodia de tokens | Custodia más estricta; idealmente gobierno con quórum independiente si se implementa y audita | Revisión externa, reproducción binaria, changelog, simulación y aprobación doble por cada upgrade | Retenerla permite cambiar vesting; renunciar bloquea correcciones. No controla Meteora ni sus actualizaciones. |
| Freeze authority del mint | Ninguna bajo el diseño recomendado | `None` al inicializar el mint SPL clásico | Confirmar en el snapshot de mint que el campo siga ausente | Sin freeze el emisor no puede congelar cuentas token; tampoco existe pausa de emergencia a nivel mint. |

Las autoridades no deben coincidir con owners de tesorería por conveniencia. El control
del LP NFT merece atención independiente: no es el mismo permiso que el owner del pool
ni la mint authority. Si un tercero aporta USDC/ROBUSTO, acuerdo escrito debe definir
propiedad del NFT, retiros, fees, contingencia y divulgación; no ofrecer principal o
rendimiento garantizados.

## Comparación de controles de custodia

| Alternativa | Ventaja | Riesgo/coste | Aplicabilidad actual |
| --- | --- | --- | --- |
| Una software wallet compartida para todo | Cero integración adicional y operación sencilla | Un phishing/malware/pérdida controla todos los roles; auditoría de cambios débil | Rechazada para custodiar cinco buckets o poderes críticos. |
| Software wallets distintas en el mismo laptop | Reduce errores de rol y limita parte del alcance de una clave | Host comprometido puede extraer/usar todas; no equivale a custodios independientes | Puede evaluarse para actividad de bajo saldo; no certificada para fondos significativos. El propietario no comprará hardware wallet ahora. |
| Firmantes hardware independientes | Reduce exposición de claves a malware de un solo host y permite revisar mensajes | Coste inicial, recuperación/proceso y experiencia de firma; no evita engaño de usuario, error de destino ni pérdida del recovery | Alternativa posible futura, sin compra ni pruebas en esta sesión. |
| Multisig/quórum con custodios independientes | Un solo firmante comprometido no alcanza el umbral; deja mejor evidencia de aprobación | Coordinación, cuentas/programas y coste de operación; recuperación ante pérdida de quorum; integración actual de builders no demuestra compatibilidad | Recomendación para tesorerías/autoridades críticas **solo tras** adaptar y probar Token SPL, metadata, vesting y loader, y revisión externa. No asumir que el builder actual soporta multisig/PDA. |
| Renunciar a una autoridad | Elimina de forma verificable ese poder administrativo | Irreversible: sin emisión, actualización o upgrade futuros según autoridad; no corrige errores | Mint authority: considerar únicamente tras emisión exacta + reconciliación; upgrade authority: después de auditoría/aceptación de inmovilidad; update authority: solo si metadata final está revisada y se acepta no poder cambiarla. Cada acción exige autorización separada. |
| Custodio/LP externo | Puede aportar controles o capital que el fundador no aporta | Dependencia, tarifas/contratos, control de retiro, conflictos y jurisdicción | Ninguna contraparte existe/está aprobada; no se contactó ni contrató a nadie. |

La medida práctica prioritaria es reducir privilegios, separar roles y poner revisión de
dos personas en mensajes de alto impacto. Doble revisión humana no sustituye multisig
on-chain, y una multisig no soluciona falta de recuperación, software vulnerable ni
aprobación de una transacción maliciosa. Hardware wallet no se compra por ahora; eso no
convierte una laptop en almacenamiento seguro para fondos importantes.

## Emisión fija y revocación verificable futura

Con nueve decimales, 10.000.000.000 tokens equivalen a `10^19` unidades base y caben
en u64. La propiedad matemática no prueba compatibilidad productiva. En una futura etapa
autorizada y auditada, un diseño de emisión fija necesitaría: (1) elegir/validar mint y
decimals=9; (2) emitir exactamente `10^19` base units; (3) conciliar mint supply,
fuentes, cinco buckets, vaults y cuentas de destino contra un snapshot auténtico y
actual; (4) revisar de forma independiente que no hubo exceso/faltante ni otra emisión;
(5) presentar la instrucción SPL `SetAuthority(MintTokens, None)` ligada al mint y al
plan/hash revisado; (6) obtener autorización expresa de esa operación irreversible y
verificar después que supply permanece exacto y mint authority está ausente.

Revocar antes de completar el total puede hacer imposible completar la distribución;
revocar después evita futuras emisiones pero no evita que holders quemen tokens,
transferencias o pérdidas de custodia. Un fixture local con `mintAuthority=None` solo
demuestra la respuesta del programa simulado. El builder de producción existente aún
representa el perfil 1B/6, por lo que su revocation planner no debe aplicarse al perfil
10B/9 hasta adaptar, revisar y volver a probar el camino. Nada de esta secuencia se
ejecutó aquí.

## Freeze authority: recomendación y límite

Recomiendo `freezeAuthority=None` para el mint clásico si se conserva el objetivo de
transferencia libre: reduce el poder unilateral de congelar cuentas de usuarios y el
riesgo de censura/abuso de esa autoridad. Es verificable leyendo los campos de freeze
authority del mint después de su inicialización.

El coste de esa decisión es renunciar al mecanismo SPL para contener una cuenta
comprometida, fraude, error o incidente. No se podrá congelar una cuenta ni descongelarla
mediante una clave del proyecto. No hay “pause” de transferencias global por este campo;
las pausas de un pool Meteora son controles separados y pueden afectar swaps sin
congelar los tokens. No añadir freeze authority encubierta vía extensiones Token-2022,
transfer hooks, listas de deny o programa intermediario; cualquier variante distinta de
SPL clásico requeriría análisis y autorización nuevos.

## Vesting del fundador y pérdida de acceso

Cantidad: 1.000.000 ROBUSTO. Escenario, no decisión final: `start = cliff = S + 365d`,
`end = start + 730d`, devengo cero durante los 365 días y lineal después. Beneficiario
y `S` UTC quedan pendientes. El contrato actual deriva PDA/vault de beneficiario+mint;
release exige firma del beneficiario y transfiere solo a una cuenta token cuyo owner
sea ese beneficiario. No hay cambio de beneficiario o recuperación administrativa.

Antes de depositar: revisar si se necesita un esquema de recuperación compatible (por
ejemplo, beneficiario multisig integrado y auditado). No apuntar a un recovery authority
del creador que pueda redirigir o incautar fondos. Si el programa no admite una opción
de recuperación que preserve la propiedad exclusiva, informar que el riesgo de pérdida
permanente es inherente y decidir si se acepta o se pospone; no modificar este contrato
por esta documentación.

## Meteora y compraventa sin permiso del fundador

La evidencia source/fixture local revisada indica que el usuario es signer del swap y
que la autoridad del vault swap es una PDA Meteora; la cuenta de posición/NFT no forma
parte del swap normal. Así, después de desplegar un pool válido y financiado, la ruta
normal no requiere servidor ni firma del fundador. El usuario sigue autorizando su
propia operación con su wallet. Esto no demuestra swap Mainnet ni un pool real.

El owner de la posición LP o un delegate con los permisos admitidos puede añadir/quitar
liquidez conforme al programa; retirar profundidad puede empeorar ejecución y ventas.
Operadores Meteora con permisos de protocolo pueden cambiar `pool_status` o fees; la
activación, whitelist inicial, estado y fee config pueden limitar swaps. No son una
firma del fundador por trade y no se deben presentar como poderes controlados por ROBUSTO.
Verificar las cuentas/operadores concretos y las reglas fijadas antes de cualquier
mercado. **Tres advisories + siete warnings siguen abiertos** y requieren la revisión
externa/mitigación anotada en el registro Meteora. **Atomicidad nativa permanece
`NATIVE_ATOMICITY_NOT_VERIFIED`.** Ninguno se cierra con esta arquitectura.

## Checklist de validación futura (no ejecutar en esta fase)

1. Seleccionar un solo perfil productivo; validar 10B/9 en builders, IDL, mint classic,
   vesting, metadata, mercados y tipos enteros; conservar intacto el 1B/6 histórico.
2. Definir responsables por rol, umbral multisig si aplica, recuperación ante pérdida,
   separación de operadores y conflicto de interés; auditar credenciales y controles.
3. Comprobar que ninguna address se comparte entre mint/update/upgrade/payer y las cinco
   tesorerías salvo excepción revisada; owners únicos y buckets reconciliables.
4. Verificar mint owner/program, decimals=9, supply esperado, mint authority activa solo
   durante emisión, freeze authority ausente y ausencia de extensiones no aprobadas.
5. Revisar mensaje exacto de emisión y reparto; comparar suma `10^19` raw con cinco
   cuentas/vaults y confirmar que el bucket de 4B no se interpreta como LP automático.
6. Solo después de reconciliar y con autorización irreversible separada, revocar mint
   authority y releer/verificar ausencia + supply exacto. No reutilizar el planner 1B/6.
7. Verificar por separado update authority, metadata hash/URI y mutabilidad; revisar
   ProgramData/upgrade authority y proceso de upgrade o renuncia.
8. Auditar vesting con beneficiary, `S`, start/cliff/end, amount raw, owner del vault,
   destino beneficiario y doble release; documentar que la pérdida de clave puede lockear.
9. Revisar pool/LP NFT mint, token account owner/delegate/lock, proveedor de USDC,
   `pool_status`, activation/whitelist, operadores, fees y retiro; verificar compra/venta
   permissionless con usuarios independientes y sin key del fundador.
10. Probar transacción completa con rollback nativo bajo herramienta aprobada, no con
    simulador de instrucción; cerrar o aceptar formalmente cada hallazgo externo. Hoy no
    existe evidencia de atomicidad nativa y no se deben saltar estas puertas.
11. Firmar checklist técnica de release, guardar hashes por canal independiente y
    solicitar autorización expresa por cada operación de red/gasto/despliegue.

## Decisiones adicionales del propietario

- Confirmar política de mint authority después de emisión/reconciliación: revocar
  irreversiblemente o retener bajo gobernanza de quórum y divulgar la capacidad de emitir.
- Confirmar freeze authority ausente, aceptando que no habrá freeze de emergencia a
  nivel de mint. La recomendación del diseño es `None`.
- Elegir custodia/quórum para cada bucket y authority; designar responsable de NFT LP y
  política de retiro sin inventar nombres o direcciones aquí.
- Confirmar si el fundador será beneficiario del millón, el timestamp UTC y los términos
  exactos del escenario 365/730; decidir conscientemente el riesgo de pérdida de acceso.
- Decidir qué controles externos del operador Meteora son aceptables y el tratamiento de
  los diez hallazgos; la alternativa segura mientras tanto es no lanzar.
- Autorizar o rechazar separadamente generación de identidades, movimientos, revocación,
  gasto, despliegue, pool y publicación. Ninguna autorización se presume por esta nota.

Fuentes internas inspeccionadas: `scripts/robusto-production.ts`,
`programs/popecoin_vesting/src/instructions/{initialize,deposit,release}.rs`,
`ROBUSTO_AUTOMATIC_TRADING_REVIEW.md`, `ROBUSTO_CONFIRMED_TOKENOMICS.md` y
`ROBUSTO_METEORA_DEPENDENCY_REVIEW.md`. Esto es análisis de repositorio y diseño, no una
auditoría independiente.
