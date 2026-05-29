import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { AUTHOR_URL, GITHUB_REPO_URL, SITE_NAME, SITE_URL, X_URL } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — CSS selector scraper playground`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Paste HTML, write a CSS selector, and copy structured output. Extract text, attributes, and elements in your browser — free, private, no server.",
  keywords: [
    "HTML extractor",
    "CSS selector",
    "web scraping",
    "HTML parser",
    "selector playground",
    "scraper",
  ],
  authors: [{ name: "Chaitanya Prabuddha", url: AUTHOR_URL }],
  creator: "Chaitanya Prabuddha",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — CSS selector scraper playground`,
    description:
      "Paste HTML, write a CSS selector, and copy structured output. Runs entirely in your browser.",
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — CSS selector scraper playground`,
    description:
      "Paste HTML, write a CSS selector, and copy structured output. Runs entirely in your browser.",
    creator: "@chayprabs",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  other: {
    "github-repo": GITHUB_REPO_URL,
    "author-x": X_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none';"
        />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <AppErrorBoundary>
          {children}
        </AppErrorBoundary>
      </body>
    </html>
  );
}
