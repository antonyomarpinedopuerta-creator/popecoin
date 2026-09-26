"use strict";
const role = document.querySelector("#role");
const button = document.querySelector("#refresh");
const status = document.querySelector("#status");
const result = document.querySelector("#result");
function amount(value) {
  const n = BigInt(value);
  return `${(n / 1000000n).toLocaleString("es-ES")},${(n % 1000000n).toString().padStart(6, "0")} PAPA`;
}
function date(value) {
  const d = new Date(Number(BigInt(value) * 1000n));
  return Number.isNaN(d.getTime()) ? `Timestamp ${value}` : d.toISOString().replace("T", " ").replace(".000Z", " UTC");
}
function list(id, entries) {
  const node = document.querySelector(id); node.replaceChildren();
  for (const [label, value] of entries) {
    const dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = label; dd.textContent = value; node.append(dt, dd);
  }
}
button.addEventListener("click", async () => {
  button.disabled = true; role.disabled = true; result.hidden = true;
  status.textContent = "Consultando y verificando cuentas en Devnet…";
  try {
    const response = await fetch(`/api/vesting?role=${encodeURIComponent(role.value)}`, { signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Consulta fallida");
    const cards = document.querySelector("#amounts"); cards.replaceChildren();
    for (const [label, key] of [["Asignado", "total"], ["Liberado", "released"], ["Devengado", "vested"], ["Reclamable por calendario", "claimable"], ["Saldo del vault", "vaultBalance"], ["Financiación pendiente", "shortfall"]]) {
      const article = document.createElement("article"), title = document.createElement("h2"), value = document.createElement("p");
      title.textContent = label; value.textContent = amount(data[key]); article.append(title, value); cards.append(article);
    }
    list("#schedule", [["Inicio", date(data.start)], ["Cliff", date(data.cliff)], ["Fin", date(data.end)], ["Reloj de la red", date(data.chainTime)]]);
    list("#identity", [["Programa", data.program], ["Mint", data.mint], ["Beneficiario", data.beneficiary], ["Vesting", data.vesting], ["Vault", data.vault], ["Slot confirmado", String(data.slot)], ["Vault congelado", data.frozen ? "Sí" : "No"], ["Autoridad de emisión activa", data.mintAuthorityActive ? "Sí" : "No"], ["Autoridad de congelación activa", data.freezeAuthorityActive ? "Sí" : "No"]]);
    status.textContent = `Estado consultado: ${new Date(data.observedAt).toLocaleString("es-ES")}. ${data.executableClaim ? "El saldo cubre el importe reclamable." : "No hay una liberación ejecutable con este estado."} Actualiza para obtener una nueva lectura.`;
    result.hidden = false;
  } catch (error) { status.textContent = error.name === "TimeoutError" ? "Devnet tardó demasiado. Reintenta la consulta." : error.message; }
  finally { button.disabled = false; role.disabled = false; }
});
role.addEventListener("change", () => { result.hidden = true; status.textContent = "Pulsa Consultar Devnet para actualizar esta asignación."; });
