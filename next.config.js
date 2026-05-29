const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: { maxEntries: 64, maxAgeSeconds: 86400 },
      },
    },
  ],
});

const repoBasePath =
  process.env.GITHUB_PAGES === "true" ? "/html-css-selector-extractor-scraper-playground" : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  ...(repoBasePath ? { basePath: repoBasePath, assetPrefix: repoBasePath } : {}),
};

module.exports = withPWA(nextConfig);
