/** Repo subpath when built for GitHub Pages project sites. */
export const BASE_PATH =
  process.env.GITHUB_PAGES === "true" ? "/html-css-selector-extractor-scraper-playground" : "";

export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return `${BASE_PATH}/${path}`;
  return `${BASE_PATH}${path}`;
}
