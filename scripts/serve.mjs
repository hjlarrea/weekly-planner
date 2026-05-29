import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import http from "node:http";
import { dirname, extname, isAbsolute, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { buildManifest, buildRobotsTxt, buildRuntimeConfig, buildSitemapXml, resolveSiteConfig } from "./site-config.mjs";
import {
  buildArticleDetailPage,
  buildArticleLandingPage,
  findHostedArticleByPathname,
  getHostedArticleRoutes,
} from "./articles.mjs";

const PORT = Number(process.env.PORT || 4173);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const serveDir = resolveServeDir(process.argv[2]);
const siteConfig = resolveSiteConfig(process.env);
const servesGeneratedOutput = serveDir !== rootDir;

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (!servesGeneratedOutput && pathname === "/config.js") {
    sendText(
      response,
      "application/javascript; charset=utf-8",
      `window.APP_CONFIG = ${JSON.stringify(buildRuntimeConfig(siteConfig), null, 2)};\n`,
    );
    return;
  }

  if (!servesGeneratedOutput && pathname === "/manifest.json") {
    sendText(
      response,
      "application/json; charset=utf-8",
      JSON.stringify(buildManifest(siteConfig), null, 2) + "\n",
    );
    return;
  }

  if (!servesGeneratedOutput && pathname === "/robots.txt") {
    sendText(response, "text/plain; charset=utf-8", buildRobotsTxt(siteConfig));
    return;
  }

  if (!servesGeneratedOutput && pathname === "/sitemap.xml") {
    const sitemapPaths = siteConfig.siteMenuEnabled ? ["/", "/articulos/", ...getHostedArticleRoutes()] : ["/"];
    sendText(response, "application/xml; charset=utf-8", buildSitemapXml(siteConfig, sitemapPaths));
    return;
  }

  if (!servesGeneratedOutput && siteConfig.siteMenuEnabled && pathname === "/articulos/") {
    sendText(response, "text/html; charset=utf-8", buildArticleLandingPage(siteConfig));
    return;
  }

  if (!servesGeneratedOutput && siteConfig.siteMenuEnabled) {
    const matchedArticle = findHostedArticleByPathname(pathname);
    if (matchedArticle) {
      sendText(response, "text/html; charset=utf-8", buildArticleDetailPage(matchedArticle, siteConfig));
      return;
    }
  }

  if (!servesGeneratedOutput && pathname === "/build-meta.js") {
    sendText(
      response,
      "application/javascript; charset=utf-8",
      `window.APP_BUILD = ${JSON.stringify(resolveBuildMetadata(), null, 2)};\n`,
    );
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
  console.log(`SERVE_DIR=${serveDir}`);
  console.log(`SITE_NAME=${siteConfig.siteName}`);
});

function resolveBuildMetadata() {
  const commit = readGitOutput(["rev-parse", "--short", "HEAD"]);
  const tag = readGitOutput(["tag", "--points-at", "HEAD"])
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return {
    version: tag || commit || "unknown",
    commit: commit || "unknown",
  };
}

function readGitOutput(args) {
  try {
    return execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function resolveStaticPath(pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const normalizedPath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const directPath = join(serveDir, normalizedPath);

  if (existsSync(directPath)) {
    return directPath;
  }

  const indexPath = join(serveDir, normalizedPath, "index.html");
  if (existsSync(indexPath)) {
    return indexPath;
  }

  return null;
}

function resolveServeDir(inputPath) {
  if (!inputPath) {
    return rootDir;
  }

  return isAbsolute(inputPath) ? inputPath : join(rootDir, inputPath);
}

function sendText(response, contentType, body) {
  response.writeHead(200, { "Content-Type": contentType });
  response.end(body);
}

function sendNotFound(response) {
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
}
