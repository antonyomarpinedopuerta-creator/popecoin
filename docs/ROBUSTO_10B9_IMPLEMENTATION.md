# ROBUSTO — alternativa técnica 10.000 millones / nueve decimales

PROPOSED_NOT_APPROVED / NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED /
OFFLINE_FIXTURE_ONLY. Base inicial `ff5a49dc990d091b3146fa96454a96da84301ba0`.
No se sustituye el perfil de 1.000M/seis decimales ni la simulación 10.000M/seis.

## Configuración y unidades exactas

[Alternativa JSON](../config/robusto-tokenomics-10b9-alternative.json) y
[builder aislado](../scripts/robusto-10b9-alternative.ts). Solo instrucciones públicas
ficticias, sin objetos de transacción, Connection, claves o firmas. Guard anti-claves
se carga antes del SDK. Decimales=9 y cantidades usan bigint/BN/u64, nunca Number.
Emisión y distribución usan public keys ficticias distintas; el fundador solo es
beneficiario de vesting. El builder no prepara creación de wallet, despliegue, gasto
de renta, metadata ni pool.
Los fixtures proporcionan cuentas de prueba ya asignadas; la inicialización SPL y
el initialize vesting sí se ejecutan contra SBF local.

| Bucket | Tokens | Base units (nueve decimales) | Porcentaje |
| --- | ---: | ---: | ---: |
| Liquidez/mercado | 4.000.000.000 | 4.000.000.000.000.000.000 | 40% |
| Comunidad | 3.000.000.000 | 3.000.000.000.000.000.000 | 30% |
| Reserva | 1.500.000.000 | 1.500.000.000.000.000.000 | 15% |
| Desarrollo/operaciones | 1.499.000.000 | 1.499.000.000.000.000.000 | 14,99% |
| Fundador | 1.000.000 | 1.000.000.000.000.000 | 0,01% |
| Total | 10.000.000.000 | 10.000.000.000.000.000.000 | 100% |

u64 máximo=18.446.744.073.709.551.615. El supply cabe, con margen de
8.446.744.073.709.551.615 base units; excede i64 y Number.MAX_SAFE_INTEGER.
Importes de token son u64; timestamps son i64 y no reciben el supply. Multiplicación
para porcentajes/conservación usa bigint/u128, porque intermediarios pueden superar
u64. Se rechazan más de nueve decimales fraccionarios; no hay redondeo silencioso.

El máximo representable a nueve decimales es 18.446.744.073,709551615 tokens. Cambiar
las nueve posiciones a diez produciría 1e20 unidades para esta oferta y no cabría en
SPL clásico. No usar float para la conversión ni reinterpretar un mint existente con
otros decimales: elegir identidad nueva requeriría autorización futura separada.

## Inventario del perfil anterior

[Inventario de ocurrencias exactas](evidence/robusto/legacy-1b-numeric-anchors.json):
38 anclas numéricas en 21 archivos públicos revisados. Incluye coincidencias que son
escala SOL, importes de tests o operandos aritméticos, señaladas como tales por su
contexto; no hacer sustitución global de 1e9. Se excluyen IDL generado y target.

Los puntos que fijan directamente el perfil anterior son:

- config/robusto-production.json, robusto-economics-approved.json,
  robusto-distribution-proposal.json y robusto-meteora-local.json: supply/decimales.
- scripts/robusto-production.ts: SUPPLY, validateDistributionProposal,
  validateApprovedEconomics, validateDistribution, MintToChecked y reconciliación.
- scripts/robusto-metadata.ts: validación de branding/supply/decimales.
- scripts/robusto-launch-policy.ts: importa SUPPLY anterior; caps y vesting históricos.
- scripts/robusto-meteora-local.ts y robusto-meteora-rehearsal.ts: mint fixture,
  inventario, validación, conversión de precio y conservación del perfil seis decimales.
- Tests correspondientes conservan expectativas del perfil anterior. Las pruebas
  nuevas están separadas; no se cambia el significado de las anteriores.

