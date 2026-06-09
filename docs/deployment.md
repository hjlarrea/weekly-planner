# Deployment Model

## Goal

This project is published to two different targets from the same codebase:

- A generic Docker image published to GHCR for self-hosting.
- A branded static artifact deployed to the hosted public site.

The implementation must preserve a vanilla self-hosted experience while allowing
the hosted deployment to inject public-site customization at build time.

## Principles

- Source files committed to the repository remain generic by default.
- The Docker image must not ship with public-site branding, domain-specific SEO
  metadata, or hosted article pages baked into its source assets.
- The hosted static artifact may include public-site branding, SEO metadata, and
  hosted-only content pages.
- One site-configuration model should be used across local runtime, hosted
  builds, and Docker overrides.

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

### Docker image

The Docker image continues to serve the generic source files.

- The image should remain self-hosting friendly out of the box.
- Runtime overrides such as `SITE_NAME` may still be supported.
- Public-site values should not be included unless a self-hoster explicitly opts
  in by setting their own environment values.
- Hosted-only content pages and their navigation should not be shipped through
  the generic Docker runtime.

## Workflow Model

### Hosted deployment

The production deployment workflow builds the static artifact with hosted
environment configuration values. The workflow is responsible for passing the
public-site branding and SEO variables into `npm run build`.

The hosted deployment workflow should run for both:

- tagged app releases, such as `v1.2.3`
- changes merged to `main` under `content/articulos/**`

Content-only deployments should rebuild and redeploy the hosted static artifact
but must not publish a new Docker image or require a new app tag. The deployed
hosted site can therefore combine the current app code from `main` with the
latest article content.

### GHCR Docker release

The image release workflow builds directly from the generic source tree. It does
not consume hosted-site branding variables and does not depend on the generated
`dist/` artifact.

The Docker release workflow should remain tag-driven only. A content-only
change must not trigger GHCR publishing, because hosted articles are not part of
the self-hosted runtime contract.

## Version Stamp

Build artifacts expose a version stamp in the footer of the site.

- If the build runs from a tagged commit, the tag becomes the visible version.
- If the build runs from an untagged commit, the short git SHA becomes the
  visible version.
- `npm run build` resolves that version when generating `dist/build-meta.js`.

This applies to both:

- `npm run build` output in `dist/`
- Docker images built from the repository

Content-only hosted deployments do not create a new app version. They redeploy
the hosted static artifact using the app revision selected by the workflow.

## Implementation Notes

- Prefer one config-derivation path in `scripts/build.mjs`.
- Keep defaults generic and safe for self-hosting.
- Avoid duplicating deployment logic across multiple scripts when a shared
  helper can define the canonical site-config shape.
- Keep Docker image publishing isolated from hosted content releases.
