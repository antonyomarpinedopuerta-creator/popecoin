import http, { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { publicProductSnapshot } from "./product";
import { publicDataSource } from "./market-data";

const assets: Record<string, [string, string]> = {
  "/": [path.join(__dirname, "public", "index.html"), "text/html; charset=utf-8"],
  "/app.js": [path.join(__dirname, "public", "app.js"), "text/javascript; charset=utf-8"],
  "/style.css": [path.join(__dirname, "public", "style.css"), "text/css; charset=utf-8"],
  "/assets/robusto-logo.png": [path.resolve(__dirname, "../metadata/robusto/robusto-logo.png"), "image/png"],
};

export function createHandler() {
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; connect-src 'self'; img-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'none'");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    const json = (status: number, value: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(value));
    };
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); json(405, { error: "Read-only product information" }); return; }
    let url: URL;
    try {
      const target = req.url ?? "/";
      if (!target.startsWith("/") || target.startsWith("//")) throw new Error("Invalid target");
      url = new URL(target, "http://127.0.0.1");
    } catch { json(400, { error: "Invalid request URL" }); return; }
    if (url.pathname === "/api/product") {
      try { json(200, publicProductSnapshot()); }
      catch { json(503, { error: "The unapproved proposal is unavailable or invalid", projectStatus: "NOT_DEPLOYED" }); }
      return;
    }
    if (url.pathname === "/api/market") {
      json(200, { status: "NOT_DEPLOYED", source: publicDataSource ? "INJECTED_READ_ONLY_ADAPTER" : "NONE_CONFIGURED", data: null });
      return;
    }
    const asset = Object.prototype.hasOwnProperty.call(assets, url.pathname) ? assets[url.pathname] : undefined;
    if (!asset) { json(404, { error: "Not found" }); return; }
    try {
      const body = fs.readFileSync(asset[0]);
      res.writeHead(200, { "Content-Type": asset[1] });
      res.end(body);
    } catch { json(500, { error: "Asset unavailable" }); }
  };
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid PORT");
  // Development preview only. No RPC, wallet, transaction or external network is initialized.
  http.createServer(createHandler()).listen(port, "127.0.0.1", () => console.log(`ROBUSTO preview (offline): http://127.0.0.1:${port}`));
}
