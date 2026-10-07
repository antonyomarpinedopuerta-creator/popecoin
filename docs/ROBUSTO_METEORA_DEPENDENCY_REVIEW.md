# ROBUSTO — revisión de dependencias Meteora, 2026-10-07 UTC

Estado: **CONDITIONALLY_ACCEPTABLE_FOR_NEXT_REHEARSAL**. Es una conclusión técnica
limitada, no autoriza otra rehearsal, Devnet, Mainnet ni producción. La autorización
de la rehearsal anterior expiró. No se declara el protocolo libre de vulnerabilidades.

## Alcance y evidencia

Fuente oficial `MeteoraAg/damm-v2`, paquete `cp-amm 0.2.4`, commit
`a85c926607433f23f0ea60f4ca7b1ae92f4156cb`. ROBUSTO partió de
`a5a42b752372045fe7a8ebe87769c28e89f87065`. Se conservaron sin cambios los
129 inputs de la compilación oficial y la evidencia histórica de rehearsal/audit.
Lock SHA-256: `b5ec7c2a5793afc7f8c46169b23cb370bd90f13a86e753beec7bc01f5c42e1d0`.

El alcance económico/técnico revisado es SPL ROBUSTO/SOL, liquidez concentrada,
`collect_fee_mode=OnlyB`, comisión fija, sin dynamic fee, rewards, compounding,
alpha vault ni locks. El inventario/precios siguen siendo exclusivamente locales.
Otras configuraciones, nuevas instrucciones o features requieren otra revisión.

Se contrastaron tres fuentes diferentes: edges del lock (incluyen dependencias
opcionales), `cargo tree --locked --offline -p cp-amm` con features/target reales,
y fingerprints del build SBF anterior. `cargo metadata` del workspace completo
unifica features de otros paquetes: no sirve solo para afirmar inclusión en SBF.
Target correcto: `sbpf-solana-solana`, usando rustc de platform-tools v1.52.
Los fingerprints confirman `ruint=[alloc,default,std]` y Borsh sin feature `bytes`.

Clasificaciones: `REACHABLE` significa que el flujo puede llamar a la función
señalada; se distingue abajo si se alcanza la condición defectuosa y si su resultado
afecta al flujo. `NOT_REACHABLE` puede referirse a la condición vulnerable, aunque
la función general sí se ejecute; no se oculta esa diferencia. No hay análisis
formal de todas las entradas del protocolo ni prueba de ausencia universal de exploits.

## Los tres advisories

| Advisory | Dependency path completo | Runtime/build | Desde ROBUSTO | Corrección oficial | Conclusión |
| --- | --- | --- | --- | --- | --- |
| RUSTSEC-2026-0007, bytes 1.10.1 | cp-amm 0.2.4 → borsh 1.6.1 → bytes 1.10.1 (edge opcional desactivado) | Lock solamente para este build; no SBF ni host activo de cp-amm | NOT_REACHABLE | bytes >=1.11.1; no actualización publicada de Meteora encontrada | `BytesMut::reserve` no entra en el artefacto revisado |
| RUSTSEC-2025-0137, ruint 1.14.0 | cp-amm 0.2.4 → ruint 1.14.0 (normal, directa) | SBF y aritmética host | NOT_REACHABLE para entrada inválida; función alcanzable | ruint >=1.17.1; no corrección incorporada por Meteora encontrada | La división de Uint normaliza el divisor antes de `reciprocal_mg10` |
| RUSTSEC-2026-0220, ruint 1.14.0 | cp-amm 0.2.4 → ruint 1.14.0 (normal, directa) | SBF y aritmética host | REACHABLE | ruint >=1.20.0, PR 603; no corrección incorporada por Meteora encontrada | Flag erróneo reproducible; se ignora en los shifts de truncamiento revisados; no impacto económico demostrado en este perfil |

### bytes — función y condiciones

`BytesMut::reserve`/reclaim puede desbordar `new_cap + offset` y establecer una
capacidad incorrecta. La versión afectada existe en el lock, pero Borsh declara
`bytes` como dependencia opcional: la feature no está habilitada. Ni el árbol
normal/build/dev de cp-amm ni sus fingerprints SBF incluyen esta crate. No existe
un path *activo* de cp-amm hasta bytes en este build. Otros consumidores host del
workspace o features opcionales del lock no se confunden con el programa desplegable.
Por tanto las siete familias de operaciones solicitadas no alcanzan este código.
El perfil oficial también tiene `overflow-checks=true`, pero la exclusión del
build, no esa mitigación, fundamenta nuestra clasificación.

