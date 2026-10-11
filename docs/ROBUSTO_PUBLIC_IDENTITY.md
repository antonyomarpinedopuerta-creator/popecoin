# Identidad pública y presentación local de ROBUSTO

Estado: **PREPARACIÓN OFFLINE** · `NOT_AUTHORIZED_FOR_MAINNET` · `MAINNET_DISABLED` · `OFFLINE_FIXTURE_ONLY`.

Esta página local presenta ROBUSTO como propuesta no aprobada. No existe token, pool, contrato de ROBUSTO ni mercado disponible para comprar. El servidor de desarrollo escucha solo en loopback y no consulta Solana; este trabajo no despliega un sitio público ni publica metadata.

## Identidad presentada

- Nombre de proyecto: ROBUSTO.
- Propuesta económica visible: 10.000.000.000 tokens, 9 decimales, sin emisiones adicionales propuestas; **no aprobada para producción**.
- Distribución y vesting fundador: escenario de prueba, no beneficiarios, fechas o configuración final.
- El dueño ha indicado que el fundador no aportará fondos propios. Esto no implica financiación, liquidez, patrocinio ni presupuesto comprometidos.
- La ilustración local aprobada para revisión permanece local. URI, alojamiento, metadata final y publicación siguen pendientes.
- Sin precio, capitalización, liquidez, volumen, dirección de contrato, auditoría terminada o socios anunciados.

La interfaz explica la propuesta, reparto, simulación de vesting, objetivo de swaps sin aprobación del fundador, riesgos de operadores de Meteora, falta de mercado, pendientes de atomicidad y auditoría y preguntas frecuentes. La distribución incluye un gráfico SVG con descripción accesible y una leyenda que conserva las cifras como texto. Hay animaciones sutiles que respetan `prefers-reduced-motion`, foco visible, navegación de salto y breakpoints móviles. No contiene botón/enlace de compra. El endpoint de producto valida los cinco importes de la propuesta y usa cadenas enteras; el endpoint de mercado devuelve `data: null` mientras no exista una fuente expresamente conectada y autorizada. No se conectó ni se añadió un cliente RPC.

## Referencias de nombres y compatibilidad

| Referencia encontrada | Tratamiento | Motivo |
|---|---|---|
| ROBUSTO | Nombre visible de esta propuesta y aplicación local | Identidad pública elegida para el trabajo actual; lanzamiento no autorizado. |
| `popecoin_vesting`, PopeCoin en paquete/rutas antiguas | Se conserva en crate, paquete, archivos y evidencias | Cambiar package/program IDs puede alterar builds, rutas de artefactos o compatibilidad. No es el nombre mostrado como producto. |
| PAPA / perfiles de 6 decimales, metadata y scripts Devnet históricos | Se conservan en su área histórica; no se sirven desde la interfaz ROBUSTO | Identifican pruebas y perfiles previos. No deben confundirse con la propuesta 10B/9 ni utilizarse para fijar su economía. |
| IDs de programa, seeds PDA, IDL y metadata histórica | Sin cambios | Son identificadores de compatibilidad; cambiar marca visible no justifica migrarlos. |
| PopeCoin / PepeCoin en proyectos públicos distintos | No se afirma afiliación | La búsqueda pública encontró páginas/proyectos con nombres parecidos. La colisión puede confundir usuarios; la interfaz usa ROBUSTO y no reutiliza sus enlaces o afirmaciones. |

Una búsqueda pública de nombres no constituye investigación de marcas, asesoría legal, confirmación de titularidad, ni una conclusión sobre afiliación. Antes de promoción comercial o registro de marca se requiere revisión legal específica por jurisdicción y canales previstos. Las páginas consultadas fueron [popecoin.it](https://www.popecoin.it/), [popecoincrypto.com](https://www.popecoincrypto.com/) y el repositorio de [Pepecoin Core](https://github.com/pepecoinppc/pepecoin); sus contenidos o estado pueden cambiar y no se incorporan como fuentes de datos del producto.

## Migración deliberadamente acotada

Se actualizó el contenido visible en `app/public/`, la aplicación de desarrollo de `app/` y las descripciones generales del README para comunicar el estado presente y la propuesta ROBUSTO. No se hizo un reemplazo global de cadenas. Se dejan intactos nombres técnicos, configuraciones antiguas, instrucciones operativas, metadata histórica, IDs, seeds, IDL y manifiestos porque describen artefactos o redes pasados y pueden ser necesarios para compatibilidad o auditoría.

La aplicación es solo una preview local. No debe publicarse hasta que el propietario autorice un dominio/hosting, contenido final, avisos legales y tratamiento de datos. Las opciones de coste cero se limitan al trabajo y validación local con herramientas ya disponibles. Red/publicación, auditoría, alojamiento durable de metadata, dominio/hosting opcionales, custodia y capital de liquidez requieren cotización, decisión y fondos autorizados; véase [presupuesto mínimo](ROBUSTO_MINIMUM_LAUNCH_BUDGET.md). No hay precio vigente ni estimación aprobada en este documento.

## Límites que siguen visibles

- La página no certifica el diseño económico, la solvencia de la asignación de liquidez, el vesting ni la custodia.
- Los swaps automáticos sin permiso del fundador son un objetivo del protocolo/mercado futuro, no una operación disponible hoy. Una operación normal requeriría la firma del usuario; ningún servidor del creador está contemplado como autorizador de cada swap. Operadores y mecanismos de Meteora pueden afectar el estado del pool o las comisiones.
- Los tres advisories y siete warnings de Meteora siguen abiertos según el registro técnico vigente; el estado de fixture no los resuelve.
- El rollback de una transacción Solana completa sigue sin demostración nativa bajo las restricciones offline vigentes.
- Los cambios de esta capa web no alteran candidatos SBF/ELF ni prueban correspondencia de programa/IDL/fuentes.

## Validación de esta vista

`tests/app.test.ts` cubre las rutas allowlisted, la propuesta exacta, aritmética con enteros, gráfico y leyenda accesibles, breakpoints, movimiento reducido, estado de mercado nulo, rechazo de métodos de escritura, cabeceras de seguridad, ausencia de recursos externos y entrega byte a byte del asset local. `npm run app` solo inicia un servidor de preview ligado a `127.0.0.1`; no usarlo como aprobación para desplegar públicamente.
