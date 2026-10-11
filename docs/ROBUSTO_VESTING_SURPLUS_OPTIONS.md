# ROBUSTO — depósitos accidentales y prototipo de procedencia

NOT_AUTHORIZED_FOR_MAINNET / MAINNET_DISABLED / OFFLINE_FIXTURE_ONLY.
No hay autorización de sustitución del contrato, producción, gasto ni cambio económico.

## Por qué quedan tokens inmovilizados

El vault clásico SPL acepta transferencias directas de cualquier cuenta que tenga
fondos y permiso sobre su origen. El programa de vesting no recibe un callback de
esas transferencias. Solo registra total_amount/released_amount, no remitente ni
recibo por depósito. Release se limita a total_amount: total pendiente = total −
released. Si balance supera el pendiente, la diferencia no amplía derechos del
beneficiario. No existe método de sweep; el owner del vault es PDA, no fundador.
Los siete casos SBF de custodia existentes prueban exceso 10 sobre asignación 100,
liberación de solo 100 y rechazo de retirada por donante/authority.

**Balance excedente no prueba propiedad del excedente.** Puede haber múltiples
remitentes, delegados, transferencias directas o saldos anteriores. No sería seguro
aceptar un donor declarado en una solicitud ni un journal local como autorización.
Devolver todo al fundador, authority o beneficiary trasladaría tokens que pueden ser
ajenos. Las fuentes actuales no permiten atribuir retrospectivamente cada excedente.

## Alternativas

| Opción | Seguridad y efecto real | Complejidad, costes y compatibilidad |
| --- | --- | --- |
| A. Conservar contrato | No agrega privilegios ni riesgo de implementación. Advertencia y verificación de cuenta/mint/importe antes de enviar; monitorizar desviaciones. No bloquea transferencias SPL directas ni recupera exceso ya recibido | Compatible con contrato/ELF/IDL actuales, sin nuevas cuentas/instrucciones. Trabajo local sin fees; operación futura sigue requiriendo financiación. Excedentes y pérdida de acceso siguen riesgos |
| B. Recuperar solo excedente | Acotar monto a balance − (total − released) protege nominalmente vesting, pero **no identifica propietario**. Seguro respecto de derechos del donante solo si hay procedencia/consentimiento autenticados y no reutilizables. No existe prueba suficiente en estado legado | Requiere diseño/decisión de destinatario y atribución, validación de cuentas/permisos, ABI y código nuevos, auditoría/reproducibilidad/retest. No se implementa sweep legado ni override administrativo |
| C. Escrows/recibos por depositante | Registrar quién aportó, cuánto quedó comprometido y cuánto es reembolsable; destino fijado al depositante. Vaults/recibos separados reducen ambigüedad y facilitan reconciliación. Tokens directos no registrados siguen sin atribución ni devolución automática | Nuevas PDA/cuentas rent-exempt, más validaciones y mensajes/fees. Importes sin cotizar, ninguna migración automática. Requiere programa/IDL propios nuevos y decisión antes de sustituir nada |

Recomendación vigente: A para el contrato actual; estudiar C si el propietario decide
financiar complejidad y auditoría adicionales. B no es un parche seguro de una línea.
No añadir freeze ni transfer hooks al token por este problema: cambian permisos,
compatibilidad y podrían restringir compraventa. El perfil clásico de 9 decimales y
swaps independientes se conserva intacto.

## Prototipo aislado implementado

`tools/vesting-surplus-prototype` es una librería Rust **host, sin dependencias**, no
un programa Solana/Anchor ni una modificación del vesting actual. No tiene wallet,
claves, firmas, RPC, instrucciones, CPI, mint ni poderes administrativos.

Modela una arquitectura prospectiva con depósitos registrados:

- Cada depósito explícito completa primero la reserva aún pendiente. Solo la parte
  excedente genera crédito del donante registrado. La parte comprometida es irrevocable
  dentro del modelo; no se permite recuperarla como si fuera exceso.
- Refund exige caller=donor, crédito suficiente y balance posterior ≥ total pendiente.
  Devuelve un destino fijo donor, sin destinatario alternativo ni rol administrador.
- Release solo permite beneficiary y usa total vested suministrado por el escenario;
  reduce reserva/saldo a la vez y conserva créditos de terceros.
- Llegadas directas aumentan unattributed: nunca crédito de quien las reclama. No se
  transforman por omisión en fondos del beneficiario o del fundador.