El contrato vesting no fija supply/decimales ni porcentajes: usa total_amount u64 y
TransferChecked con mint.decimals. Su ABI/fuentes/ELF no cambiaron. El inventario
numérico no sustituye revisar todos los consumidores si se adopta la alternativa.

## Evidencia de ejecución y reservas del fundador

Modo aislado `--10b9-only` del harness existente. Fixture exportado protegido y fijado
por SHA-256; IDL fijado y ambos ELF ROBUSTO/SPL cotejados contra hashes históricos.
Once ejecuciones/comprobaciones runtime con permisos sintéticos:

1. InitializeMint2 y emisión exacta 1e19 al origen ficticio.
2. MintToChecked adicional u64 máximo: Overflow(14), estado raw intacto.
3. MintToChecked con decimals=8: MintDecimalsMismatch(18), estado intacto.
4. Cuatro transferencias de distribución, initialize/deposit vesting y cierre de
   autoridad ficticios: origen cero, fundador reservado en vault PDA y buckets exactos.
5. Tras cerrar mint authority, emitir una unidad falla FixedSupply(5), sin efectos.
6. Restaurar mint authority con el permiso antiguo falla FixedSupply(5).
7. Release antes del calendario falla NothingToRelease(6002).
8. Release a mitad transfiere exactamente 500.000 tokens a beneficiario.
9. Repetición sin nuevo devengo falla 6002.
10. Release final completa exactamente un millón, vault cero.
11. Repetición final falla 6002.

Conservación de supply sobre los cinco buckets/vault/destino y lamports comprobada.
El perfil del fundador usa base ficticia S=0, start=cliff=S+365 días, end=start+730 días:
no devengo durante bloqueo. No son meses naturales ni fechas o beneficiarios reales.
Otros buckets no se consideran técnicamente bloqueados. Una sola PDA por beneficiario
+ mint sigue limitando calendarios múltiples para la misma pareja.

Dos tests Rust adicionales prueban el cálculo del contrato real a supply>i64::MAX,
rounding de una unidad temporal y rango i64 completo. Cinco tests TypeScript prueban
conservación, conversión exacta hasta u64 máximo, rechazos de precisión/overflow,
ABI serializada y estado de mint cerrado con owner/layout/supply/autoridades correctos.
El verificador local de mint no autentica procedencia de una cuenta de red aportada.

## Suministro fijo: qué se verifica

El cierre ocurre únicamente sobre cuentas ficticias dentro del harness, sin revocación
real. SPL fijado rechaza emitir después de mintAuthority=None. Antes del cierre la
autoridad todavía puede emitir: el builder no promete exclusividad de la primera
emisión. La ceremonia futura debe reconciliar exactamente el total y después someter
el cierre irreversible a una autorización específica. Ninguna se concede aquí.

Holders SPL pueden quemar tokens y reducir supply. “Fijo” aquí significa emisión inicial
máxima y ninguna emisión posterior, no imposibilidad de reducir el total por burns.
No añadir autoridad de freeze o transferencia al fundador. El mint ficticio usa freeze=None.
No se afirma inmutabilidad de programas externos ni seguridad universal del protocolo.

## Compraventa y Meteora

Cambiar supply/decimales no añade un permiso del fundador a TransferChecked o al swap
permissionless revisado. La evidencia anterior B→A/A→B sigue referida al perfil histórico;
**no es una nueva prueba de pool Meteora con nueve decimales**. Los operadores externos
pueden pausar/cambiar fees, y el dueño NFT puede retirar liquidez. No exige servidor local
del fundador para ejecutar contratos una vez existan despliegue/pool autorizados.

El precio raw debe revisarse: relación base-unit B/A = precio humano B/A ×
10^(decimalsB−decimalsA). Con SOL=9 y ROBUSTO=9 el factor es 1; antes era 1000.
No reutilizar sin conversión sqrtPrice/rango/inventario del perfil seis decimales.
Meteora nueve decimales, capital/rango/precio/activación definitivos y exposición a
límites U128/Q64 quedan pendientes de un fixture compatible con decisiones futuras.
Tres advisories/siete warnings permanecen abiertos; atomicidad nativa no demostrada.
El engine ejecuta secuencias y descarta localmente errores: no simula Bank/rollback nativo.

