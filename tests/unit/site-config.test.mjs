import assert from "node:assert/strict";
import test from "node:test";
import {
  buildIndexHtml,
  buildManifest,
  buildRobotsTxt,
  buildRuntimeConfig,
  buildSitemapXml,
  resolveSiteConfig,
} from "../../scripts/site-config.mjs";

test("resolveSiteConfig applies defaults and normalizes values", () => {
  const config = resolveSiteConfig({
    SITE_NAME: "  Mi planner  ",
    SITE_TITLE: "  ",
    SITE_DESCRIPTION: "  Organiza mejor  ",
    SITE_URL: "https://example.com",
    SITE_OG_IMAGE: "https://example.com/og.png",
    SITE_MENU_ENABLED: "yes",
    SITE_ROBOTS: "noindex,nofollow",
  });

  assert.equal(config.siteName, "Mi planner");
  assert.equal(config.siteTitle, "Mi planner");
  assert.equal(config.siteDescription, "Organiza mejor");
  assert.equal(config.siteUrl, "https://example.com/");
  assert.equal(config.siteOgImage, "https://example.com/og.png");
  assert.equal(config.siteMenuEnabled, true);
  assert.equal(config.siteRobots, "noindex,nofollow");
});

test("buildRuntimeConfig and buildManifest expose hosted metadata", () => {
  const config = resolveSiteConfig({
    SITE_NAME: "Arma tu semana",
    SITE_DESCRIPTION: "Planificación familiar",
  });

  const runtime = buildRuntimeConfig(config);
  const manifest = buildManifest(config);

  assert.equal(runtime.siteName, "Arma tu semana");
  assert.equal(runtime.siteDescription, "Planificación familiar");
  assert.equal(manifest.name, "Arma tu semana");
  assert.equal(manifest.description, "Planificación familiar");
});

test("buildRobotsTxt and buildSitemapXml reflect indexing settings", () => {
  const indexed = resolveSiteConfig({
    SITE_URL: "https://armatusemana.com.ar",
  });
  const blocked = resolveSiteConfig({
    SITE_URL: "https://armatusemana.com.ar",
    SITE_ROBOTS: "noindex,nofollow",
  });

  assert.match(buildRobotsTxt(indexed), /Allow: \//);
  assert.match(buildRobotsTxt(indexed), /Sitemap: https:\/\/armatusemana\.com\.ar\/sitemap\.xml/);
  assert.match(buildRobotsTxt(blocked), /Disallow: \//);
  assert.match(buildSitemapXml(indexed, ["/", "/articulos/"]), /<loc>https:\/\/armatusemana\.com\.ar\/articulos\/<\/loc>/);
});

test("buildIndexHtml injects canonical and social metadata", () => {
  const template = `
    <html lang="es-AR">
      <head>
        <title>Original</title>
        <meta name="apple-mobile-web-app-title" content="Original" />
      </head>
      <body>
        <h1 id="site-name">Original</h1>
      </body>
    </html>
  `;

  const config = resolveSiteConfig({
    SITE_NAME: "Planner Hosted",
    SITE_TITLE: "Planner Hosted | Semana",
    SITE_DESCRIPTION: "Descripción hosted",
    SITE_URL: "https://planner.example/",
    SITE_OG_IMAGE: "https://planner.example/og.png",
  });

  const html = buildIndexHtml(template, config);
  assert.match(html, /<title>Planner Hosted \| Semana<\/title>/);
  assert.match(html, /<h1 id="site-name">Planner Hosted<\/h1>/);
  assert.match(html, /rel="canonical" href="https:\/\/planner\.example\/"/);
  assert.match(html, /property="og:image" content="https:\/\/planner\.example\/og\.png"/);
  assert.match(html, /application\/ld\+json/);
});
