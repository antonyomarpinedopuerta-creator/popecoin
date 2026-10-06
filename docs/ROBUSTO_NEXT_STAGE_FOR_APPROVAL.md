# ROBUSTO — siguiente etapa para aprobación del propietario

**PROPOSED_NOT_APPROVED.** Las políticas vigentes están en config/robusto-economics-approved.json y config/robusto-launch-policy-approved.json. Este documento propone detalles pendientes; no aprueba fechas, hardware, cuentas, proveedor, presupuesto, mecanismo o transacciones. MAINNET_DISABLED; no nuevas wallets definitivas, semillas, fondos, firmas, revocaciones ni publicaciones.

## 1. Arquitectura definitiva propuesta de wallets y autoridades

| Rol, dirección distinta | Función | Custodia propuesta |
|---|---|---|
| Mercado/ecosistema | Tesorería500M; solo tramo efectivo autorizado sale al mercado | Hardware/offline; acceso a presupuestos revisados |
| Comunidad/marketing | Tesorería150M; techo2M inicial, campañas posteriores separadas | Hardware/offline; journal público de entregas |
| Reserva | Beneficiario del vesting técnico300M, distinto del equipo | Hardware/offline; no acceso al vault antes de vesting |
| Equipo/fundador | Beneficiario del vesting50M | Hardware/offline; separado de authorities/tesorería |
| Payer | SOL operativo de rent/fees | Wallet independiente con saldo limitado y reposición revisada |
| Mint authority | Emisión inicial exacta y decisión posterior separada de revocación | Hardware/offline; sin automatización de emisión |
| Metadata update authority | Mantener metadata mutable; cambios aprobados | Hardware/offline; conservar permanentemente según política vigente |
| Program upgrade authority | Upgrades de programa | Hardware/offline; revisión de binario/hash y autorización por upgrade |

Ocho direcciones distintas, sin reutilizar PAPA/rehearsal. Mint y program ID son además dos identidades públicas de cuentas a crear; no son autoridades ni wallets de distribución. Su provisión debe contemplar el signer requerido para CreateAccount; no generarlas todavía. Dos vesting PDA/vault y ATAs son direcciones derivadas sin nuevas seeds; cada cuenta consume rent según necesidad real. LP/posición de mercado, si existe, necesita custodia definida aparte, no presumida.

Propuesta preferida: raíces de recuperación independientes para las tres autoridades, una raíz de tesorerías con cuentas/derivaciones distintas para los cuatro beneficiarios y otra para payer. No exige cinco dispositivos físicos; compatibilidad de dispositivos, derivaciones y firma externa debe verificarse antes de elegir esquema. Compartir la raíz de tesorería vincula su riesgo: una recuperación comprometida afecta a sus cuatro cuentas. Si se elige una sola raíz cold para siete roles para reducir coste, las direcciones serían distintas pero no habría independencia de compromiso; el propietario debe aceptar expresamente ese riesgo.

No se ha escogido marca/dispositivo ni precio. Multisig2-de-3 con custodios independientes es una mejora posible, pero no es compatible automáticamente con builders/beneficiarios actuales on-curve; exige implementación/pruebas y coste antes de elegirlo. Varias claves controladas por una persona no son independencia de personas. La arquitectura mínima compatible actual es firma individual externa por rol.

## 2. Creación y backup privados: futura etapa específica

Antes de crear: aprobar roles, custodios, método/dispositivo, derivaciones, inventario público y procedimiento de recuperación. Generación/registro de recuperación se hará por el propietario en dispositivo confiable/offline, fuera de chat, capturas, clipboard sincronizado, OneDrive/Git y workspace de agentes. No usar una única seed copiada entre roles que se pretendan independientes.

El propietario conserva copias privadas offline redundantes en ubicaciones separadas y protegidas; las instrucciones públicas nunca incluirán sus contenidos. Registrar solo rol, public key, método y ruta de derivación no secreta, responsable y referencia opaca de backup. Separar copia pública del software de recuperación privada de signers. Confirmar el formato compatible con cada dispositivo y su restauración; no depender de esta sesión/Astra.

Comprobar restauración en entorno offline y comparar exactamente las public keys antes de financiar o firmar. La prueba de backup no requiere transferencias reales. Si exige nuevas firmas de posesión, será una etapa específicamente autorizada; no se realizan ahora. Evitar mostrar secretos incluso en stdout/logs/errores; no pedir seeds por chat. Las identidades temporales de tests/builds no son candidatas Mainnet ni se reutilizan.

