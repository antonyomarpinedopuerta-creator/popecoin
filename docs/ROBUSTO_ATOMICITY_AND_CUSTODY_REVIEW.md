# ROBUSTO — atomicidad y custodia: evidencia acotada

NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED / OFFLINE_FIXTURE_ONLY.
Configuración 10.000 millones / 9 decimales y fundador 1 millón siguen propuestas.
No se ha demostrado rollback nativo ni se ha realizado auditoría independiente.

## Herramientas locales inspeccionadas

| Herramienta | Disponibilidad comprobada | Qué demostraría y por qué no se ejecuta aquí |
| --- | --- | --- |
| InvokeContext / Agave 3.1.14 | Harness local compilable offline, fuentes y lock aislados | Ejecuta instrucciones y CPI SBF reales. Conserva efectos raw; committed copia entrada en fallo. No Bank, almacenamiento transaccional, mensajes compilados/global privilege union, fees ni firmas |
| LiteSVM 0.10.0 | Fuente en registro Cargo local | send_transaction sincroniza post_accounts solo en éxito (lib.rs 1459); omitir sigverify no evita new_inner → Keypair::new().to_bytes() (434). Constructor privado, campos privados; no constructor público sin generación identificado. No ejecutado |
| Mollusk | Crate ausente del registro local inspeccionado | Harness de instrucciones no demuestra por su nombre rollback de transacción completa; requeriría revisar API/procedencia antes de instalar o ejecutar |
| solana-program-test / solana-runtime / solana-svm completos | No encontrados en registro local | Son candidatas a prueba del procesador/Bank; los componentes svm-* presentes no proporcionan por sí solos Bank/transaction processor completo |
| Surfpool | Binario instalado /home/antony/.local/bin/surfpool; sin fuente correspondiente encontrada bajo instalación local inspeccionada | No se ejecutó ni siquiera bootstrap. Falta ruta revisada que evite generación de identidades y consulta/fork de redes. Su presencia no acredita garantía de rollback ni compatibilidad con restricciones |
| solana-test-validator | Binario instalado | Bootstrap/identidad/ledger y ruta de transacciones no revisados como libres de generación/firma. No se ejecutó |

Inspección estática de archivos/directorios y resolución de rutas, sin iniciar nodos,
consultar RPC, instalar dependencias, importar/generar claves ni firmar. No se afirma
imposibilidad teórica. No se construyó fork de LiteSVM ni clon de política de commit
para presentarlo como semántica nativa de Solana.

El harness comparte un TransactionContext entre instrucciones, pero **la elección de
restaurar entrada es código nuestro**. Los ocho casos bounded anteriores ya conservan
efectos raw parciales ante doble release/CPI fallida y descartes locales. Repetirlos
no añade evidencia nativa; el gate los conserva para detectar regresiones del harness.
Un error después de una transferencia no prueba por sí solo rollback de almacenamiento.

## Ensayo nativo pendiente, criterio de cierre

1. Obtener una herramienta/fuente revisada que procese mensajes completos y almacene
   resultados con mecanismo nativo, sin constructor que genere claves ni firma real.
2. Especificar cómo se omite verificación criptográfica; permisos sintéticos del mensaje
   compilado, blockhash, fee payer, features y programas/hash deben quedar explícitos.
3. Ejecutar instrucción exitosa seguida de instrucción fallida: transferencia SPL →
   error; release → duplicado/error; creación de pool → CPI/error posterior; y control
   de secuencia completa exitosa. Incluir fallos de permisos combinados y cuentas nuevas.
4. Comparar almacenamiento final íntegro: datos/owners/executable/lamports/tokens,
   released_amount, cuentas creadas y estado pool/posición. Verificar conservación y
   separar fees/cambios de nonce propios de transacción fallida de efectos revertidos.
5. Retener trazas de efectos intermedios y resultado de commit nativo, identificar
   función de runtime responsable y demostrar que no es copia/restauración de nuestro
   harness. Reconciliación no debe aceptar fallo/interrupción como confirmación.

Falta herramienta disponible compatible y esa evidencia. Las restricciones actuales
se mantienen; cualquier preparación futura que requiera claves, firmas, redes o
recursos no disponibles necesita autorización separada. No solicitar lanzar para
resolver un ensayo técnico.

## Siete casos nuevos de custodia — ELF propio sin cambios

`tools/unsigned-runtime/src/custody.rs`, modo `--vesting-custody-only`. Fixture público
coherente: mint clásico supply 110, total de vesting 100 financiado y donante ajeno 10;
no se acuña ni modifica economía de producción. La variación de supply forma parte
del estado inicial ficticio, no representa configuración alternativa aprobada.

| Caso | Resultado verificado |
| --- | --- |
| SPL transfer_checked directa del donante al vault | Éxito; vault 110, donante 0, total conservado |
| Deposit del programa sobre vault excedido | Error 6003; estado raw y aceptado intactos |
| Release sin permiso sintético beneficiary | Error 3010; no se libera a pesar de vencer calendario |
| Authority intenta actuar como beneficiary | Error 6000; no existe rescate administrativo por esa vía |
| Release legítima final | Beneficiary recibe exactamente 100; released_amount=100; excedente 10 permanece en vault; tokens/lamports conservados |
| Repetición de release con excedente | Error 6002; excedente no amplía el derecho de vesting |
| Donante intenta retirar excedente con SPL | Error 4; owner PDA no puede ser sustituido por donante |

Los rechazos comparan todas las cuentas staged/committed con entrada; ninguno depende
de restaurar efectos de CPI para aparentar ausencia de cambios. Estos siete casos
**no son siete pruebas de atomicidad nativa**. El gate integrado ejecuta 157 casos
(92 históricos + 11 suministro/vesting 10B9 + 47 Meteora 9/6 + 7 custodia).
El reporte incluye custodyCases y hash de salida; el paquete de auditoría exige esos
siete casos además de suites anteriores. El ELF/IDL no cambian; no se recompila SBF.

## Opciones pendientes del propietario

- Acceso del beneficiario: conservar diseño inmutable con respaldos/recuperación de
  custodia revisados fuera del contrato; o estudiar beneficiario controlado por multisig
  compatible. Ambas requieren identidades definitivas y revisión. No se crearon wallets.
- Recuperación contractual: no se implementa cambio unilateral de beneficiario. Una
  futura migración voluntaria podría exigir consentimiento del beneficiario, auditoría,
  nuevo ABI/ELF y evaluación de compatibilidad; no resuelve una clave ya perdida.
- Excedentes: evitar transferencias directas y comprobar financiación exacta antes de
  operación; monitorizar desviaciones. Esto reduce errores operativos, no impide que
  un tercero done. Mantener inmovilización conserva derechos originales pero atrapa
  excedentes. Un futuro método acotado requiere decidir destinatario/consentimiento,
  invariantes y auditoría; no se añadió sweep ni poder administrativo de apropiación.

Las pruebas de beneficiarios/mints sustituidos, límites u64/u128, Clock regresivo y
releases duplicados previas siguen vigentes. No se encontró defecto nuevo del contrato
que justificara cambiar sus reglas. Pérdida de acceso y exceso sin rescate son riesgos
de disponibilidad/custodia conocidos, no permisos concedidos al fundador.
