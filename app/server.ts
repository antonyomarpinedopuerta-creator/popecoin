import http, { IncomingMessage, ServerResponse } from "http";
import fs from "fs";
import path from "path";
import { PublicKey } from "@solana/web3.js";
import { BENEFICIARIES, readVesting } from "../scripts/vesting-reader";

const assets: Record<string, [string, string]> = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
};
export function createHandler(reader: typeof readVesting = readVesting) {
  let pending = 0;
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    const json = (status: number, value: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(value));
    };
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); json(405, { error: "Read-only application" }); return; }
    let url: URL;
    try {
      const target = req.url ?? "/";
      if (!target.startsWith("/") || target.startsWith("//")) throw new Error("Invalid target");
      url = new URL(target, "http://127.0.0.1");
    } catch { json(400, { error: "Invalid request URL" }); return; }
    if (url.pathname === "/api/vesting") {
      const role = url.searchParams.get("role");
      if (role !== "reserve" && role !== "founder") { json(400, { error: "Choose reserve or founder" }); return; }
      if (pending >= 2) { json(429, { error: "Consulta en curso. Inténtalo de nuevo." }); return; }
      pending++;
      try { json(200, await reader(new PublicKey(BENEFICIARIES[role]))); }
      catch { json(502, { error: "No se pudo verificar el vesting en Devnet. El RPC puede estar indisponible o la cuenta no es válida. Reintenta más tarde." }); }
      finally { pending--; }
      return;
    }
    const asset = Object.prototype.hasOwnProperty.call(assets, url.pathname) ? assets[url.pathname] : undefined;
    if (!asset) { json(404, { error: "Not found" }); return; }
    try {
      const body = fs.readFileSync(path.join(__dirname, "public", asset[0]));
      res.writeHead(200, { "Content-Type": asset[1] });
      res.end(body);
    } catch { json(500, { error: "Asset unavailable" }); }
  };
}
if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid PORT");
  http.createServer(createHandler()).listen(port, "127.0.0.1", () => console.log(`PAPA: http://127.0.0.1:${port}`));
}
