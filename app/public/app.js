"use strict";

// This page is a local proposal preview. It deliberately has no wallet,
// Solana SDK, RPC URL, external asset, or transaction code.
const allocationRoot = document.querySelector("#allocations");
const marketRoot = document.querySelector("#market-data");

function amount(value) {
  return BigInt(value).toLocaleString("es-ES");
}

async function loadProposal() {
  const response = await fetch("/api/product", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("No fue posible verificar la propuesta local.");
  const product = await response.json();
  if (product.name !== "ROBUSTO" || product.projectStatus !== "NOT_DEPLOYED" ||
      product.availability !== "NOT_AVAILABLE_FOR_PURCHASE" ||
      product.scope !== "OFFLINE_FIXTURE_ONLY" || product.mainnetDisabled !== true ||
      product.authorization !== false || product.supply?.decimals !== 9 ||
      product.supply?.tokens !== "10000000000" || !Array.isArray(product.allocations)) {
    throw new Error("La respuesta local no coincide con la propuesta esperada.");
  }
  const total = product.allocations.reduce((sum, allocation) => sum + BigInt(allocation.tokens), 0n);
  if (total !== BigInt(product.supply.tokens)) throw new Error("La distribución no conserva el suministro propuesto.");

  document.querySelector("#total-supply").textContent = amount(product.supply.tokens);
  allocationRoot.replaceChildren(...product.allocations.map((allocation, index) => {
    const row = document.createElement("article");
    row.className = `allocation-row${allocation.label === "Fundador" ? " founder-row" : ""}`;
    const number = document.createElement("span"); number.className = "allocation-index";
    number.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("div"); name.className = "allocation-name";
    const title = document.createElement("strong"); title.textContent = allocation.label;
    const detail = document.createElement("small");
    detail.textContent = allocation.label === "Mercado y liquidez"
      ? "Asignación de tokens; no significa liquidez depositada"
      : allocation.label === "Fundador" ? "Asignación propuesta, sujeta a vesting" : "Parámetros de uso y beneficiarios pendientes";
    name.append(title, detail);
    const value = document.createElement("strong"); value.className = "allocation-value";
    value.textContent = amount(allocation.tokens);
    const percent = document.createElement("span"); percent.className = "allocation-percent";
    percent.textContent = allocation.percent;
    row.append(number, name, value, percent);
    return row;
  }));
}

async function loadMarketStatus() {
  const response = await fetch("/api/market", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Estado de mercado local no disponible.");
  const market = await response.json();
  if (market.status !== "NOT_DEPLOYED" || market.data !== null || market.source !== "NONE_CONFIGURED") {
    throw new Error("No se acepta información de mercado sin una fuente autorizada.");
  }
}

Promise.all([loadProposal(), loadMarketStatus()]).catch(() => {
  const status = document.createElement("small");
  status.className = "local-data-error";
  status.setAttribute("role", "status");
  status.textContent = "No fue posible verificar los datos locales; las cifras visibles son una propuesta, no datos de mercado.";
  document.querySelector(".proposal-footnote").append(status);
});
