> REGISTRO DE PREPARACIÓN HISTÓRICO. ATA/Initialize/Deposit ya FINALIZED; calendario FIJO start2026-10-06 13:32:52, cliff2026-10-07 01:32:52, end2026-10-13 13:32:52 UTC. No recalcular T, repetir setup ni ejecutar preview. Estado vigente en ROBUSTO_STATUS.md; lectura segura: robusto:third-status. Los pendientes de preparación que figuran abajo ya están superados por third-first-batch.md.

> Estado vigente: primera tanda del tercer rehearsal FINALIZED (ATA + Initialize + Deposit); simulación unsigned pre-cliff NothingToRelease verificada. Source=0, vault=10,000,000, beneficiario=released=0. Primer parcial objetivo 2026-10-08 13:32:52 UTC; NO autorizado aún. Evidencia: docs/evidence/robusto/third-first-batch.md. Las secciones de preparación anteriores son históricas y no deben repetirse.

# ROBUSTO — tercer rehearsal temporal, preparado, NO autorizado

El segundo vesting queda ABANDONED_EMPTY_VAULT: no depositar, cerrar ni reutilizar.
Su calendario y evidencia histórica se conservan. El wrapper del segundo permite únicamente snapshot.

## Estado comprobado

EXTERNALLY VERIFIED por RPC Devnet finalized, slot 507376079:
source=10,000,000; supply=10,000,000; segundo vault=0; segundo released=0; segundo beneficiario=0.
Genesis `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`. El lector verificó ProgramData, ELF fijado, mint authority, freeze=null y decimales=6.
Payer: 6301509160 lamports. Las tres cuentas nuevas aún no existen.
Evidencia completa: [third-rehearsal-preview.json](evidence/robusto/third-rehearsal-preview.json).

## Cuentas

| Alias | Dirección |
|---|---|
| Programa | `6nLZrtmi9Uf3E3kJjGY9Po4KqNhvLDQqQAax5UKMAGVk` |
| Mint M | `CfHGrav3zjZyAEdspKwdBGW3yBHYkiz6cYpeeQXoujvo` |
| Payer P | `4nt7G7nXvBNvygsDjn4zS9vQCR1Zgn1GTpyh8Snh5N7m` |
| Authority A | `EEbLZxtZ7hfruksSCG3iKd9CZ7fJ69tQE414Z78Kzt8p` |
| Beneficiario B | `GuKSMzTw7JZfAkh9A4hGYYysmQGpxTxXF2QdC1QHVFTF` |
| Source S | `DHyysduG5SxsqiupB7Zvw32fLq14BUVBZbHKbXBqYcN6` |
| ATA destino D | `9gSDUytN7u3tUk8B8h7Tmdtik8U3SScyXfHRHL2Swgby` |
| Vesting V | `4A63yMPGnrH4XY8yFAAFK8TkRi7rJ3May1GW1DvX2tNN` |
| Vault W | `CNJpJ3D9FUJcMnfpPQgxV6AxMoWbUwvGcUgtp2DmVuAT` |

Identidad generada en directorio privado ignorado por Git, 0700; archivo 0600.
No se guarda ningún secreto en documentación/Git. Public key contrastada con roles existentes,
beneficiarios anteriores y lista protegida del planner. No se reutiliza identidad histórica.

## Calendario relativo que no caduca esperando autorización

T = chain time fresco al preparar el Initialize autorizado. No usar fechas ilustrativas como fechas aprobadas.
- Inicio S0 = T + 48 horas.
- Cliff = S0 + 12 horas (60 horas desde T).
- Final = S0 + 7 días (9 días desde T).
- Primer parcial: objetivo S0 + 2 días; ventana [cliff, S0 + 3 días).
- Segundo parcial: objetivo S0 + 4 días; ventana [S0 + 3 días, final - 6 horas).
- Final: cualquier momento >= final; no exige responder en minutos.

ATA puede crearse antes de fijar T. Guardar fechas UTC y segundos exactos ANTES de firmar Initialize,
y comprobar que se almacenaron idénticas al finalizar. Después son inmutables.
Deposit y simulación pre-cliff deben completarse preferentemente antes de inicio; exigir al menos
12 horas restantes hasta cliff ANTES de depositar. Si falta margen: NO depositar y detenerse.
La simulación pre-cliff requiere además >=1800 segundos. No puede garantizarse una ventana eterna
si la máquina permanece apagada durante días; este calendario ofrece días, no minutos.

