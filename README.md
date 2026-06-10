[![Release Image](https://github.com/hjlarrea/weekly-planner/actions/workflows/release-image.yml/badge.svg)](https://github.com/hjlarrea/weekly-planner/actions/workflows/release-image.yml)

[![Deploy to Production](https://github.com/hjlarrea/weekly-planner/actions/workflows/deploy-production.yml/badge.svg)](https://github.com/hjlarrea/weekly-planner/actions/workflows/deploy-production.yml)

# Weekly Planner

Small internal weekly planner for family activities and commuting blocks. Visit the official production site at: https://armatusemana.com.ar

## Introduction

This project is a simple weekly planner designed to get out of your way and let you focus on organizing your life. It follows a philosophy similar to Excalidraw—fully browser-based, lightweight, and instantly usable—while still supporting self-hosting for those who want full control. The goal is straightforward: enable anyone to plan their week without friction, no accounts, no setup, just open it and start planning.

## Features

- Two block types: `activity` and `transport`
- Color-coded by the main person each block belongs to
- Weekly calendar view rendered as SVG
- Export to `SVG`, `PNG`, or browser print/PDF
- Lightweight local persistence with `localStorage`
- JSON import/export for easy backup or sharing

## Run - NPM

For a hosted-like local preview from the generated `dist/` artifact, run:

```bash
npm start
```

Then open `http://localhost:4173`.

To serve directly from the source tree without building first, run:

```bash
npm run start:src
```

Use `start:src` when you want a faster source-based preview for testing.

## Tests

Run the full local merge gate with:

```bash
npm run test
```

That command covers:

- unit tests for pure planner and site-configuration logic
- integration tests for hosted build output plus source/dist serving behavior
- browser-driven synthetic tests for `start:src`, `dist`, and Docker variants

The browser suite uses Playwright with the local Chrome executable at
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` by default.
Override it with `PLAYWRIGHT_CHROME_EXECUTABLE_PATH` if needed.

For the Docker variant inside `npm run test`, the local Docker daemon must be
running.

To override the local runtime branding, set one or more site configuration variables before starting either server:

```bash
SITE_NAME="Mi Planner" \
SITE_TITLE="Mi Planner | Organizador semanal" \
SITE_DESCRIPTION="Organiza la semana en una sola vista." \
SITE_MENU_ENABLED="true" \
npm start
```

If these variables are not defined, the app uses the generic self-hosted defaults.

## Build

Generate a static output folder with the files needed to deploy or serve the app:

```bash
npm run build
```

To generate a branded hosted artifact:

```bash
SITE_NAME="Arma tu semana!" \
SITE_TITLE="Arma tu semana! | Planner semanal familiar" \
SITE_DESCRIPTION="Organiza actividades, traslados y rutinas familiares en una vista semanal simple para imprimir o exportar." \
SITE_URL="https://armatusemana.com.ar/" \
SITE_OG_IMAGE="https://armatusemana.com.ar/img/og-image.png" \
SITE_ROBOTS="index,follow" \
SITE_MENU_ENABLED="true" \
npm run build
```

This creates `dist/` with the runtime assets:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `build-meta.js`
- `manifest.json`
- `robots.txt`
- `sitemap.xml` when `SITE_URL` is defined
- `sw.js`
- `icons/`
- `img/`

The `dist/` folder is ignored by git.

The build output is where hosted branding and SEO metadata are generated. The
repository source files remain generic by default.

See [Deployment Model](docs/deployment.md) and
[SEO and Content Model](docs/seo-and-content.md) for the hosted/self-hosted
split and content-only release rules.

Hosted article content lives in `content/articulos/` as Markdown files with
frontmatter. Changes there can redeploy the hosted site without publishing a new
Docker image or cutting a new app tag.

## Docker

```bash
docker compose up --build
```

Then open `http://localhost:4173`.

To override the runtime branding in Docker:

```bash
SITE_NAME="Mi Planner" \
SITE_TITLE="Mi Planner | Organizador semanal" \
SITE_DESCRIPTION="Organiza la semana en una sola vista." \
docker compose up --build
```

The published Docker image remains generic by default so it can be self-hosted
without shipping hosted-site branding or domain-specific SEO values.

## Running from the published image

```bash
docker pull ghcr.io/hjlarrea/weekly-planner:v0.1.0
docker run -d --rm ghcr.io/hjlarrea/weekly-planner:v0.1.0
```

## Version Stamp

Build artifacts expose a version stamp in the footer of the site.

- If the build runs from a tagged commit, the tag becomes the visible version.
- If the build runs from an untagged commit, the short git SHA becomes the visible version.
- `npm run build` resolves that version when generating `dist/build-meta.js`.

This applies to both:

- `npm run build` output in `dist/`
- Docker images built from the repository

## License

This project is licensed under the Apache License 2.0. Any redistribution must
preserve the license text and applicable attribution notices.

## Notes

- No backend is required.
- Data stays in the browser unless you export/import JSON.
- `npm start` builds `dist/` and serves the generated output for a hosted-like preview.
- `npm run start:src` serves the source files directly for a faster source-based preview.
- `npm run build` prepares a static `dist/` directory for deployment or external hosting.
- The project supports one shared site-configuration model across local runtime, hosted builds, and Docker overrides.
- `SITE_NAME` is the app or brand name shown in the UI.
- `SITE_TITLE` is the document title used for the browser tab and hosted SEO metadata.
- `SITE_DESCRIPTION` is the description used for manifest metadata and hosted SEO metadata.
- `SITE_URL` is the canonical public URL used for hosted metadata generation.
- `SITE_OG_IMAGE` is the absolute public URL of the Open Graph image used for hosted sharing metadata.
- `SITE_ROBOTS` controls the hosted robots meta policy, for example `index,follow` or `noindex,nofollow`.
- `SITE_MENU_ENABLED` controls whether the hosted navigation menu, About page, and hosted article pages are available.
- Hosted builds inject SEO metadata into `dist/index.html` and can also generate `robots.txt` and `sitemap.xml`.
- Hosted builds can also generate `/articulos/` plus hosted-only article pages when `SITE_MENU_ENABLED=true`.
- The self-hosted Docker path stays generic unless you explicitly override it with environment variables.
- The self-hosted Docker path does not ship the hosted navigation or article pages.
