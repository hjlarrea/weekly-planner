# Deployment Branding and SEO Model

## Goal

This project is published to two different targets from the same codebase:

- A generic Docker image published to GHCR for self-hosting.
- A branded static artifact deployed to the hosted public site.

The implementation must preserve a vanilla self-hosted experience while allowing
the hosted deployment to inject branded SEO metadata and public-site
customizations.

## Principles

- Source files committed to the repository remain generic by default.
- The Docker image must not ship with public-site branding or domain-specific
  SEO metadata baked into its source assets.
- The hosted static artifact may include public-site branding and SEO
  customizations.
- Branding and SEO values should come from one configuration model, even if
  some values are consumed at build time and others at runtime.

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
- `SITE_MENU_ENABLED`: enables hosted-only navigation such as About and future content pages.

These values should be normalized into a single site-config object inside the
build pipeline. Generic defaults remain in the repository. The hosted deployment provides
override values through workflow/environment configuration.

## Artifact Rules

### Generic source tree

The repository source remains generic:

- `index.html`
- `config.js`
- `manifest.json`
- Docker runtime defaults

These files must not contain `armatusemana.com.ar`-specific metadata or other
deployment-specific branding by default.

### Hosted artifact

`npm run build` generates a `dist/` folder. For hosted deployments, that output
may contain branded and SEO-specific content, including:

- `dist/index.html`
- `dist/config.js`
- `dist/manifest.json`
- `dist/robots.txt`
- `dist/sitemap.xml`
- `dist/articulos/...` hosted-only article pages

The generated `dist/index.html` should contain static SEO metadata directly in
the HTML response. This includes, at minimum:

- `<title>`
- `meta name="description"`
- `link rel="canonical"`
- Open Graph tags
- Twitter card tags
- JSON-LD structured data

This metadata must be generated at build time rather than relying on
client-side JavaScript mutation.

### Docker image

The Docker image continues to serve the generic source files.

- The image should remain self-hosting friendly out of the box.
- Runtime overrides such as `SITE_NAME` may still be supported.
- Public-site SEO values should not be included unless a self-hoster explicitly
  opts in by setting their own environment values in the future.
- Hosted-only content pages and their navigation should not be shipped through
  the generic Docker runtime.

## Consumption Split

The same configuration model is used in two ways:

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

## Workflow Model

### Hosted deployment

The production deployment workflow builds the static artifact with hosted-environment
configuration values. The workflow is responsible for passing the public-site
branding and SEO variables into `npm run build`.

### Hosted content releases

Hosted SEO content should be releasable without cutting a new app version.
Article source files should live under `content/articulos/` in the repository,
while rendering logic remains in `scripts/articles.mjs` and related build
helpers.

The hosted deployment workflow should run for both:

- tagged app releases, such as `v1.2.3`
- changes merged to `main` under `content/articulos/**`

Content-only deployments should rebuild and redeploy the hosted static artifact
but must not publish a new Docker image or require a new app tag. The deployed
hosted site can therefore combine the current app code from `main` with the
latest article content.

The Docker release workflow should remain tag-driven only. A content-only
change must not trigger GHCR publishing, because hosted articles are not part of
the self-hosted runtime contract.

Article files should be treated as content data rather than application code.
A future implementation can use Markdown files with frontmatter for fields such
as slug, title, page title, description, intro, ordering, and publication status.
The build should transform those files into the same static `/articulos/` HTML
pages, sitemap entries, and structured data that the hosted artifact uses today.

### GHCR Docker release

The image release workflow builds directly from the generic source tree. It does
not consume hosted-site branding variables and does not depend on the
generated `dist/` artifact.

## Implementation Notes

- Prefer one config-derivation path in `scripts/build.mjs`.
- Keep defaults generic and safe for self-hosting.
- Avoid duplicating branding logic across multiple scripts when a shared helper
  can define the canonical site-config shape.
- Local development may support some overrides for previewing the branded build,
  but the main requirement is correct hosted artifact generation.
- Keep hosted article content isolated under `content/articulos/` so content-only
  commits can trigger hosted redeploys without changing the app release version.
