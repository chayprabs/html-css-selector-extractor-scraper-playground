# HTML Extractor — Product Overview

## What it is

A browser-only playground for pasting HTML, running a CSS selector, and extracting matched content as outerHTML, innerHTML, text, or attribute values. Nothing is sent to a server.

## Core workflow

1. Paste HTML (or upload / drag a file).
2. Enter a CSS selector and click **Extract** (or wait for debounced auto-extract).
3. Review combined output or browse **Per match** cards.
4. Copy, download, or export (JSON / CSV / TXT).
5. Share the workspace via URL hash (compressed state).

## Features

| Area | Behavior |
|------|----------|
| Extraction modes | outerHTML, innerHTML, textContent, attribute |
| Pre-processing | Strip elements by selector list; rewrite relative `href`/`src` with base URL |
| Output | Pretty-print HTML (size-capped); syntax highlighting (display-capped) |
| Preview | Sandboxed iframe preview of pasted HTML (scripts disabled) |
| Limits | 512 KB HTML, selector length, 2k matches materialized (full count shown) |
| History | Last extractions in `localStorage` (selector + options + preview) |
| PWA | Installable static export; offline after first load |
| Worker | Extraction off main thread with DOMParser polyfill in worker |

## Privacy

All processing runs locally. Share links encode state in the URL fragment on the client. History is stored only in the browser.

## Deployment

Static export (`output: "export"`) for GitHub Pages. Set `GITHUB_PAGES=true` at build time for project-site `basePath`.