IMPLEMENTED: opción local explícita `extended-devnet-7-days`; máximo 604800 segundos.
El máximo anterior de 3600 segundos era SOLO del planner y se conserva por defecto.
El programa exige total>0 y start<end, start<=cliff<=end; no impone una hora.
No se modificó ni recompiló ni desplegó el programa. Los márgenes temporales de este documento
son condiciones adicionales de ejecución: revisar de nuevo antes de cada firma.

## Plan completo — seis transacciones separadas

Rent y fees en lamports Devnet, sin prioridad adicional. Reconsultar antes de firmar; detenerse si exceden límites.
Todas usan el mismo mint M, programa candidato y classic SPL Token.

| Operación | Cuentas principales | Firmantes | Cantidad raw | Rent | Fee máxima | Condición |
|---|---|---|---:|---:|---:|---|
| Crear ATA | P,B,M,D | P | 0 | 1,488,440 | 5,000 | D ausente; sin límite de fecha |
| Initialize | P,A,B,M,V,W | P,A,B | total=10,000,000; no transfiere tokens | 2,875,280 | 15,000 | V/W ausentes; fijar T y fechas nuevas |
| Deposit | A,M,S,V,W; P paga | P,A | 10,000,000 S→W | 0 | 10,000 | released=0,W=0,S=10m; >=12h hasta cliff |
| Simular pre-cliff | B,M,D,V,W; P | Sin firmas; sigVerify=false | 0 efectivo | 0 | 0 | Antes cliff, >=1800s; esperar error6002 |
| Primer parcial | B,M,D,V,W; P paga | P,B | vested(now)-released | 0 | 10,000 | Primera ventana; 0<vested<total |
| Segundo parcial | B,M,D,V,W; P paga | P,B | vested(now)-released | 0 | 10,000 | Segunda ventana; primer release finalized; incremento>0 |
| Final | B,M,D,V,W; P paga | P,B | 10,000,000-released | 0 | 10,000 | now>=end; resto>0 |
| Reconciliación RPC | M,S,D,V,W y históricos | Ninguno | Lectura | 0 | 0 | Tras finalized |

Cuentas auxiliares: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA en todas;
System 11111111111111111111111111111111 en ATA/Initialize;
SysvarRent111111111111111111111111111111111 en Initialize;
programa ATA ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL para crear ATA.
Orden exacto y flags de las cuentas: `previewOnly.steps` y `feeQuotes` en evidencia JSON.

Rent total=4,363,720; fees máximas=60,000; máximo total=4,423,720 lamports (0.004423720 SOL Devnet).
No se solicita airdrop ni fondos reales. No cierres; rent permanece en cuentas.
A las horas objetivo exactas: primer release 2,857,142; segundo 2,857,143; final 4,285,715 raw.
Son ejemplos: cantidades reales dependen de Clock al incluirse cada release, con redondeo entero.
Release no acepta importe: libera lo devengado menos released.

Antes de cada transacción: genesis, owners/mint, supply, autoridades, balances, estado temporal,
blockhash fresco, fee/rent, saldo payer y simulación. Confirmar finalized y guardar firma/slot/fee/estado
antes de seguir. Guardar firma calculada antes de enviar; ante incertidumbre consultar firma y cuentas,
NO reenviar automáticamente. Nunca repetir una operación finalized. No depositar más de una vez.

Reconciliación exigida: S=0,W=0,D=10m,total=released=10m,supply=10m; autoridades intactas;
primer vesting y segundo abandonado intactos. No mint extra, metadata, upgrade ni Mainnet.

## Evidencia y límites

TESTED: TypeScript 73/73 y tsc sin errores; incluidas opt-in/límites/ABI y aritmética de siete días
(pre-cliff, dos parciales, final y repetición sin remanente).
EXTERNALLY VERIFIED: simulación sin firmas ATA+Initialize+Deposit exitosa contra programa Devnet;
source simulado=0, destino=0, vault=10m. Mismo bundle + Release falla en instrucción3 con custom6002.
Los bundles son exclusivamente simulaciones; no autorizan envío combinado ni crearon cuentas reales.
No se verificaron firmas en la simulación ni releases futuros mediante RPC.
PENDING: autorización de ejecución, creación real de ATA/V/W, Deposit, prueba pre-cliff sobre estado real,
dos releases parciales separados, final y reconciliación. No hay proceso programado ni envío automático.

Reproducir preparación sin secretos: `node --require ts-node/register scripts/robusto-third-preview.ts`.
El script solo lee RPC y simula; no firma/envía y rechaza cuentas nuevas ya existentes.
Config mantiene startUtc=null hasta Initialize autorizado. El JSON preview contiene fechas ilustrativas.
