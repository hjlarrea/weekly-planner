import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SITE_NAME = "Planner Semanal";
const PORT = Number(process.env.PORT || 4173);
const SITE_NAME = normalizeSiteName(process.env.SITE_NAME);
const rootDir = join(fileURLToPath(new URL("..", import.meta.url)), "..");

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (pathname === "/config.js") {
    sendText(
      response,
      "application/javascript; charset=utf-8",
      `window.APP_CONFIG = ${JSON.stringify({ siteName: SITE_NAME }, null, 2)};\n`,
    );
    return;
  }

  if (pathname === "/manifest.json") {
    sendText(response, "application/json; charset=utf-8", JSON.stringify(buildManifest(), null, 2) + "\n");
    return;
  }

  const filePath = resolveStaticPath(pathname);
  if (!filePath) {
    sendNotFound(response);
    return;
  }

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      sendNotFound(response);
      return;
    }
  } catch {
    sendNotFound(response);
    return;
  }

  response.writeHead(200, {
    "Content-Type": CONTENT_TYPES[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(PORT, () => {
  console.log(`Serving weekly-planner on http://localhost:${PORT}`);
  console.log(`SITE_NAME=${SITE_NAME}`);
});

function normalizeSiteName(value) {
  if (typeof value !== "string") {
    return DEFAULT_SITE_NAME;
  }

  const trimmed = value.trim();
  return trimmed || DEFAULT_SITE_NAME;
}

function buildManifest() {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "Planner semanal familiar para actividades, traslados y organizacion diaria.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8f3ea",
    theme_color: "#b85c38",
    lang: "es-AR",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

function resolveStaticPath(pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const normalizedPath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(rootDir, normalizedPath);

  return existsSync(filePath) ? filePath : null;
}

function sendText(response, contentType, body) {
  response.writeHead(200, { "Content-Type": contentType });
  response.end(body);
}

function sendNotFound(response) {
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
}
