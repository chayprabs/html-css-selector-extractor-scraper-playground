# HTML Extractor

Extract content from any HTML using CSS selectors.
Runs entirely in your browser — no server, no setup, no data sent anywhere.

**Repository:** [github.com/chayprabs/html-css-selector-extractor-scraper-playground](https://github.com/chayprabs/html-css-selector-extractor-scraper-playground)

## Features

- CSS selector matching with live preview
- Extract specific attributes from matched elements
- Text-only output mode
- Pretty-print and format HTML output
- Strip unwanted elements before querying
- Rewrite relative URLs with a custom base
- Handles broken and malformed HTML gracefully

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

Set `NEXT_PUBLIC_SITE_URL` when building for production so `robots.txt`, `sitemap.xml`, and Open Graph URLs resolve correctly.

## Tech

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS

## Links

- [GitHub](https://github.com/chayprabs/html-css-selector-extractor-scraper-playground)
- [@chayprabs on X](https://x.com/chayprabs)
- [chaitanyaprabuddha.com](https://chaitanyaprabuddha.com)
