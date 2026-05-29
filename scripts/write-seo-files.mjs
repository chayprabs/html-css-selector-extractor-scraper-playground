import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? "https://chaitanyaprabuddha.com" : "http://localhost:3000")
).replace(/\/$/, "");
const paths = ["/", "/privacy/", "/terms/"];

fs.writeFileSync(
  path.join(publicDir, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
);

const urlEntries = paths
  .map(
    (p) =>
      `  <url>\n    <loc>${siteUrl}${p}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${p === "/" ? "1.0" : "0.5"}</priority>\n  </url>`,
  )
  .join("\n");

fs.writeFileSync(
  path.join(publicDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`,
);
