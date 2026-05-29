/** Canonical external links and site URL for SEO files. */
export const SITE_NAME = "HTML Extractor";

export const GITHUB_REPO_URL =
  "https://github.com/chayprabs/html-css-selector-extractor-scraper-playground";

export const X_URL = "https://x.com/chayprabs";

export const AUTHOR_URL = "https://chaitanyaprabuddha.com";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://chaitanyaprabuddha.com"
    : "http://localhost:3000");
