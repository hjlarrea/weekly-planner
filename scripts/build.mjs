import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildIndexHtml,
  buildManifest,
  buildRobotsTxt,
  buildRuntimeConfig,
  buildSitemapXml,
  resolveSiteConfig,
} from "./site-config.mjs";
import {
  ARTICLE_PAGES,
  buildArticleDetailPage,
  buildArticleLandingPage,
  getHostedArticleRoutes,
} from "./articles.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const outDir = join(rootDir, "dist");
const siteConfig = resolveSiteConfig(process.env);

const entriesToCopy = [
  "index.html",
  "styles.css",
  "app.js",
  "planner-core.mjs",
  "config.js",
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

const buildMetadata = resolveBuildMetadata();
const sourceIndexHtml = readFileSync(join(rootDir, "index.html"), "utf8");

writeFileSync(
  join(outDir, "build-meta.js"),
  `window.APP_BUILD = ${JSON.stringify(buildMetadata, null, 2)};\n`,
);

writeFileSync(
  join(outDir, "config.js"),
  `window.APP_CONFIG = ${JSON.stringify(buildRuntimeConfig(siteConfig), null, 2)};\n`,
);

writeFileSync(
  join(outDir, "manifest.json"),
  JSON.stringify(buildManifest(siteConfig), null, 2) + "\n",
);

writeFileSync(join(outDir, "index.html"), buildIndexHtml(sourceIndexHtml, siteConfig));
writeFileSync(join(outDir, "robots.txt"), buildRobotsTxt(siteConfig));

if (siteConfig.siteMenuEnabled) {
  const articlesDir = join(outDir, "articulos");
  mkdirSync(articlesDir, { recursive: true });
  writeFileSync(join(articlesDir, "index.html"), buildArticleLandingPage(siteConfig));

  for (const article of ARTICLE_PAGES) {
    const articleDir = join(articlesDir, article.slug);
    mkdirSync(articleDir, { recursive: true });
    writeFileSync(join(articleDir, "index.html"), buildArticleDetailPage(article, siteConfig));
  }
}

const sitemapPaths = siteConfig.siteMenuEnabled ? ["/", "/articulos/", ...getHostedArticleRoutes()] : ["/"];
const sitemapXml = buildSitemapXml(siteConfig, sitemapPaths);
if (sitemapXml) {
  writeFileSync(join(outDir, "sitemap.xml"), sitemapXml);
}

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
