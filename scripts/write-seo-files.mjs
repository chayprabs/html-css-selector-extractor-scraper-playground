import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

const basePath =
  process.env.GITHUB_PAGES === "true" ? "/html-css-selector-extractor-scraper-playground" : "";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? "https://chaitanyaprabuddha.com" : "http://localhost:3000")
).replace(/\/$/, "");

const paths = [`${basePath}/`, `${basePath}/privacy/`, `${basePath}/terms/`];

fs.writeFileSync(
  path.join(publicDir, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
);

const urlEntries = paths
  .map(
    (p) =>
      `  <url>\n    <loc>${siteUrl}${p === `${basePath}/` ? "/" : p.replace(basePath, "")}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${p.endsWith(`${basePath}/`) || p === `${basePath}/` ? "1.0" : "0.5"}</priority>\n  </url>`,
  )
  .join("\n");

// Sitemap locs: siteUrl already includes base path when set for Pages deploy
const sitemapLocs = [
  { loc: `${siteUrl}/`, priority: "1.0" },
  { loc: `${siteUrl}/privacy/`, priority: "0.5" },
  { loc: `${siteUrl}/terms/`, priority: "0.5" },
];

const sitemapEntries = sitemapLocs
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
  )
  .join("\n");

fs.writeFileSync(
  path.join(publicDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
);

const manifestPath = path.join(publicDir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.start_url = `${basePath}/`;
manifest.background_color = "#fafafa";
manifest.theme_color = "#7c3aed";
manifest.icons = manifest.icons.map((icon) => ({
  ...icon,
  src: icon.src.startsWith(basePath) ? icon.src : `${basePath}${icon.src}`,
}));
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
