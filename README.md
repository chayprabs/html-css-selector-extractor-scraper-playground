# HTML Extractor

Extract content from any HTML using CSS selectors. Runs entirely in your browser — no server, no setup, no data sent anywhere.

## Features

- CSS selector matching with sandboxed live HTML preview
- Extract outerHTML, innerHTML, text, or a named attribute
- Per-match and combined output views
- Pretty-print and syntax-highlighted display (with size caps)
- Strip elements before querying; rewrite relative URLs with a base URL
- Shareable workspace links (URL hash), sample presets, keyboard shortcuts
- File upload and drag-and-drop for HTML
- PWA / offline-capable static export

See [docs/PRODUCT.md](docs/PRODUCT.md) for a full product overview.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Production static export |
| `npm run smoke` | CLI smoke test |

## Tech

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Web Worker extraction engine with `linkedom` DOMParser polyfill in workers
- Vitest + jsdom for tests

## Deploy

GitHub Pages: enable **Pages → Build and deployment → GitHub Actions**, then push to `main`. The deploy workflow sets `GITHUB_PAGES=true` for the correct `basePath`.
