# ROBUSTO — mapa vigente de autoridades

`NOT_AUTHORIZED_FOR_MAINNET` / `MAINNET_DISABLED` / `OFFLINE_FIXTURE_ONLY`.
Mapa de diseño, no inventario de direcciones reales ni autorización de custodia.
Para la arquitectura completa, comparación de alternativas, cinco buckets, riesgos y
checklist futuro: [ROBUSTO_AUTHORITY_CUSTODY_ARCHITECTURE.md](ROBUSTO_AUTHORITY_CUSTODY_ARCHITECTURE.md).

## Separación de poderes propuesta

| Poder | Qué permite | Modelo de menor privilegio | Estado actual |
| --- | --- | --- | --- |
| Mint authority SPL | Emitir ROBUSTO mientras siga presente | Custodia separada de las tesorerías; emitir solo supply reconciliado, luego considerar `SetAuthority(MintTokens, None)` con autorización irreversible independiente | No revocada. Perfil productivo aún 1B/6; 10B/9 no implementado en builder productivo. |
| Freeze authority SPL | Congelar/descongelar token accounts | `None` al crear el mint clásico, sujeto a confirmación final del propietario; sin pausa ni confiscación de tokens | El fixture usa `None`; mint productivo no existe/está autorizado. |
| Metadata update authority | Cambiar metadata mutable | Cuenta independiente de mint, payer, upgrade y buckets; contenido/URI/hash revisados | Identidad pendiente; metadata no publicada. |
| Program upgrade authority | Cambiar reglas del programa de vesting ROBUSTO | Custodia de máximo nivel; proceso de revisión, aprobación dual/quórum, auditoría y registro antes de upgrade; considerar renuncia solo tras aceptar irreversibilidad | No hay autoridad productiva asignada aquí; Meteora no queda bajo control de ROBUSTO. |
| Owners de las cinco tesorerías | Transferir saldo de cada categoría | Una custodia lógica separada por mercado, comunidad, reserva, desarrollo/ops y fundador; no compartir la misma clave individual por comodidad | Sin addresses, beneficiarios o responsables elegidos. |
| Owner/delegate de posición Meteora | Añadir/quitar liquidez según permisos | Separar NFT/posición del bucket fuente; nombrar custodio y revisar cualquier delegate | No hay pool o NFT real. El owner puede retirar su posición y afectar profundidad. |
| Operadores Meteora | Modificar estado/fees conforme al programa | No asignar al creador por defecto; revisar las authorities/operator accounts reales antes de usar un mercado | Control externo del protocolo; puede limitar swaps aunque no requiere aprobación del fundador por trade. |
| Payer operativo | Pagar rent/fees e instrucciones que lo requieran | Separado, fondos mínimos y topes por operación | No creado ni financiado. |

## Compras y ventas

La ruta de swap revisada requiere al usuario como signer de sus propios fondos; no
requiere mint authority, beneficiario fundador, LP NFT ni firma del creador ROBUSTO en
cada compra/venta. Una vez exista un pool activo y financiado, no hace falta que el
computador del fundador permanezca encendido. Esta conclusión se limita al código y
fixtures locales fijados: no hay mercado real, no se garantiza liquidez ni disponibilidad,
y operadores externos de Meteora pueden cambiar status/fees.

## Fijo y vesting

Objetivo económico: 10.000.000.000 ROBUSTO, reparto confirmado de cinco buckets y 9
decimales elegidos para el perfil técnico. Los builders/configuración productiva siguen
en el perfil histórico y no se alteran aquí. Una futura revocación de mint solo se
considera tras emitir exactamente `10^19` unidades base, reconciliar cada bucket/vault
en un snapshot verificable y recibir autorización expresa separada; es irreversible.

El fundador tiene una asignación económica de 1.000.000. Escenario 365d de bloqueo +
730d lineales, sin beneficiary ni inicio UTC elegidos. El programa actual requiere firma
del beneficiario para release y no dispone de rescate administrativo. No introducir
recuperación que permita apropiarse de tokens ajenos.

## Puertas bloqueantes

- Tres advisories y siete warnings de Meteora continúan abiertos; consultar el registro
  individual en [ROBUSTO_METEORA_DEPENDENCY_REVIEW.md](ROBUSTO_METEORA_DEPENDENCY_REVIEW.md).
- `NATIVE_ATOMICITY_NOT_VERIFIED`: el harness local no demuestra rollback nativo de una
  transacción Solana completa.
- Perfil 10B/9 y separación de cinco buckets no están implementados/verificados por los
  builders productivos.
- No existe auditoría independiente, custodia operativa aprobada, precio/LP, funding o
  autorización de lanzamiento.

No se cambió ninguna authority, mint, programa, config, contrato, dirección ni pool.
