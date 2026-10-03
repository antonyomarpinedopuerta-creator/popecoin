# Validación local ROBUSTO — 2026-10-03

- TypeScript `tsc --noEmit`: PASS.
- `npm run test:client`: 70/70 PASS. Incluye secuencia temporal completa con RPC mock (pre-cliff, parcial, segundo, final, reconciliación y rechazo de final duplicado); TransferChecked unsigned, balances alterados, red incorrecta y fee/fondos inválidos; separación de supply y políticas ROBUSTO; metadata con archivo/hash/URI pendientes.
- `python3 -m unittest discover -s tests -p 'test_*.py'`: 45/45 PASS.
- `npm run check:metadata`: PASS para PAPA histórico; sus imágenes y metadata JSON permanecen intactos.
- `python3 scripts/check-public.py`: PASS, gate heurístico, no auditoría universal de secretos.
- `git diff --check`: PASS.
- CLI ROBUSTO metadata: falla cerrado esperadamente por imagen oficial pendiente.
- CLI segundo rehearsal schedule: falla cerrado esperadamente por nuevo beneficiario pendiente, antes de RPC.
- Simulación real Devnet de devolución unsigned: PASS, err=null, slot 507032282, fee 10000 lamports, destino simulado 10000000 unidades base, origen simulado 0. Sin firmas ni envío; reconciliación RPC posterior del estado real antiguo PASS. Evidencia en recycle-proposal-2026-10-03T14-51-42-245Z.json.

No se ejecutaron Rust/SBF builds, instalación de dependencias, tests Rust, reauditoría de dependencias ni reproducibilidad completa en esta sesión: no cambiaron contrato, dependencias, IDL ni binarios. Los resultados anteriores no se atribuyen al nuevo commit. No se inició servidor web ni prueba visual de navegador; la ruta HTML y controles HTTP están cubiertos por tests locales.

EXTERNALLY VERIFIED aquí significa observación pública RPC de Devnet. Ningún resultado de esta sesión equivale a auditoría independiente o Mainnet-ready. Estado de CI del nuevo SHA: pendiente hasta consultar evidencia GitHub; no inferir success de un push.

La propuesta unsigned lleva un blockhash temporal y no debe enviarse desde este archivo una vez expirado. La autorización futura debe acotar operación, cuentas, importe y fee máxima, seguida de revalidación y blockhash fresco. Firmantes no se accedieron.
