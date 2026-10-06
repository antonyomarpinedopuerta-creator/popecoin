"use strict";
const role = document.querySelector("#role");
const button = document.querySelector("#refresh");
const status = document.querySelector("#status");
const result = document.querySelector("#result");
let displaySymbol="PAPA", displayCluster="devnet", decimals=6;
async function loadConfig(){
 const response=await fetch("/api/config");if(!response.ok)throw Error("Configuración no disponible");const c=await response.json();
 if(c.decimals!==6||!["PAPA","ROBUSTO"].includes(c.symbol)||!Array.isArray(c.roles))throw Error("Configuración inválida");
 displaySymbol=c.symbol;displayCluster=c.cluster;decimals=c.decimals;
 role.replaceChildren(...c.roles.map(label=>{const o=document.createElement("option");o.value=label;o.textContent=label;return o;}));
 document.querySelector(".badge").textContent=c.cluster==="devnet"?"SOLANA DEVNET · TOKENS DE PRUEBA":"SOLANA MAINNET · CONSULTA DE SOLO LECTURA";
 document.querySelector("header p").textContent=c.symbol==="PAPA"?"Archivo de pruebas históricas PAPA. No corresponde al rehearsal ROBUSTO ni a producción.":"ROBUSTO: consulta de las direcciones verificadas en configuración.";
 button.textContent=`Consultar ${displayCluster}`;
 if(c.cluster==="mainnet-beta")document.querySelector("footer").textContent="ROBUSTO: lectura de cuentas configuradas; sin firma, envío ni conexión de wallet. Crear el token no garantiza un mercado público.";
}
button.disabled=true;loadConfig().then(()=>{button.disabled=false;}).catch(e=>{status.textContent=e.message;});
function amount(value) {
  const n = BigInt(value), scale=10n**BigInt(decimals);
  return `${(n / scale).toLocaleString("es-ES")},${(n % scale).toString().padStart(decimals, "0")} ${displaySymbol}`;
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
  status.textContent = `Consultando y verificando cuentas en ${displayCluster}…`;
  try {
    const response = await fetch(`/api/vesting?role=${encodeURIComponent(role.value)}`, { signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Consulta fallida");
    if(data.symbol!==displaySymbol||data.cluster!==displayCluster||data.decimals!==decimals)throw Error("Identidad de respuesta no coincide con configuración");
    const cards = document.querySelector("#amounts"); cards.replaceChildren();
    for (const [label, key] of [["Asignado", "total"], ["Liberado", "released"], ["Acumulado desde el inicio", "accrued"], ["Reclamable por calendario", "claimable"], ["Saldo del vault", "vaultBalance"], ["Financiación pendiente", "shortfall"]]) {
      const article = document.createElement("article"), title = document.createElement("h2"), value = document.createElement("p");
      title.textContent = label; value.textContent = amount(data[key]); article.append(title, value); cards.append(article);
    }
    list("#schedule", [["Inicio", date(data.start)], ["Cliff", date(data.cliff)], ["Fin", date(data.end)], ["Reloj de la red", date(data.chainTime)]]);
    list("#identity", [["Programa", data.program], ["Mint", data.mint], ["Beneficiario", data.beneficiary], ["Vesting", data.vesting], ["Vault", data.vault], ["Slot confirmado", String(data.slot)], ["Vault congelado", data.frozen ? "Sí" : "No"], ["Autoridad de emisión activa", data.mintAuthorityActive ? "Sí" : "No"], ["Autoridad de congelación activa", data.freezeAuthorityActive ? "Sí" : "No"]]);
    status.textContent = `Estado consultado: ${new Date(data.observedAt).toLocaleString("es-ES")}. ${data.claimCoveredByVault ? "El saldo cubre el importe reclamable." : "No hay un importe reclamable cubierto por un vault descongelado."} Actualiza para obtener una nueva lectura.`;
    result.hidden = false;
  } catch (error) { status.textContent = error.name === "TimeoutError" ? "La red tardó demasiado. Reintenta la consulta." : error.message; }
  finally { button.disabled = false; role.disabled = false; }
});
role.addEventListener("change", () => { result.hidden = true; status.textContent = `Pulsa Consultar ${displayCluster} para actualizar esta asignación.`; });
