import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_PATH = "/";
const LANDING_PATH = "/articulos/";
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const defaultArticleContentDir = join(rootDir, "content", "articulos");

export function loadHostedArticles(contentDir = defaultArticleContentDir) {
  if (!existsSync(contentDir)) {
    throw new Error(`Missing hosted article content directory: ${contentDir}`);
  }

  const articles = readdirSync(contentDir)
    .filter((entry) => entry.endsWith(".md"))
    .map((entry) => parseArticleMarkdown(join(contentDir, entry)))
    .filter((article) => article.published)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "es"));

  if (articles.length === 0) {
    throw new Error(`No published hosted articles found in ${contentDir}`);
  }

  assertUniqueArticleSlugs(articles, contentDir);

  return articles;
}

export function getHostedArticleRoutes(articles = loadHostedArticles()) {
  return articles.map((article) => `/articulos/${article.slug}/`);
}

export function findHostedArticleByPathname(pathname, articles = loadHostedArticles()) {
  return articles.find((article) => pathname === `/articulos/${article.slug}/`) || null;
}

export function buildArticleLandingPage(siteConfig, articles = loadHostedArticles()) {
  return buildHostedHtmlPage({
    siteConfig,
    pageClass: "blog-index-page",
    path: LANDING_PATH,
    pageTitle: `Blog | ${siteConfig.siteName}`,
    description:
      "Guías y contenidos prácticos sobre organización semanal familiar, actividades, traslados y planificación cotidiana.",
    heading: "Blog de organización semanal familiar",
    lead:
      "Ideas y guías prácticas para organizar mejor la semana familiar, coordinar actividades y resolver traslados con menos fricción.",
    body: `
      <div class="article-feed">
        ${articles.map((article, index) => renderArticleFeedItem(article, index)).join("\n")}
      </div>
      <section class="article-panel">
        <h2>Cómo aprovechar estos contenidos</h2>
        <p>
          Si recién estás empezando, conviene leer primero los artículos más generales sobre
          planificación semanal y organización familiar. Después, podés avanzar hacia los
          temas más específicos, como plantillas, traslados o coordinación de familias numerosas.
        </p>
        <p>
          La idea no es acumular teoría, sino darte una estructura útil para ordenar la semana
          con menos fricción. Por eso en todos los casos vas a encontrar una salida clara hacia
          <a href="${ROOT_PATH}">la herramienta principal</a>, para que puedas aplicar lo leído en una vista real.
        </p>
      </section>
    `,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Blog de organización semanal familiar",
      url: buildAbsoluteUrl(siteConfig.siteUrl, LANDING_PATH),
      description:
        "Guías y contenidos prácticos sobre organización semanal familiar, actividades, traslados y planificación cotidiana.",
      inLanguage: "es-AR",
    },
  });
}

export function buildArticleDetailPage(article, siteConfig) {
  return buildHostedHtmlPage({
    siteConfig,
    pageClass: "article-detail-page",
    path: `/articulos/${article.slug}/`,
    pageTitle: article.pageTitle,
    description: article.description,
    heading: article.title,
    lead: article.intro,
    body: `
      ${article.sections
        .map(
          (section, index) => `
            <section class="article-section">
              <div class="article-section-heading">
                <span class="article-section-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
                <h2>${escapeHtml(section.heading)}</h2>
              </div>
              <div class="article-section-body">
                ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n")}
              </div>
            </section>
          `,
        )
        .join("\n")}
      <section class="article-cta">
        <h2>Llevar esta idea a la práctica</h2>
        <p>
          Si querés pasar de la planificación teórica a una vista semanal concreta, podés volver
          al <a href="${ROOT_PATH}">planner principal</a> y ordenar actividades, horarios y traslados
          en una sola semana.
        </p>
        <div class="article-actions">
          <a class="article-button" href="${ROOT_PATH}">Abrir el planner</a>
          <a class="article-button ghost-link" href="${LANDING_PATH}">Volver al blog</a>
        </div>
      </section>
    `,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.description,
      url: buildAbsoluteUrl(siteConfig.siteUrl, `/articulos/${article.slug}/`),
      inLanguage: "es-AR",
      author: {
        "@type": "Person",
        name: "Hernán J. Larrea",
      },
      publisher: {
        "@type": "Organization",
        name: siteConfig.siteName,
      },
    },
  });
}

function parseArticleMarkdown(filePath) {
  const source = readFileSync(filePath, "utf8");
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    throw new Error(`Article file is missing frontmatter: ${filePath}`);
  }

  const metadata = parseFrontmatter(match[1], filePath);
  const published = parseBoolean(metadata.published, true);

  if (!published) {
    return { published: false };
  }

  const sections = parseArticleBody(match[2].trim(), filePath);
  const introSection = sections.shift();

  if (!introSection || introSection.heading) {
    throw new Error(`Article file must start with an intro paragraph before the first heading: ${filePath}`);
  }

  const article = {
    slug: requireMetadata(metadata, "slug", filePath),
    title: requireMetadata(metadata, "title", filePath),
    pageTitle: requireMetadata(metadata, "pageTitle", filePath),
    description: requireMetadata(metadata, "description", filePath),
    intro: introSection.paragraphs.join("\n\n"),
    order: Number.parseInt(metadata.order || "1000", 10),
    published,
    sections,
  };

  if (!Number.isFinite(article.order)) {
    throw new Error(`Article order must be a number: ${filePath}`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) {
    throw new Error(`Article slug must be URL-safe lowercase kebab-case: ${filePath}`);
  }

  if (article.sections.length === 0) {
    throw new Error(`Article file must include at least one section: ${filePath}`);
  }

  return article;
}