- Invariante: balance = reserva financiada + créditos + no atribuido; reserva ≤
  obligación pendiente. u128 para sumar invariantes, u64 y checked para saldos.

**Límites:** caller es identidad pública sintética que se supone autenticada para
estudiar la política; no hay autenticación criptográfica. Créditos internos del modelo
no son recibos on-chain ni prueban origen legado. Se suministra vested_total desde
fuera; no se autentica Clock/calendario. No se simulan CPI, ATA, congelación, rent,
serialización, concurrencia, errores de red, account substitution ni rollback nativo.
Los métodos host que rechazan sin mutación no demuestran atomicidad Solana.

Para convertirlo en programa habría que usar cuentas de recibo program-owned, PDA
únicas por depósito/donante/mint, permiso real del owner/delegate aceptado según
política, transferencia verificada antes del crédito, destino/token program/mint
validados, anti-replay, reconciliación con balance real e invariantes ante donaciones.
Delegados/multisig requieren decidir quién adquiere el derecho de refund; no asumir que
el signer es el propietario económico. Limitar cuentas/tamaño/rent y evitar un mapa
no acotado on-chain. Auditar todos esos elementos: no están implementados aquí.

Diez tests host cubren: funding exacto, devolución de exceso al origen registrado,
rechazo de terceros/beneficiario ajeno, no atribución de llegadas directas, múltiples
donantes, releases parciales, repetición/sobreclaim, falta de fondos/beneficiario erróneo,
u64 máximo y supply 10^19/fundador 10^15; 22.201 pares de depósitos comprueban
intercalaciones deterministas de liberación y devoluciones. No es fuzzing exhaustivo.

```sh
CARGO_TARGET_DIR=target cargo test --offline --locked --manifest-path tools/vesting-surplus-prototype/Cargo.toml
CARGO_TARGET_DIR=target cargo clippy --offline --locked --manifest-path tools/vesting-surplus-prototype/Cargo.toml --all-targets -- -D warnings
```

El gate integrado conserva 157 casos runtime previos y registra estos 10 tests por
separado como HOST_MODEL_ONLY_NOT_SBF. El paquete de auditoría exige ese alcance;
no suma el modelo a pruebas SBF ni a demostraciones nativas.

## Atomicidad y Meteora

La comprobación incremental del registro Cargo sigue sin solana-program-test,
Mollusk ni solana-runtime/solana-svm completos. LiteSVM 0.10.0 mantiene constructor
que genera airdrop_kp; Surfpool/validator instalados no tienen ruta revisada sin claves
y redes. No se ejecutaron ni repitieron arranques equivalentes. Sigue pendiente la
herramienta revisada y el criterio nativo documentado en
[atomicidad/custodia](ROBUSTO_ATOMICITY_AND_CUSTODY_REVIEW.md). No se afirma
imposibilidad teórica; con las rutas revisadas disponibles no hay evidencia compatible.

Meteora conserva 3 advisories/7 warnings, sin actualizar dependencias oficiales:
bytes/derivative/paste/rand-09 excluidos no están corregidos; ruint activo mantiene
mitigaciones acotadas de normalización/shifts; bincode mantenimiento, anyhow/keccak/
rand host requieren revisión. Ver [matriz individual y acciones](ROBUSTO_METEORA_DEPENDENCY_REVIEW.md).
Estado BLOCKED_FOR_PRODUCTION_REVIEW. Las mitigaciones no equivalen a fixes upstream.

## Decisiones del propietario y criterio para avanzar

1. Conservar A o estudiar C para un contrato futuro; no sustituir el actual por omisión.
2. Aceptar explícitamente que excedentes sin procedencia demostrable no tienen devolución
   automática; no otorgar al fundador discreción para apropiárselos.
3. Definir derechos del depositante, owner/delegate, destino y consentimiento de fondos
   comprometidos; revisar custodia/recuperación sin poderes sobre tokens ajenos.
4. Financiar externamente revisión, nuevas cuentas/fees y liquidez si se elige C. No hay
   presupuesto ni contrapartes comprometidas; fundador aporta cero no implica coste cero.

Antes de producción: decisiones económicas/beneficiarios/UTC y autoridades finales,
financiación, custodia, revisión independiente/retest de contrato y dependencias,
evidencia nativa pendiente, artefactos definitivos reproducibles y autorizaciones por
etapas. Ninguna de estas decisiones está tomada por ejecutar el prototipo.
