#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

cat > lib/site.ts << 'EOF'
export const SITE_NAME = "HTML Extractor";
export const GITHUB_REPO_URL = "https://github.com/chayprabs/html-css-selector-extractor-scraper-playground";
export const X_URL = "https://x.com/chayprabs";
export const AUTHOR_URL = "https://chaitanyaprabuddha.com";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? "https://chaitanyaprabuddha.com" : "http://localhost:3000");
EOF

# TopBar, SeoBar, SiteFooter — see components/*.tsx in repo after apply
for f in TopBar SeoBar SiteFooter; do
  test -f "components/${f}.tsx" || echo "missing components/${f}.tsx"
done

rm -f components/FooterNotice.tsx
rm -rf app/credits

node scripts/write-seo-files.mjs 2>/dev/null || true

echo "Run full apply via parent agent — components must exist"