function assertUniqueArticleSlugs(articles, contentDir) {
  const seenSlugs = new Set();

  for (const article of articles) {
    if (seenSlugs.has(article.slug)) {
      throw new Error(`Duplicate hosted article slug in ${contentDir}: ${article.slug}`);
    }

    seenSlugs.add(article.slug);
  }
}

function parseFrontmatter(frontmatter, filePath) {
  return frontmatter.split("\n").reduce((metadata, line) => {
    if (!line.trim()) {
      return metadata;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      throw new Error(`Invalid frontmatter line in ${filePath}: ${line}`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    metadata[key] = value;
    return metadata;
  }, {});
}

function parseArticleBody(body, filePath) {
  if (!body) {
    throw new Error(`Article file must include body content: ${filePath}`);
  }

  const sections = [];
  let currentSection = { heading: "", paragraphs: [] };

  for (const block of body.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)) {
    if (block.startsWith("## ")) {
      if (currentSection.paragraphs.length > 0 || currentSection.heading) {
        sections.push(currentSection);
      }

      currentSection = {
        heading: block.replace(/^##\s+/, "").trim(),
        paragraphs: [],
      };
      continue;
    }

    if (block.startsWith("#")) {
      throw new Error(`Only level-two headings are supported in article content: ${filePath}`);
    }

    currentSection.paragraphs.push(block.replace(/\s*\n\s*/g, " "));
  }

  if (currentSection.paragraphs.length > 0 || currentSection.heading) {
    sections.push(currentSection);
  }

  for (const section of sections) {
    if (section.heading && section.paragraphs.length === 0) {
      throw new Error(`Article section is missing paragraph content: ${filePath}`);
    }
  }

  return sections;
}

function requireMetadata(metadata, key, filePath) {
  const value = metadata[key];
  if (!value) {
    throw new Error(`Article frontmatter is missing ${key}: ${filePath}`);
  }

  return value;
}

function parseBoolean(value, fallback) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  return ["1", "true", "yes", "y", "on"].includes(value.trim().toLowerCase());
}

function buildHostedHtmlPage({
  siteConfig,
  path,
  pageTitle,
  description,
  heading,
  lead,
  body,
  structuredData,
  pageClass,
}) {
  const canonicalUrl = buildAbsoluteUrl(siteConfig.siteUrl, path);
  const ogImageTag = siteConfig.siteOgImage
    ? `<meta property="og:image" content="${escapeAttribute(siteConfig.siteOgImage)}" />
    <meta name="twitter:image" content="${escapeAttribute(siteConfig.siteOgImage)}" />`
    : "";
  const canonicalTag = canonicalUrl
    ? `<link rel="canonical" href="${escapeAttribute(canonicalUrl)}" />
    <meta property="og:url" content="${escapeAttribute(canonicalUrl)}" />`
    : "";
  const structuredDataTag =
    structuredData && canonicalUrl
      ? `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="theme-color" content="#b85c38" />
    <meta name="description" content="${escapeAttribute(description)}" />
    <meta name="robots" content="${escapeAttribute(siteConfig.siteRobots)}" />
    <meta property="og:title" content="${escapeAttribute(pageTitle)}" />
    <meta property="og:description" content="${escapeAttribute(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:locale" content="es_AR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttribute(pageTitle)}" />
    <meta name="twitter:description" content="${escapeAttribute(description)}" />
    ${canonicalTag}
    ${ogImageTag}
    ${structuredDataTag}
    <link rel="icon" type="image/png" sizes="64x64" href="/icons/favicon-64.png" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="content-page-body">
    <div class="content-shell">
      <header class="content-header">
        <div>
          <p class="eyebrow">Organización Familiar</p>
          <a class="content-brand" href="${ROOT_PATH}">${escapeHtml(siteConfig.siteName)}</a>
        </div>
        <nav class="content-nav" aria-label="Navegación del blog">
          <a href="${ROOT_PATH}">Inicio</a>
          <a href="${LANDING_PATH}">Blog</a>
        </nav>
      </header>

      <main class="article-page ${escapeAttribute(pageClass)}">
        <div class="article-breadcrumbs">
          <a href="${ROOT_PATH}">Inicio</a>
          <span>/</span>
          <a href="${LANDING_PATH}">Blog</a>
        </div>
        <section class="article-hero">
          <h1>${escapeHtml(heading)}</h1>
          <p class="article-lead">${escapeHtml(lead)}</p>
        </section>
        <div class="article-prose">
          ${body}
        </div>
      </main>

      <footer class="content-footer">
        <p>
          <a href="${ROOT_PATH}">Volver al planner principal</a>
        </p>
      </footer>
    </div>
  </body>
</html>
`;
}

function renderArticleFeedItem(article, index) {
  return `
    <article class="article-feed-item">
      <p class="article-feed-number">${String(index + 1).padStart(2, "0")}</p>
      <div class="article-feed-copy">
        <h2><a href="/articulos/${article.slug}/">${escapeHtml(article.title)}</a></h2>
        <p>${escapeHtml(article.description)}</p>
      </div>
      <a class="article-feed-link" href="/articulos/${article.slug}/" aria-label="Leer ${escapeAttribute(article.title)}">
        Leer artículo <span aria-hidden="true">&rarr;</span>
      </a>
    </article>
  `;
}

function buildAbsoluteUrl(siteUrl, pathname) {
  if (!siteUrl) {
    return "";
  }

  return new URL(pathname, siteUrl).toString();
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
