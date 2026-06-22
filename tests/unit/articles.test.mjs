import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  buildArticleDetailPage,
  buildArticleLandingPage,
  findHostedArticleByPathname,
  getHostedArticleRoutes,
  loadHostedArticles,
} from "../../scripts/articles.mjs";
import { resolveSiteConfig } from "../../scripts/site-config.mjs";

test("loadHostedArticles parses markdown frontmatter and sections in order", async () => {
  const contentDir = await mkdtemp(join(tmpdir(), "weekly-planner-articles-"));
  try {
    await writeArticle(contentDir, "segundo.md", {
      slug: "segundo-articulo",
      title: "Segundo artículo",
      pageTitle: "Segundo artículo",
      description: "Descripción del segundo artículo.",
      order: "20",
      body: [
        "Intro del segundo artículo.",
        "## Segundo título",
        "Primer párrafo.",
        "Segundo párrafo.",
      ].join("\n\n"),
    });
    await writeArticle(contentDir, "primero.md", {
      slug: "primer-articulo",
      title: "Primer artículo",
      pageTitle: "Primer artículo",
      description: "Descripción del primer artículo.",
      order: "10",
      body: [
        "Intro del primer artículo.",
        "## Primer título",
        "Contenido del primer artículo.",
      ].join("\n\n"),
    });

    const articles = loadHostedArticles(contentDir);

    assert.deepEqual(articles.map((article) => article.slug), ["primer-articulo", "segundo-articulo"]);
    assert.equal(articles[0].intro, "Intro del primer artículo.");
    assert.equal(articles[1].sections[0].paragraphs.length, 2);
    assert.deepEqual(getHostedArticleRoutes(articles), ["/articulos/primer-articulo/", "/articulos/segundo-articulo/"]);
    assert.equal(findHostedArticleByPathname("/articulos/segundo-articulo/", articles)?.title, "Segundo artículo");
  } finally {
    await rm(contentDir, { force: true, recursive: true });
  }
});

test("buildArticleLandingPage renders loaded article feed items", async () => {
  const contentDir = await mkdtemp(join(tmpdir(), "weekly-planner-articles-"));
  try {
    await writeArticle(contentDir, "articulo.md", {
      slug: "articulo-de-prueba",
      title: "Artículo de prueba",
      pageTitle: "Artículo de prueba",
      description: "Descripción visible.",
      order: "10",
      body: [
        "Intro visible.",
        "## Título de sección",
        "Contenido visible.",
      ].join("\n\n"),
    });

    const siteConfig = resolveSiteConfig({ SITE_NAME: "Planner Test", SITE_URL: "https://planner.example/" });
    const html = buildArticleLandingPage(siteConfig, loadHostedArticles(contentDir));

    assert.match(html, /Artículo de prueba/);
    assert.match(html, /\/articulos\/articulo-de-prueba\//);
    assert.match(html, /https:\/\/planner\.example\/articulos\//);
    assert.match(html, /class="article-feed-item"/);
    assert.doesNotMatch(html, /class="article-card"/);
  } finally {
    await rm(contentDir, { force: true, recursive: true });
  }
});

test("loadHostedArticles ignores unpublished drafts with incomplete bodies", async () => {
  const contentDir = await mkdtemp(join(tmpdir(), "weekly-planner-articles-"));
  try {
    await writeArticle(contentDir, "publicado.md", {
      slug: "articulo-publicado",
      title: "Artículo publicado",
      pageTitle: "Artículo publicado",
      description: "Descripción publicada.",
      order: "10",
      body: [
        "Intro publicada.",
        "## Título publicado",
        "Contenido publicado.",
      ].join("\n\n"),
    });
    await writeFile(
      join(contentDir, "borrador.md"),
      [
        "---",
        "slug: borrador-incompleto",
        "published: false",
        "---",
        "### Encabezado todavía inválido",
        "",
      ].join("\n"),
    );

    const articles = loadHostedArticles(contentDir);

    assert.deepEqual(articles.map((article) => article.slug), ["articulo-publicado"]);
  } finally {
    await rm(contentDir, { force: true, recursive: true });
  }
});

test("buildArticleDetailPage renders a continuous editorial layout", async () => {
  const articles = loadHostedArticles();
  const siteConfig = resolveSiteConfig({ SITE_NAME: "Planner Test", SITE_URL: "https://planner.example/" });
  const html = buildArticleDetailPage(articles[0], siteConfig);

  assert.match(html, /class="article-page article-detail-page"/);
  assert.match(html, /class="article-section"/);
  assert.match(html, /class="article-section-number"[^>]*>01</);
  assert.match(html, /class="article-section-body"/);
  assert.doesNotMatch(html, /class="article-panel"/);
});

async function writeArticle(contentDir, filename, article) {
  await writeFile(
    join(contentDir, filename),
    [
      "---",
      `slug: ${article.slug}`,
      `title: ${article.title}`,
      `pageTitle: ${article.pageTitle}`,
      `description: ${article.description}`,
      `order: ${article.order}`,
      "published: true",
      "---",
      article.body,
      "",
    ].join("\n"),
  );
}
