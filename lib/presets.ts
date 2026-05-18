import { defaultOptions, type ExtractorOptions } from "@/types/options";

export type Preset = {
  id: string;
  name: string;
  description: string;
  html: string;
  selector: string;
  options: ExtractorOptions;
};

/** PRD §6.5 minimum presets + default workspace (first entry). */
export const prdPresets: Preset[] = [
  {
    id: "extract-links",
    name: "Extract all links",
    description: "Sample page — attribute href",
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>Sample page</title></head>
<body>
  <header><a href="/">Home</a> · <a href="/blog">Blog</a></header>
  <main>
    <p>Read our <a href="/docs/guide">guide</a> or visit <a href="https://example.org/help">help</a>.</p>
  </main>
  <footer><a href="/privacy">Privacy</a></footer>
</body>
</html>`,
    selector: "a[href]",
    options: {
      ...defaultOptions,
      mode: "attribute",
      attributeName: "href",
    },
  },
  {
    id: "heading-text",
    name: "Extract heading text",
    description: "Sample article — textContent",
    html: `<article>
  <h1>Introducing HTML Extractor</h1>
  <p class="lead">A browser-only playground for selectors.</p>
  <h2>Why use it?</h2>
  <p>Fast feedback without a server.</p>
  <h3>Details</h3>
  <p>Malformed HTML is handled like a browser.</p>
</article>`,
    selector: "h1, h2, h3",
    options: {
      ...defaultOptions,
      mode: "textContent",
    },
  },
  {
    id: "strip-nav-body",
    name: "Strip nav, get body",
    description: "Remove chrome — text from paragraphs",
    html: `<body>
  <nav><a href="/">Nav link</a></nav>
  <main><p>First paragraph.</p><p>Second paragraph.</p></main>
  <footer>Footer text</footer>
  <script>/* noise */</script>
  <style>body{}</style>
</body>`,
    selector: "p",
    options: {
      ...defaultOptions,
      mode: "textContent",
      stripSelectors: "nav, footer, script, style",
    },
  },
  {
    id: "pretty-div",
    name: "Pretty-print a div",
    description: "Fragment — outerHTML + pretty",
    html: `<div class="content"><p><span class="x">Hello</span><strong>world</strong></p></div>`,
    selector: "div.content",
    options: {
      ...defaultOptions,
      mode: "outerHTML",
      prettyPrint: true,
    },
  },
  {
    id: "rewrite-urls",
    name: "Rewrite relative URLs",
    description: "Base URL + absolute href attributes",
    html: `<section>
  <a href="/products/1">Product</a>
  <a href="/cart">Cart</a>
</section>`,
    selector: "a",
    options: {
      ...defaultOptions,
      mode: "attribute",
      attributeName: "href",
      baseUrl: "https://example.com",
    },
  },
  {
    id: "image-src",
    name: "Extract image sources",
    description: "img[src]",
    html: `<div class="gallery">
  <img src="/media/photo-1.jpg" alt="One" />
  <img src="/media/photo-2.jpg" alt="Two" />
</div>`,
    selector: "img",
    options: {
      ...defaultOptions,
      mode: "attribute",
      attributeName: "src",
    },
  },
  {
    id: "table-rows",
    name: "Extract table rows",
    description: "tr innerHTML",
    html: `<table>
  <thead><tr><th>Name</th><th>Role</th></tr></thead>
  <tbody>
    <tr><td>Ada</td><td>Dev</td></tr>
    <tr><td>Bob</td><td>QA</td></tr>
  </tbody>
</table>`,
    selector: "tr",
    options: {
      ...defaultOptions,
      mode: "innerHTML",
    },
  },
  {
    id: "meta-content",
    name: "Extract meta tags",
    description: "meta[content]",
    html: `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Demo meta extraction." />
  <title>T</title>
</head><body></body></html>`,
    selector: "meta",
    options: {
      ...defaultOptions,
      mode: "attribute",
      attributeName: "content",
    },
  },
];

export const defaultPreset = prdPresets[0]!;
