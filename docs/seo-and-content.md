# SEO and Content Model

## Goal

The hosted public site can include SEO metadata, public-site branding, and
article pages without changing the generic self-hosted experience.

## Configuration Model

The site configuration is defined by environment variables resolved during the
build.

Initial configuration keys:

- `SITE_NAME`: visible site/app name.
- `SITE_URL`: canonical public origin for the hosted deployment.
- `SITE_TITLE`: final document title for the public homepage.
- `SITE_DESCRIPTION`: meta description and manifest description.
- `SITE_OG_IMAGE`: absolute URL of the social sharing image.
- `SITE_ROBOTS`: robots policy for generated metadata.
- `SITE_MENU_ENABLED`: enables hosted-only navigation such as About and future
  content pages.

These values should be normalized into a single site-config object inside the
build pipeline. Generic defaults remain in the repository. The hosted deployment
provides override values through workflow or environment configuration.

## SEO Metadata

The generated `dist/index.html` should contain static SEO metadata directly in
the HTML response. This includes, at minimum:

- `<title>`
- `meta name="description"`
- `link rel="canonical"`
- Open Graph tags
- Twitter card tags
- JSON-LD structured data

This metadata must be generated at build time rather than relying on client-side
JavaScript mutation.

## Consumption Split

The same configuration model is used in two ways.

### Build-time consumers

These files should be generated from the site configuration:

- `dist/index.html`
- `dist/manifest.json`
- `dist/robots.txt`
- `dist/sitemap.xml`

### Runtime consumers

These app-facing values may still be applied at runtime:

- visible site name in the UI
- footer/build-adjacent branding values
- manifest/config responses in local development

Runtime mutation is acceptable for UI consistency, but not as the primary
mechanism for search-engine metadata.

## Hosted Content Releases

Hosted SEO content should be releasable without cutting a new app version.
Article source files should live under `content/articulos/` in the repository,
while rendering logic remains in `scripts/articles.mjs` and related build
helpers.

Article files should be treated as content data rather than application code.
Each article is a Markdown file with frontmatter:

```markdown
---
slug: planner-semanal-familiar
title: Planner semanal familiar
pageTitle: Planner semanal familiar | Organiza actividades y traslados
description: Organiza actividades, horarios y traslados en una sola vista semanal.
order: 10
published: true
---
Intro del artículo.

## Título de sección

Contenido de la sección.
```

The intro is the first paragraph before any section heading. Article sections use
level-two headings (`##`) followed by one or more paragraphs. The build
transforms those files into the same static `/articulos/` HTML pages, sitemap
entries, and structured data that the hosted artifact uses today.

Set `published: false` while drafting. Unpublished files are excluded before
body validation, so incomplete drafts do not block hosted or Docker builds.

Content-only commits under `content/articulos/**` trigger the hosted deployment
workflow only. They do not publish a Docker image or require a new app version
tag.

## Implementation Notes

- Keep hosted article content isolated under `content/articulos/` so content-only
  commits can trigger hosted redeploys without changing the app release version.
- Keep public-site metadata generation static and build-time.
- Keep the self-hosted default generic unless a self-hoster explicitly provides
  their own runtime or build-time values.
