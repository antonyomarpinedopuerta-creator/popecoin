# ROBUSTO — matriz de decisiones para una futura autorización de lanzamiento

Estado: `NOT_AUTHORIZED_FOR_MAINNET` / `MAINNET_DISABLED` /
`OFFLINE_FIXTURE_ONLY`. La distribución económica confirmada no aprueba ninguna
operación. Este registro reemplaza afirmaciones antiguas de que la distribución 10B
sigue pendiente; sus decisiones técnicas y operativas sí continúan pendientes.

## Matriz priorizada por dependencia

| Orden | Decisión / responsable | Opciones reales y recomendación | Información que falta / criterio verificable | Operación que necesita autorización expresa |
| ---: | --- | --- | --- | --- |
| 1 | Custodia y recuperación — propietario | Software wallet, multisig compatible tras implementar/probar, o posponer. Dado que no se comprará hardware ahora, evaluar wallet de software para una cuenta de bajo privilegio y no custodiar fondos importantes sin recuperación revisada. | Custodios identificados, separación de roles, backup privado y recuperación ensayada fuera del repo, control de acceso del equipo. | Crear/importar wallet, guardar seed, asignar signer o mover autoridad. |
| 2 | Auditoría — propietario + auditor independiente | Auditoría con alcance completo del vesting, integración, Meteora, dependencias, custodia y rollbacks; o posponer. Recomendada antes de fondos reales. | Alcance, precio/oferta, independencia, entregable, calendario, retest y disposición de cada hallazgo. | Contratar, pagar, compartir datos privados o aceptar formalmente residuales. |
| 3 | Perfil técnico de mint — propietario + ingeniería | Mantener perfil histórico 1B/6 por compatibilidad o aprobar en etapa separada 10B/9. No mezclar los artefactos. | Confirmar decimales, programa/identidad final, consumidores/clients, compatibilidad verificable y artefactos reproducibles. El 10B/9 económico está confirmado; 9 decimales no. | Crear/inicializar mint, emitir tokens, cambiar/revocar autoridades. |
| 4 | Emisión fija y autoridades — propietario | Retener mint authority con controles y riesgo de emisión, o renunciar tras emitir/reconciliar el total con irreversibilidad. No hay recomendación ejecutable antes de la auditoría. | Quién controla mint/update/upgrade/freeze, procedimiento de cambios, revisión doble y evidencia de reconciliación. | Emitir, transferir o revocar autoridad; desplegar/actualizar programa. |
| 5 | Custodia y plan de buckets — propietario | Asignación confirmada: 4B mercado, 3B comunidad, 1.5B reserva, 1.499B desarrollo/ops, 1M fundador. Definir responsables/cuentas y si cada bucket tiene vesting, lock o liberación por etapas. | Beneficiarios/custodios y schedules de los cuatro buckets no-founder; políticas transparentes, verificables y compatibles con el contrato. | Crear cuentas, distribuir tokens o inicializar/depositar vesting. |
| 6 | Vesting fundador — propietario | Escenario 365 días bloqueo + 730 lineales en días fijos, o ajustar antes de configuración. No interpretar como meses naturales. Decidir si un solo vesting satisface la política. | Beneficiario público verificado, inicio UTC `S`, cliff/start, interpretación de plazo, PDA, recuperación por pérdida de acceso y revisión externa. | Inicializar vesting, depositar el millón, liberar tokens o cambiar calendario. |
| 7 | Circulación inicial y pool — propietario + proveedor LP | Posponer hasta financiar controles; o elegir tramo de tokens/USDC, par, rango, precio, fees y slippage. Los escenarios de `ROBUSTO_CONFIRMED_TOKENOMICS.md` son solo aritmética. | Capital USDC comprometido, token inventory realmente libre, price/range, pool activo, titular/control de posición, retiro, fees y revisión de riesgos Meteora. La categoría de 4B no es un depósito automático. | Crear pool, aportar/retirar liquidez, operar swaps reales o contratar LP. |
| 8 | Metadata y publicación — propietario | Mantener local, elegir almacenamiento externo y URI revisada. No se ha autorizado publicación externa. | JSON final y hash, proveedor, persistencia/actualización, URI recuperable y presupuesto. | Subir archivos, pagar alojamiento, actualizar metadata on-chain o publicar web. |
| 9 | Financiación — propietario + financiador | Grants, sponsor, servicios en especie o LP externo; ninguna opción está comprometida. Si no cubre auditoría, red/operación y capital de mercado por separado, aplazar. | Ofertas/condiciones verificables, conflictos, propiedad de LP/NFT, control cedido, contingencia y presupuesto firmado. Aporte personal: S/0. | Solicitar/captar fondos, aceptar términos, ceder tokens/control o incurrir en gasto. |
| 10 | Autorización de lanzamiento — propietario | Mantener bloqueado o aprobar una secuencia específica por etapas una vez cumplidos los prerequisitos. Recomendación actual: mantener bloqueado. | Evidencia del auditor, diez hallazgos Meteora tratados/aceptados, atomicidad nativa, estado limpio de artefactos, custodias, capital, cotizaciones recientes y checklist firmado. | Cualquier lectura de red fuera del alcance, firma, transacción, emisión, despliegue, pool, transferencia o comercialización. |

## Estados que no se deben mezclar

- **Confirmado económicamente:** nombre público ROBUSTO, objetivo de suministro de
  10.000.000.000 tokens y las cinco cantidades/porcentajes indicados en la
  [especificación](ROBUSTO_CONFIRMED_TOKENOMICS.md).
- **Técnico propuesto:** símbolo ROBUSTO y 9 decimales; la matemática cabe en u64,
  pero perfiles históricos y builders siguen sin cambiar.
- **Pendiente:** mint definitivo, fixed-supply on-chain, beneficiarios/custodios,
  schedules operativos, circulación, precio, pool, capital, authorities finales,
  metadata publicada y financiación.
- **Abierto para revisión externa:** contrato, custodia, programas y dependencias
  Meteora; los tres advisories y siete warnings siguen abiertos. Estado de atomicidad:
  `NATIVE_ATOMICITY_NOT_VERIFIED`.
- **Prohibido actualmente:** generar o importar claves, firmar, usar fondos, acceder a
  RPC/red, emitir, transferir, crear pool, desplegar, publicar externamente o lanzar.

## Condiciones mínimas antes de pedir autorización de producción

1. Resolver las decisiones 1–9 con responsables, términos documentados y evidencias;
   no contar escenarios como acuerdos.
2. Cerrar auditoría y retests independientes o presentar al propietario residuales
   concretos para su aceptación expresa, sin llamar resueltos los hallazgos externos.
3. Elegir un solo perfil y reconstruir/verificar sus fuentes, ELF, IDL, dependencias,
   metadata y manifests; separar hashes del candidato 1B/6 y 10B/9.
4. Acreditar rollback nativo con una herramienta compatible y autorizada; mientras no
   exista prueba, mantener el bloqueo.
5. Confirmar financiación externa suficiente y separada para revisión, despliegue,
   operación, contingencia y capital de liquidez; un allocation de tokens no es USDC.
6. Solo entonces pedir autorización específica para cada operación irreversible. La
   aprobación económica registrada aquí no es autorización de lanzamiento.
