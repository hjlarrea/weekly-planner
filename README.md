# Weekly Planner

Small internal weekly planner for family activities and commuting blocks.

## Introduction

This project is a simple weekly planner designed to get out of your way and let you focus on organizing your life. It follows a philosophy similar to Excalidraw—fully browser-based, lightweight, and instantly usable—while still supporting self-hosting for those who want full control. The goal is straightforward: enable anyone to plan their week without friction, no accounts, no setup, just open it and start planning.

## Features

- Two block types: `activity` and `transport`
- Color-coded by the main person each block belongs to
- Weekly calendar view rendered as SVG
- Export to `SVG`, `PNG`, or browser print/PDF
- Lightweight local persistence with `localStorage`
- JSON import/export for easy backup or sharing

## Run

```bash
npm start
```

Then open `http://localhost:4173`.

## Build

Generate a static output folder with the files needed to deploy or serve the app:

```bash
npm run build
```

This creates `dist/` with the runtime assets:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `build-meta.js`
- `manifest.json`
- `sw.js`
- `icons/`
- `img/`

The `dist/` folder is ignored by git.

### Build Version Stamp

Build artifacts expose a version stamp in the footer of the site.

- If the build runs from a tagged commit, the tag becomes the visible version.
- If the build runs from an untagged commit, the short git SHA becomes the visible version.

This applies to both:

- `npm run build` output in `dist/`
- Docker images built from the repository

## Docker

```bash
docker compose up --build
```

Then open `http://localhost:4173`.

## License

This project is licensed under the Apache License 2.0. Any redistribution must
preserve the license text and applicable attribution notices.

## Notes

- No backend is required.
- Data stays in the browser unless you export/import JSON.
- `npm start` serves the source files directly for a simple local preview.
- `npm run build` prepares a static `dist/` directory for deployment or external hosting.
