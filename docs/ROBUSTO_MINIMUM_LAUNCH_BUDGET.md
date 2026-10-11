# ROBUSTO — presupuesto mínimo por evidencias

2026-10-11. NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED / OFFLINE_FIXTURE_ONLY.
Sin precios actuales ni cotizaciones de red. No hay un total monetario mínimo aprobado
ni verificable hoy. Presupuesto reducido no permite omitir revisión, recuperación o
reconciliación. No se recomienda una cantidad de liquidez o precio de token.

| Categoría | Obligatorio para el alcance previsto | Opcional o evitable | Cómo presupuestar sin inventar precios |
| --- | --- | --- | --- |
| Desarrollo | Cerrar defectos, permisos y pruebas del perfil elegido; artefactos finales reproducibles | Nuevos dashboards, servidor comercial propio, bots y funciones fuera de alcance | Horas/alcance pactados; trabajo local existente no exige pagar una red. Coste de trabajo no equivale a gasto de despliegue. |
| Seguridad/auditoría | Revisión independiente y retest de hallazgos para este lanzamiento con fondos | Certificaciones promocionales; ampliar primero a todos los modos no usados | Pedir ofertas por contrato, integración Meteora, dependencias, custodia y operación. Pruebas locales no reemplazan auditoría. No hay oferta local verificable. |
| Despliegue | SOL para rent de programa/ProgramData/buffer según loader y cuentas definitivas, mint/token/vesting/pool/posición; fees base/prioridad de cada operación | Despliegues repetidos, programas propios adicionales; upgrades no necesarios | Medir binario final, tamaños y mensajes; obtener rent/fees frescos solo con autorización futura. Distinguir rent potencialmente recuperable de gasto definitivo. Rent del modelo offline no es una cotización. |
| Metadata | JSON e imagen aprobados; alojamiento/URI accesibles y verificación de bytes para alcance con metadata pública | Dominio propio, web premium, publicación duplicada, contenido extra | Cotización según bytes y proveedor. Arweave es una decisión pendiente; no presumir publicación gratis. Modelo de imagen local: 1.496.214 bytes, falta JSON definitivo. |
| Liquidez | Capital de ambos activos/rango que permita el perfil de mercado elegido; costes de creación/transfers | Aportar todo el bucket, crear múltiples pools, market maker/bot propio | Elegir inventario, precio, rango y slippage; calcular cantidades y pérdidas posibles. Capital comprometido es distinto de gasto. No contar futuros compradores o subida de precio como financiación disponible. |
| Custodia | Entorno dedicado/revisado, protección de wallet, respaldo privado offline y recuperación ensayada, separación de permisos | Hardware wallet descartada por ahora; suscripción de wallet o multisig no elegida | Software puede no tener licencia de pago; dispositivos/soportes, mantenimiento y tiempo de revisión pueden tener coste. No afirmar custodia segura a coste cero. |
| Operación | Payer con saldo limitado de fees, reconciliación, monitorización y respuesta a incidentes | Servidor local encendido 24/7 para autorizar swaps; alojamiento propio si se usa interfaz externa compatible | Presupuestar fees y disponibilidad de observación por etapas. Usar RPC/interfaces públicas puede tener límites o fallar; no garantizar servicio gratuito. |

## Método mínimo

1. Fijar alcance, identidades y economía mediante decisiones separadas; todavía pendientes.
2. Inventariar cuentas y mensajes definitivos, y computar tamaños/CU en fixture.
3. Obtener cotizaciones fechadas de auditoría, alojamiento y recursos de custodia.
4. Bajo autorización futura, obtener renta/fees de una fuente de red verificable.
5. Separar: gasto de desarrollo/revisión + publicación + fees; capital de liquidez;
   saldo retenido por rent; reserva operativa y contingencia elegida por el propietario.
6. Aprobar límites máximos por etapa, detener si la estimación cambia o faltan fondos.

No sumar SOL y moneda fiduciaria sin tipo de cambio fechado. No sumar rent recuperable
como si siempre se perdiera ni asumir que puede recuperarse mientras las cuentas estén
en uso. Los buffers pueden requerir financiación transitoria distinta del coste neto.
No financiar un lanzamiento contando con ventas futuras del propio token.

La alternativa de menor coste operativo compatible con el diseño es mantener contratos
on-chain y acceso directo del usuario a una interfaz compatible; el creador no ejecuta
un servidor aprobador. Eso depende de despliegue/pool autorizados y disponibilidad de
infraestructura pública externa, todavía no verificados. Posponer el lanzamiento es
la opción si el presupuesto no alcanza para los controles esenciales.

## Custodia de software sin compra de hardware

Se puede evaluar una wallet Solana de software existente compatible con los mensajes
requeridos, sin crearla aquí. Riesgos: malware/extensiones capturan semillas o cambian
mensajes; phishing obtiene firmas; pérdida del dispositivo o backup bloquea acceso;
contraseña local no protege un secreto ya extraído; copias en nube/chat/Git amplían
exposición. Separar cuentas en el mismo equipo no aísla compromiso del dispositivo.

Antes de elegir proveedor: verificar procedencia/actualizaciones, soporte de SPL,
versioned/legacy transactions, hardware de respaldo disponible y revisión visible de
programas, importes y cuentas. El signing de una PDA/multisig no equivale al de una
wallet individual; builders actuales necesitan integración explícita para multisig.
Ninguna wallet individual debe conocer secretos que no necesita el rol operativo.

Recomendación condicionada: entorno actualizado y dedicado a administración, pocas
extensiones, respaldo privado offline separado físicamente, procedimiento de
recuperación ensayado antes de fondos, payer con saldo limitado y doble revisión de
mensajes. Evitar semillas en computadores de uso diario. Un equipo comprometido sigue
siendo riesgo residual significativo; no certificar esta opción para fondos importantes.
Si no se pueden mantener estos controles, posponer administración de activos reales.

Sin semillas, importaciones ni ensayos de recuperación reales en esta sesión. Evaluar
proveedor/recuperación no autoriza instalar wallets, crear identidades, firmar o financiar.
Los costes y adecuación del dispositivo existente siguen pendientes de evaluación.
