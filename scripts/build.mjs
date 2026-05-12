import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const outDir = join(rootDir, "dist");

const entriesToCopy = [
  "index.html",
  "styles.css",
  "app.js",
  "config.js",
  "sw.js",
  "icons",
  "img",
];

const DEFAULT_SITE_NAME = "Planner Semanal";
const SITE_NAME = normalizeSiteName(process.env.SITE_NAME);

rmSync(outDir, { force: true, recursive: true });
mkdirSync(outDir, { recursive: true });

for (const entry of entriesToCopy) {
  const source = join(rootDir, entry);
  const target = join(outDir, entry);

  if (!existsSync(source)) {
    throw new Error(`Missing required build input: ${entry}`);
  }

  cpSync(source, target, { recursive: true });
}

const buildMetadata = resolveBuildMetadata();

writeFileSync(
  join(outDir, "build-meta.js"),
  `window.APP_BUILD = ${JSON.stringify(buildMetadata, null, 2)};\n`,
);

writeFileSync(
  join(outDir, "config.js"),
  `window.APP_CONFIG = ${JSON.stringify({ siteName: SITE_NAME }, null, 2)};\n`,
);

writeFileSync(
  join(outDir, "manifest.json"),
  JSON.stringify(buildManifest(), null, 2) + "\n",
);

console.log(`Built static site into ${outDir}`);

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
