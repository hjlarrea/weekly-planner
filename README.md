# Weekly Planner

Small internal weekly planner for family activities and commuting blocks.

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

## Docker

```bash
docker compose up --build
```

Then open `http://localhost:4173`.

## Notes

- No backend is required.
- Data stays in the browser unless you export/import JSON.
- If you later want SQLite, the current structure is a good base for adding a tiny API layer.