Registrar las claves públicas solo después de esa etapa, verificar on-curve, separación, no coincidencia con rehearsal/PAPA y aprobación de custodios. Integrar firma externa y probar sin dinero real antes de autorización Mainnet. No instalar ahora un generador automático de wallets.

## 3. Fechas concretas propuestas, todavía no adoptadas

Propongo evaluar una fecha base común **2026-11-01 00:00:00 UTC**, posterior al final objetivo del rehearsal. No es una ventana de release, deadline de lanzamiento ni autorización Mainnet; está condicionada a revisión, custodia y financiación verificadas. Si no se cumplen, elegir una nueva fecha futura explícitamente, sin iniciar retrospectivamente un vesting ya acumulado. No mover el calendario Devnet.

| Vesting | Total | Base S | Inicio de acumulación = cliff | Fin |
|---|---:|---|---|---|
| Equipo | 50M | 2026-11-01 00:00 UTC | 2027-11-01 00:00 UTC | 2029-10-31 00:00 UTC |
| Reserva | 300M | 2026-11-01 00:00 UTC | 2027-04-30 00:00 UTC | 2030-04-29 00:00 UTC |

Se usan días exactos de86.400 segundos, no años/meses calendario; los años bisiestos explican finales distintos del mismo día anual. Equipo start=cliff1825027200,end1888099200; reserva start=cliff1809043200,end1903651200. El cálculo offline no modifica baseUtc=null en config aprobada. Aprobar fecha base y beneficiarios antes de construir planes reales; reconciliar fechas, total y saldo de vault antes de declarar bloqueo vigente.

## 4. Arweave: lo que falta

Contenido/logo y preferencia Arweave están aprobados; proveedor/cuenta, coste, método de pago y publicación no. Elegir uploader/proveedor que preserve bytes, entregue IDs verificables y Content-Type image/png y application/json, confirme persistencia/estado y permita descarga sin login; revisar cotización y condiciones antes de abrir cuenta/fondear. No asumir servicio gratuito ni cuenta existente.

Después de autorización específica de publicación/pago: publicar PNG oficial sin transformar, esperar/verificar acceso y descargar byte a byte contra su SHA-256; fijar imageUri=ar://ID_REAL. Generar JSON con descripción aprobada, sin external_url, y guardar hash exacto; aprobar/publicar esos bytes, descargar/comparar y fijar metadataUri y hash. No inventar IDs ni llamar a un gateway arbitrario como prueba de permanencia. Mantener respaldo público de los dos archivos.

