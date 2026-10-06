# ROBUSTO — creación y mercado público

**TOKEN CREATED**: mint Mainnet auténtico, supply autorizado, decimales/freeze/autoridades verificados, metadata publicada/verificada y distribución/vesting reconciliados. Aún no hay mint Mainnet ROBUSTO.

**TOKEN PUBLICLY TRADABLE**: además de token creado, existe un mecanismo público real de compra/venta, contraparte/liquidez y acceso verificables. Un mint o un precio mostrado no demuestran que se pueda vender ni que haya profundidad suficiente.

## Decisiones y verificación pendientes

- Plataforma/mecanismo concreto y fuente vigente de sus requisitos, programas, fees, redes y riesgos. No DEX, launchpad o market maker predeterminado.
- Par, condiciones de emisión/venta/listado, procedencia/cantidad de capital, liquidez/contrapartida, propiedad/retiro/locks de posiciones y custodia.
- Presupuesto aprobado y estimación actual: deploy opcional del vesting, rent/fees, hosting, protocolo de mercado y gastos operativos. Separar costes de crear token de costes de negociarlo.
- Acceso público y cotizaciones/compras/ventas verificadas después de aprobación: no simular volumen real ni prometer precio/retorno.
- Divulgación de supply y mint authority todavía activa, update/upgrade powers, allocations/vesting, direcciones y profundidad real. No afirmar supply criptográficamente fijo con mint authority activa.

El propietario quiere minimizar aporte real. Evaluar mecanismos con contrapartida aportada por participantes/proveedor o venta aprobada cuando se elija plataforma, pero no asumir que serán disponibles, gratis o adecuados. Sin capital/contraparte/mecanismo no se puede prometer mercado líquido. No crear pool ni mover fondos en este cierre.

## Contrato de integración futura

La app/lector y builders de token no dependen de un proveedor. La integración elegida deberá implementar:

1. `inspectRequirements`: network/genesis, programa/versión oficiales, par, tamaños/rent/fees y fuentes fechadas; solo lectura.
2. `quoteLaunch`: presupuesto desglosado, capital real requerido y aportante, condiciones/locks/custodia, instrucciones exactas; sin envío.
3. `prepareUnsigned`: instrucciones y accounts/signers auditables con hash, red y límites explícitos; ningún secreto ni executor implícito.
4. Simulación actual + revisión + autorización por operación y wallet elegida, fuera del camino deshabilitado actual.
5. `verifyMarket`: direcciones/owners/programas, activos/decimales/par, liquidez real y acceso público de compra/venta; firmas/slots y reconciliación pública. Si no hay contrapartida, dejar estado MARKET_PENDING.

Aprobar e implementar el adaptador concreto requiere la elección externa; no se inventa un conector que no pueda verificarse.
