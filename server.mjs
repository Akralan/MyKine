// Serveur statique minimal pour la démo Scalingo : sert le build Vite (`dist`).
// Aucune dépendance runtime — le seul rôle est de rendre les fichiers en HTTPS.
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("./dist", import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".task": "application/octet-stream",
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  let file = resolve(ROOT, "." + path);
  if (!file.startsWith(ROOT)) file = ROOT; // pas de sortie du dossier servi

  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
  } catch {
    file = join(ROOT, "index.html"); // page unique : tout chemin inconnu retombe dessus
  }

  res.setHeader("Content-Type", TYPES[extname(file)] ?? "application/octet-stream");
  // Les assets Vite sont hashés : cache long. L'index doit rester frais.
  res.setHeader(
    "Cache-Control",
    path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
  );
  createReadStream(file)
    .on("error", () => {
      res.statusCode = 404;
      res.end("Not found");
    })
    .pipe(res);
}).listen(PORT, () => console.log(`MyCoach servi sur :${PORT}`));
