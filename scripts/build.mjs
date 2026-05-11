import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
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
  "manifest.json",
  "sw.js",
  "icons",
  "img",
];

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

console.log(`Built static site into ${outDir}`);