Archivos almacenados por contenido permanecen como versiones: futuras ediciones requieren nuevos bytes/URI; la cuenta metadata podrá cambiar URI manteniendo isMutable=true y update authority. Publicar en Arweave es una acción externa con coste/irreversibilidad de contenido distinta de Solana on-chain; requiere permiso aun cuando no use Mainnet Solana. [HTTP API oficial: precio, transacciones y Content-Type](https://docs.arweave.org/developers/arweave-node-server/http-api). Las tarifas son dinámicas; cotizar al uso, no fijar precio en esta propuesta.

## 5. Presupuesto aún por cotizar

Sin precio/SOL actual inventado. Separar costes técnicos, capital temporal y capital de mercado:

| Partida | Datos pendientes y cotización necesaria |
|---|---|
| Programa | Decidir si deployment propio necesario; ELF real/capacidad, rent de Program/ProgramData/buffer, writes, fees, prioridad, buffer reembolsable según ejecución |
| Mint/ATAs | Mint82bytes, cuentas token165bytes por destino real; rent/fees por instrucciones exactas, setup y distribución a tesorerías |
| Vesting | Dos estados145bytes y dos vaults165bytes; Initialize/Deposit y futuros releases, beneficiarios y fechas reales |
| Metadata | Rent/protocol fee medidos mediante simulación futura autorizada; creación y actualizaciones posteriores |
| Arweave | PNG1.496.214bytes más JSON definitivo; servicio/bundler, tarifas/subida, confirmación, método de pago |
| Custodia/operación | Dispositivo/copia privada, firma externa, RPC, revisión independiente, mantenimiento y reserva de reintentos |
| Mercado | Creación/cuentas/comisiones del mecanismo, quote asset, profundidad, retiros/controlLP/posición, posible mantenimiento |

Ahora: `npm run robusto:cost -- offline`. El cotizador RPC requiere autorización futura de lectura Mainnet y parámetros resueltos; no se ejecuta aquí. No asumir que un programa en Devnet es reutilizable en Mainnet; si se usa uno existente Mainnet, verificar compatibilidad, binario y autoridad antes de concluir que evita deployment. Cotizar mecanismos por separado, no incluir SOL del pool como fee perdido ni confundir rent recuperable con liquidez disponible. El plan sin priority instructions no es presupuesto de prioridad/reintentos ni total cerrado. Beneficiarios hardware no evitan rent de vault.

## 6. Mecanismos de mercado: comparación, sin selección

El límite de3M ROBUSTO es un techo del bucket de mercado, no una orden de pool ni una oferta comprometida. Ningún mecanismo se eligió, no hay precio, demanda, cotización, compradores o contraparte verificados.

| Mecanismo | Qué requiere realmente | Capital inicial y límites | Control/riesgos/compatibilidad |
|---|---|---|---|
| Posponer mercado | Completar preparación/custodia/revisión; mantener token técnico separado de negociación pública | Evita capital de pool ahora, no crea negociación | Menor gasto inmediato; PUBLICLY_TRADABLE sigueNO |
| CPMM sobre mint propio | Depositar tokens y activo de contraparte, crear/verificar pool, decidir ratio/LP/fees y capacidad compra+venta | Quote asset real más rent/fees; importe efectivo puede ser mucho menor que3M, pero profundidad escasa implica slippage | Menos mantenimiento de rangos; concentración, retiroLP y riesgo económico; verificar SPL clásico6/mutable/authorities retenidas |
| CLMM/rango concentrado | Par/rango/precio y posición con activos según rango; monitorización/rebalanceo | Puede concentrar capital en un rango, no elimina capital para contrapartida efectiva | Fuera del rango puede no existir liquidez utilizable; más complejidad y fees de gestión; una posición solo en tokens no garantiza salida de vendedores |
| Launchpad/bonding curve | Reglas reales de emisión/reservas, buys/sells, umbral de graduación, fees, destinoLP, custodia y autoridades | Algunos mecanismos captan quote de compradores en lugar de prefundear AMM; todavía hay setup/fees y depende de compras reales | Puede exigir nuevo mint, más supply accesible que el techo aprobado, distribución propia o revocación automática: no compatible por defecto con ROBUSTO |
| Venta/auction/contraparte | Compradores reales, mecanismo verificable de precio/liquidación, condiciones y plan para ventas posteriores | Puede reunir quote, pero no garantiza demanda ni mercado secundario; cotizar contrato/fees/custodia | No inventar proveedor ni ejecutar contratos propios apresurados; venta exitosa no implica PUBLICLY_TRADABLE |
| Liquidez de terceros | Acuerdo real con aportante: activos, control, participación, retiros y obligaciones | Reduce SOL aportado por propietario solo si otra parte aporta; capital no desaparece | Riesgo de contraparte/retirada y condiciones; no asumir patrocinador disponible |

Referencias oficiales para evaluación, no selección: [SDK CPMM Raydium](https://github.com/raydium-io/raydium-sdk-V2-demo/blob/master/src/cpmm/createCpmmPool.ts) exige cantidades de ambos mints; [LaunchLab](https://github.com/raydium-io/raydium-docs-v1/blob/main/products/launchlab/overview.mdx) describe curve/graduación y control/revocación de mint; [Orca rangos concentrados](https://blog.orca.so/the-only-lp-terminal-you-need-on-solana-a-complete-guide-to-orcas-liquidity-terminal/) explica capital dentro de rango. Verificar documentación/program IDs/parámetros vigentes de cada candidato antes de cotizar o decidir. No se instalaron SDKs ni ejecutaron ejemplos de mercado.

Criterio recomendado: primero obtener un techo de dinero real del propietario y decidir si quiere posponer mercado o cotizar un mecanismo compatible con su mint/distribución. Comparar un CPMM pequeño sobre mint propio con una curva/venta solo si esta respeta supply, techos, vesting, metadata y decisión independiente de revocación. No recomendar CLMM como solución automática de poco capital; requiere atención al rango. No presentar launchpad como compatible sin verificar sus invariantes. LaunchLab es ejemplo de posible conflicto de autoridad/revocación, no recomendación de usarlo ahora. Agregadores/enrutadores no crean por sí solos la liquidez que falta.

## Aprobaciones pendientes exactas

Arquitectura de raíces/custodios y dispositivos/backup antes de crear identidades; fecha base propuesta u otra; beneficiarios públicos tras custodia; proveedor Arweave/cuenta/cotización y permiso de upload/pago; presupuesto máximo técnico y aparte de mercado; mecanismos a cotizar, no un depósito de3M; imports/operaciones reales solo mediante autorización posterior específica. Ninguna decisión se adopta por silencio.
