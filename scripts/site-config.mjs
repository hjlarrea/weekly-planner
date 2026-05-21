const DEFAULTS = {
  siteName: "Planner Semanal",
  siteTitle: "Planner Semanal",
  siteDescription: "Planner semanal familiar para actividades, traslados y organizacion diaria.",
  siteUrl: "",
  siteOgImage: "",
  siteRobots: "index,follow",
  siteMenuEnabled: false,
  locale: "es_AR",
  lang: "es-AR",
  themeColor: "#b85c38",
  backgroundColor: "#f8f3ea",
};

export function resolveSiteConfig(env = process.env) {
  const siteName = normalizeString(env.SITE_NAME, DEFAULTS.siteName);
  const siteTitle = normalizeString(env.SITE_TITLE, siteName);
  const siteDescription = normalizeString(env.SITE_DESCRIPTION, DEFAULTS.siteDescription);
  const siteUrl = normalizeUrl(env.SITE_URL);
  const siteOgImage = normalizeUrl(env.SITE_OG_IMAGE);
  const siteRobots = normalizeString(env.SITE_ROBOTS, DEFAULTS.siteRobots);
  const siteMenuEnabled = normalizeBoolean(env.SITE_MENU_ENABLED, DEFAULTS.siteMenuEnabled);

  return {
    siteName,
    siteTitle,
    siteDescription,
    siteUrl,
    siteOgImage,
    siteRobots,
    siteMenuEnabled,
    locale: DEFAULTS.locale,
    lang: DEFAULTS.lang,
    themeColor: DEFAULTS.themeColor,
    backgroundColor: DEFAULTS.backgroundColor,
  };
}

export function buildManifest(siteConfig) {
  return {
    id: "/",
    name: siteConfig.siteName,
    short_name: siteConfig.siteName,
    description: siteConfig.siteDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: siteConfig.backgroundColor,
    theme_color: siteConfig.themeColor,
    lang: siteConfig.lang,
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

export function buildRuntimeConfig(siteConfig) {
  return {
    siteName: siteConfig.siteName,
    siteTitle: siteConfig.siteTitle,
    siteDescription: siteConfig.siteDescription,
    siteUrl: siteConfig.siteUrl,
    siteOgImage: siteConfig.siteOgImage,
    siteRobots: siteConfig.siteRobots,
    siteMenuEnabled: siteConfig.siteMenuEnabled,
  };
}

export function buildRobotsTxt(siteConfig) {
  const lines = ["User-agent: *"];

  if (siteConfig.siteRobots.toLowerCase().includes("noindex")) {
    lines.push("Disallow: /");
  } else {
    lines.push("Allow: /");
  }

  if (siteConfig.siteUrl) {
    lines.push(`Sitemap: ${new URL("/sitemap.xml", siteConfig.siteUrl).toString()}`);
  }

  return lines.join("\n") + "\n";
}

export function buildSitemapXml(siteConfig, paths = ["/"]) {
  if (!siteConfig.siteUrl) {
    return "";
  }

  const entries = paths.map((path) => {
    const pageUrl = new URL(path, siteConfig.siteUrl).toString();
    return [
      "  <url>",
      `    <loc>${escapeXml(pageUrl)}</loc>`,
      "  </url>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

export function buildIndexHtml(template, siteConfig) {
  let html = template;

  html = replaceTagContent(html, "title", escapeHtml(siteConfig.siteTitle));
  html = replaceMetaContent(html, "apple-mobile-web-app-title", siteConfig.siteName);
  html = replaceElementTextById(html, "site-name", escapeHtml(siteConfig.siteName));

  const extraTags = [
    `<meta name="description" content="${escapeAttribute(siteConfig.siteDescription)}" />`,
    `<meta name="robots" content="${escapeAttribute(siteConfig.siteRobots)}" />`,
  ];

  if (siteConfig.siteUrl) {
    extraTags.push(`<link rel="canonical" href="${escapeAttribute(siteConfig.siteUrl)}" />`);
    extraTags.push(`<meta property="og:url" content="${escapeAttribute(siteConfig.siteUrl)}" />`);
  }

  extraTags.push(`<meta property="og:title" content="${escapeAttribute(siteConfig.siteTitle)}" />`);
  extraTags.push(
    `<meta property="og:description" content="${escapeAttribute(siteConfig.siteDescription)}" />`,
  );
  extraTags.push(`<meta property="og:type" content="website" />`);
  extraTags.push(`<meta property="og:locale" content="${escapeAttribute(siteConfig.locale)}" />`);

  if (siteConfig.siteOgImage) {
    extraTags.push(`<meta property="og:image" content="${escapeAttribute(siteConfig.siteOgImage)}" />`);
  }

  extraTags.push(`<meta name="twitter:card" content="summary_large_image" />`);
  extraTags.push(`<meta name="twitter:title" content="${escapeAttribute(siteConfig.siteTitle)}" />`);
  extraTags.push(
    `<meta name="twitter:description" content="${escapeAttribute(siteConfig.siteDescription)}" />`,
  );

  if (siteConfig.siteOgImage) {
    extraTags.push(`<meta name="twitter:image" content="${escapeAttribute(siteConfig.siteOgImage)}" />`);
  }

  if (siteConfig.siteUrl) {
    extraTags.push(buildStructuredDataTag(siteConfig));
  }

  return injectBefore(html, '</head>', `    ${extraTags.join("\n    ")}\n`);
}

function buildStructuredDataTag(siteConfig) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.siteName,
    url: siteConfig.siteUrl,
    description: siteConfig.siteDescription,
    inLanguage: siteConfig.lang,
  };

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function replaceTagContent(html, tagName, value) {
  const pattern = new RegExp(`<${tagName}>[\\s\\S]*?<\\/${tagName}>`);
  return html.replace(pattern, `<${tagName}>${value}</${tagName}>`);
}

function replaceMetaContent(html, name, value) {
  const pattern = new RegExp(`(<meta\\s+name="${escapeRegExp(name)}"\\s+content=")([^"]*)("\\s*/>)`);
  return html.replace(pattern, `$1${escapeAttribute(value)}$3`);
}

function injectBefore(html, marker, snippet) {
  const index = html.indexOf(marker);
  if (index === -1) {
    throw new Error(`Could not find marker ${marker}`);
  }

  return `${html.slice(0, index)}${snippet}${html.slice(index)}`;
}

function replaceElementTextById(html, elementId, value) {
  const pattern = new RegExp(`(<[^>]+id="${escapeRegExp(elementId)}"[^>]*>)([\\s\\S]*?)(</[^>]+>)`);
  return html.replace(pattern, `$1${value}$3`);
}

function normalizeString(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  try {
    const url = new URL(value.trim());
    return url.toString().replace(/\/$/, "/");
  } catch {
    return "";
  }
}

function normalizeBoolean(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