## Financiación y adopción

Aportación personal del fundador cero. Patrocinios/subvenciones, trabajo pro bono,
donaciones o proveedor externo de liquidez son alternativas por evaluar, sin financiación
comprometida ni rentabilidad prometida. Revisar contratos, propiedad NFT, retirada y
riesgos legales antes de acuerdos. Gastos de auditoría/retest, fees/rent, metadata y
custodia/operación siguen existiendo; capital de liquidez se financia aparte. Ningún
bucket de tokens por sí solo produce SOL para costes. Ver
[financiación](ROBUSTO_TOKENOMICS_10B_SIMULATION.md) y
[presupuesto](ROBUSTO_MINIMUM_LAUNCH_BUDGET.md).

Para producción faltan decisiones y financiación, integración de los nuevos cinco
buckets en el flujo completo, Meteora del perfil elegido, auditoría independiente,
atomicidad nativa, identidades/metadata/autoridades definitivas, recompilación reproducible
si cambian fuentes/identidad, expediente y autorizaciones separadas. Esta alternativa
no sustituye el candidato anterior ni convierte la propuesta en una RC de producción.

## Reproducción segura

### Constructor de manifiesto determinista 10B/9

El constructor independiente [robusto-10b9-offline.ts](../scripts/robusto-10b9-offline.ts)
lee únicamente el perfil alternativo local y emite JSON a stdout. No crea instrucciones
Solana ni transacciones; no importa SDKs Solana, lee variables de entorno, acepta
argumentos de perfil/red, accede a RPC o contiene mecanismos de firma/envío. Su digest
SHA-256 aporta una huella reproducible del manifiesto, no una firma ni una certificación
de autenticidad del archivo de entrada.

```sh
npm run robusto:prepare-10b9-offline
npm run test:robusto-10b9-offline
```

Para conservar una copia local sin el encabezado de npm, usa `npm run --silent
robusto:prepare-10b9-offline > target/robusto-10b9-preparation-manifest.json`; la ruta no
es configurable desde el constructor. El manifiesto registra importes económicos y
unidades base como cadenas enteras, suma exacta, margen u64, banderas de solo offline y
direcciones/autoridades/beneficiarios/calendarios aún pendientes. El fundador permanece
en 1.000.000 ROBUSTO y el escenario 365/730 días está marcado como no aprobado.

Las pruebas rechazan cambios de suministro, decimales, categorías, cantidades,
asignación del fundador, parámetros desconocidos/red y números JS; también cubren
conversión u64, determinismo y separación del perfil histórico. Son pruebas locales de
validación de configuración: no ejecutan el contrato, no prueban SPL/Meteora, no
demuestran emisión, vesting, atomicidad, estado de red, permisos efectivos ni seguridad
de claves. Esta salida no es una transacción firmable ni un paquete de lanzamiento.
Los flags siguen siendo `NOT_AUTHORIZED_FOR_MAINNET`, `MAINNET_DISABLED` y
`OFFLINE_FIXTURE_ONLY`; no sustituye el builder de instrucciones documentado arriba ni
convierte valores económicos propuestos en una configuración de producción.

```sh
node --require ts-node/register scripts/robusto-10b9-alternative.ts > target/robusto-10b9-fixture.json
CARGO_TARGET_DIR=target cargo run --offline --locked --manifest-path tools/unsigned-runtime/Cargo.toml -- /home/antony/popecoin_vesting /home/antony/popecoin_vesting/target/rehearsal-builds/YMN9Qj5jPNp7j14VPcML1B6xGgcPWVZUGLFU3Mnyfaf-nhw26q4u/program.so --10b9-only
node --require ts-node/register tests/robusto-10b9-alternative.test.ts
cargo test --offline --locked -p popecoin_vesting --test test_vesting
```

Solo si ya existen los ELF/dependencias locales fijados. No usar los wrappers históricos
de build, validator o integración que generan claves o firman. No se reconstruyó SBF:
se compiló el harness y los tests host, manteniendo intacto el contrato.