Fuente: [RustSec bytes](https://rustsec.org/advisories/RUSTSEC-2026-0007.html).

### ruint — recíproco y división

`src/algorithms/div/reciprocal.rs::reciprocal_mg10(d)` comprueba sólo con
`debug_assert!` que `d >= 2^63`, luego usa `TABLE.get_unchecked((d >> 55) - 256)`.
Una llamada directa con `d < 2^63` es insegura en release. No ejecutamos ese PoC UB.

Paths concretos desde cp-amm:

* `get_delta_amount_a_unsigned_unchecked` → `mul_div_u256` → U512
  `div_ceil`/`div_rem` → `algorithms::div`.
* `get_delta_amount_b_unsigned_unchecked(Up)` → U256 `div_ceil`.
* siguiente sqrt para B→A → `safe_div` → U256 `checked_div`.
* `Pool::accumulate_fee` → `shl_div_256` → U256 `checked_div`.

`Uint::div_rem` no llama directamente al recíproco. `algorithms::div` elimina
limbs altos cero, rechaza divisor cero y despacha a `div_nx1`, `div_nx2` o
`div_nxm`. Éstos desplazan la palabra superior según `leading_zeros`, o usan la
rama ya normalizada. Para todo divisor no cero, la palabra entregada al recíproco
tiene bit 63 activo. Entonces `(d >> 55) ∈ [256,511]` y el índice pertenece
a `[0,255]`. `reciprocal_2_mg10` entrega la mitad superior normalizada a la misma
función. No hay llamadas de cp-amm a las APIs públicas de división de bajo nivel.

La función vulnerable sí se ejecuta durante swaps/liquidez; la entrada que causa
el advisory no resulta alcanzable por estos callers de Uint. Esto es razonamiento
de código y tests de bordes, no certificación de todas las funciones unsafe de ruint.
Una futura llamada directa a `algorithms::*` invalidaría la conclusión.

Fuentes: [RustSec](https://rustsec.org/advisories/RUSTSEC-2025-0137.html),
[issue oficial 550](https://github.com/alloy-rs/ruint/issues/550).

### ruint — desplazamientos

Funciones afectadas que realmente se llaman: `checked_shl`, `overflowing_shr`, y
sus wrappers de SafeMath. El código de división también utiliza desplazamientos
internos. El problema incluye flags incorrectos al descartar limbs completos;
los valores desplazados de este caso son correctos. No se debe tratar un resultado
`Some` como prueba general de ausencia de overflow en ruint 1.14.0.

* `concentrated_liquidity.rs` usa `U256::from(1).safe_shl(128)` y
  `U256::from(amount:u64).safe_shl(128)`. Requieren como máximo 1 y 192 bits:
  no se descartan limbs altos en U256.
* `shl_div`/`shl_div_256` convierten un u128 a U256. Los callers del perfil usan
  offset 128 (escala de liquidez) o 64. `128+128=256`: el máximo u128 todavía
  cabe exactamente. El helper acepta `u8` general; no está aprobado usarlo con
  offsets mayores de 128 y valores arbitrarios.
* Delta B redondeado Down y `mul_shr`/`mul_shr_256` usan shifts 128 y descartan
  explícitamente el flag. Ese flag **puede estar mal**, como demuestra el test
  `ONE.overflowing_shr(128)`: valor cero, flag false aunque se descartó un bit.
  El valor coincide con floor(producto / 2^128), que es la semántica buscada.
  Los casts posteriores a u128/u64 siguen comprobándose.
* `Position::update_fee` → `safe_mul_shr_256_cast` → `mul_shr_256` está en esa
  categoría. No se toma ninguna decisión de saldo utilizando el flag ignorado.
* Las anchuras son U256/U512, múltiplos de 64. No se encontró formato de U160
  no-alloc desde datos de usuario. Los offsets revisados no llegan a 2^32.
* `sqrt_u256` (fuera del perfil concentrado/fijo) usa ONE desplazado un máximo
  de 254 y shifts derechos 1/2; no se usa para ampliar esta aprobación a otros modos.

Así, el advisory sigue **REACHABLE**, incluido el defecto de flag, y no se elimina
del audit. El subconjunto revisado no consume ese flag defectuoso; no se encontró
un cambio de amounts/precio por este defecto. No es prueba universal de seguridad
económica ni aprobación de otros fee modes/rewards/compounding.

Fuentes: [RustSec](https://rustsec.org/advisories/RUSTSEC-2026-0220.html),
[corrección oficial ruint PR 603](https://github.com/alloy-rs/ruint/pull/603).

## Matriz por operación

`D` significa función de división alcanzable pero condición de recíproco inválido
excluida por normalización. `S` significa función de shifts alcanzable; ver su uso.
bytes está excluido en todas las filas.

| Operación | División/0137 | Shifts/0220 | Path específico |
| --- | --- | --- | --- |
| initialize customizable pool | D | S, left shift acotado; delta B Up | handle_initialize_customizable_pool → get_initial_pool_information → ConcentratedLiquidity::new → delta A/B |
| crear position NFT vacía | No en la inicialización de la posición | No en la inicialización de la posición | handle_create_position → Position::initialize; mint NFT por CPI es otro programa |
| actualizar posición con fees/liquidez | D según actualización del pool | S, flag descartado | Pool::update_rewards/fee accounting → Position::update_fee → mul_shr_256 |
| depósito unilateral inicial | D | S, left shift acotado | Misma creación del pool; en extremo mínimo delta B=0 antes del mínimo técnico de contraparte |
| swap A→B (vender ROBUSTO) | D | S, delta B Down descarta flag | handle_swap/handle_swap2 → ConcentratedLiquidity::calculate_a_to_b_from_amount_in → next sqrt A → delta B → accumulate_fee |
| swap B→A (comprar ROBUSTO) | D | S, amount u64 <<128 acotado | handle_swap/handle_swap2 → ConcentratedLiquidity::calculate_b_to_a_from_amount_in → next sqrt B → delta A → accumulate_fee |
| remove liquidity | D | S, delta B Down y fees descartan flag | handle_remove_liquidity → actualizaciones posición/pool → get_amounts_for_modify_liquidity(Down) |
| add liquidity | D | S, delta B Up; fees previos descartan flag | handle_add_liquidity → actualizaciones posición/pool → get_amounts_for_modify_liquidity(Up) |

Se revisa tanto el handler Anchor como el custom entrypoint: dispatch de Swap/Swap2
termina en la misma aritmética. Las autorizaciones, CPIs SPL y seguridad de los
programas externos no quedan certificadas por este análisis de tres dependencias.

## Las siete warnings, sin ocultarlas

| Warning / versión | Path completo ilustrativo del lock | Inclusión y materialidad para este flujo |
| --- | --- | --- |
| RUSTSEC-2025-0141 bincode 1.3.3 | cp-amm 0.2.4 → anchor-lang 1.0.2 → bincode 1.3.3 | Runtime SBF y host. Unmaintained: material para mantenimiento a futuro; el aviso no identifica una vulnerabilidad ejecutable concreta. No se declara irrelevante por estar etiquetado warning. |
| RUSTSEC-2024-0388 derivative 2.2.0 | cp-amm 0.2.4 → ruint 1.14.0 → ark-ff 0.3.0 → derivative 2.2.0 | NOT_REACHABLE en el build fijado; ark-ff opcional desactivado. Sería proc-macro HOST_ONLY si se activara. Mantenimiento pendiente upstream. |
| RUSTSEC-2024-0436 paste 1.0.15 | cp-amm 0.2.4 → ruint 1.14.0 → ark-ff 0.3.0 → paste 1.0.15 | NOT_REACHABLE en el build fijado; misma feature opcional desactivada. Proc-macro si se activa; no ruta de swaps actual. |
| RUSTSEC-2026-0190 anyhow 1.0.97 | cp-amm 0.2.4 → anchor-lang 1.0.2 → anchor-attribute-program 1.0.2 → anyhow 1.0.97 | BUILD/HOST_ONLY; también SDK host. Error::context seguido de downcast_mut tiene UB. No se encontraron llamadas downcast_mut en los consumidores Anchor revisados ni rust-sdk. Riesgo residual de herramientas, no SBF. Fix >=1.0.103. |
| RUSTSEC-2026-0012 keccak 0.1.4 | cp-amm 0.2.4 → anchor-spl 1.0.2 → spl-pod 0.7.3 → solana-zk-sdk 4.0.0 → merlin 3.0.0 → keccak 0.1.4 | BUILD/HOST_ONLY para este perfil; código crypto host protegido por cfg(not(target_os="solana")). Backend ARMv8 asm opt-in no habilitado, host actual x86_64. No confundir keccak-const de SBF con keccak. Fix >=0.1.6. |
| RUSTSEC-2026-0097 rand 0.8.5 | cp-amm 0.2.4 → proptest 1.6.0 (dev) → rand 0.8.5; también anchor-spl → spl-pod → solana-zk-sdk → rand 0.8.5 | BUILD/HOST_ONLY/tests. No SBF; log no habilitado en el árbol revisado, sin logger custom que reentre al RNG. Condición completa del aviso no demostrada. Fix >=0.8.6. |
| RUSTSEC-2026-0097 rand 0.9.1 | cp-amm 0.2.4 → ruint 1.14.0 → rand 0.9.1 | NOT_REACHABLE: rand-09 es opcional y desactivado. No runtime/host activo por este edge; la versión permanece en el lock. Fix >=0.9.3. |

Los paths del lock no afirman que todas sus features estén activas. Para anyhow
existen paths adicionales por anchor-syn/anchor-lang-idl; todos pasan por proc-macros.
Las tres warnings de mantenimiento y las cuatro instancias unsound permanecen
en la evidencia original. Ningún ignore/allowlist nuevo se añadió.

Fuentes oficiales de warnings:
[bincode](https://rustsec.org/advisories/RUSTSEC-2025-0141.html),
[derivative](https://rustsec.org/advisories/RUSTSEC-2024-0388.html),
[paste](https://rustsec.org/advisories/RUSTSEC-2024-0436.html),
[anyhow](https://rustsec.org/advisories/RUSTSEC-2026-0190.html),
[keccak](https://rustsec.org/advisories/RUSTSEC-2026-0012.html),
[rand](https://rustsec.org/advisories/RUSTSEC-2026-0097.html).

## Corrección oficial y comparación

La API oficial de GitHub devolvió `main=a85c926607433f23f0ea60f4ca7b1ae92f4156cb`,
fecha del commit `2026-09-08T03:08:16Z`, mensaje `Release 0.2.4 (#225)`.
Las listas públicas de tags y releases estaban vacías. No se encontró corrección
posterior **publicada en main/tags/releases** de Meteora. No se afirma conocimiento
de ramas privadas, trabajo no publicado o futuros commits.

Comparación con nuestra fuente: mismo commit; diferencia de fuente/ABI/IDL y
comportamiento económico **cero**, porque no se cambió la referencia. Las fixes
de bytes/ruint existen en sus respectivos proyectos, pero NO están incorporadas
en el lock oficial que estudiamos. Actualizar nuestro lock sería cambiar la
compilación del protocolo por nuestra cuenta: no se hizo. No se creó fork.

Cuando Meteora publique una actualización, primero comparar Cargo.lock, handlers,
math, fee modes, account layouts, discriminators, IDL y cambios de permisos, después
reproducir binario y volver a comprobar correspondencia pública. Incluso una
actualización sólo de dependencia puede cambiar rounding/error/compute behavior.

Fuentes: [commit oficial](https://github.com/MeteoraAg/damm-v2/commit/a85c926607433f23f0ea60f4ca7b1ae92f4156cb),
[changelog](https://github.com/MeteoraAg/damm-v2/blob/a85c926607433f23f0ea60f4ca7b1ae92f4156cb/CHANGELOG.md),
API pública `https://api.github.com/repos/MeteoraAg/damm-v2/{commits/main,tags,releases}`.

## Correspondencia del programa público

Se usaron exclusivamente dos `getAccountInfo`, commitment finalized, contra el
RPC público de Solana, sin wallet, firmas ni transacciones. Program ID oficial:
`cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`.
ProgramData obtenido del loader: `AUh8bm2XsMfex3KjYGcM3G4uBqUNSDw6HEhWaWMYnyPH`.
Slots observados: Program **454063661**, ProgramData **454063708**; último deployment
registrado: **445230614**, upgrade authority presente.

Tras retirar los 45 bytes de metadata del loader, el prefijo de **1,433,928 bytes**
es exactamente nuestro `cp_amm.so`, SHA-256
`a30610058262a5c87e1b22144ef6053ff2cd8bc9f97b7e978a51e28f8ec3ea3c`.
Los **740,424 bytes** restantes son todos cero. Código+padding (2,174,352 bytes)
SHA-256 `4d5b920baebc090f89b2e8796a3452ed067c9667a143058c96a312f2c1e6848b`.
Estado: **VERIFIED_BYTE_MATCH_AT_OBSERVED_SLOTS**, no sólo coincidencia de IDL o
dirección. Este binario se compiló reproduciblemente de la fuente fijada en la
sesión anterior. La revisión actual verificó nuevamente sus 129 hashes de inputs.

Limitaciones: un proveedor RPC público, dos lecturas no atómicas, sin quorum
independiente ni attestation de tercero. La autoridad puede actualizar el programa;
debe repetirse antes de cualquier futura etapa. No prueba equivalencia de programas
SPL externos ni de un despliegue futuro. El verificador offline valida bytes de
respuestas guardadas, cuya procedencia debe conservar quien hace la consulta.

Herramienta segura: `scripts/verify-meteora-public-bytes.py --help`. No contiene
conexión de red, firmantes ni métodos para enviar transacciones. Requiere los dos
JSON públicos guardados, dirección ProgramData y binario reproducido exacto.

ID público documentado por [Meteora](https://github.com/MeteoraAg/docs/blob/main/developer-guides/damm-v2/index.mdx).

## Validación y condiciones pendientes

**IMPLEMENTED:** informe, evidencia pública resumida, verificador offline que
rechaza artifact/address/loader incorrectos y padding no cero, runner aritmético
aislado. No cambios al adaptador, parámetros, autoridades ni protocolo.

**TESTED:** cinco tests aritméticos en debug y release contra ruint **1.14.0**:
flag defectuoso preservado, shifts acotados exactos, floor U512, 512 bordes de tabla
normalizada y divisores de 1/2/múltiples limbs. Tres tests Python negativos/positivos
del verificador. Ningún PoC UB ni blockchain se ejecutó. La suite del proyecto pasó con 48 tests Rust, 164 cliente/TypeScript y 54 Python;
TypeScript, Clippy, security scan y RC pasaron. El dependency audit del proyecto
conserva 10 findings Yarn (9 moderate, 1 high) y 6 warnings Rust bajo su política
existente. El audit upstream independiente sigue fallando por los tres findings.
Los tests del defecto pasan porque detectan su presencia, no porque lo reparen.
La reproducción nueva del programa ROBUSTO igualó SBF/IDL/TypeScript byte por byte;
no recompiló ni ejecutó otra rehearsal Meteora. Base RustSec usada: commit
`ef6173cbc5c50ec8166f9a5b28f07834144373ee` (más revisión de las páginas oficiales actuales).

**EXTERNALLY VERIFIED:** advisories oficiales actuales; HEAD/tags/releases públicos;
correspondencia byte por byte con ProgramData en los slots anteriores. Esto no
convierte nuestra interpretación de reachability en una auditoría externa.

**PENDING:** fixes upstream; revisión independiente de la justificación de límites
y callers; repetir verificación si cambian binario/fuente/features/configuración;
auditoría económica/global, riesgos de las herramientas host y mantenimiento de
bincode. No aprobación definitiva de plataforma/precio/custodia/lanzamiento.

La siguiente rehearsal sólo sería técnicamente aceptable bajo **la misma fuente,
features, aritmética concentrada y perfil fijo revisados**, con autorización nueva
para el entorno correspondiente. Cualquier entrada nueva a low-level division,
checked shifts de valores generales, U160/no-alloc, fee modes/rewards o dependencia
activa adicional vuelve a revisión. No se habilitó ningún executor ni RPC del
producto. Mainnet permanece deshabilitado y el calendario del tercer Devnet intacto.

Para producción los findings no están corregidos: esta revisión acota el flujo y
resuelve su clasificación técnica; no reemplaza la auditoría completa ni autorización
del propietario. El audit histórico `BLOCKED_FOR_PRODUCTION_REVIEW` se conserva
como resultado del scanner completo, sin sobrescribirlo con una etiqueta favorable.

Clasificación global: **CONDITIONALLY_ACCEPTABLE_FOR_NEXT_REHEARSAL**.
