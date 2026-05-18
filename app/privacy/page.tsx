import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — HTML Extractor",
  description: "How HTML Extractor handles your data (nothing leaves your browser).",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-[#e5e5e5] px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
        <h1 className="text-xl font-semibold">Privacy</h1>
        <p className="text-[#888]">
          Last updated: May 2026 — HTML Extractor is a static client-side tool.
        </p>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-white">Data we collect</h2>
          <p>
            HTML Extractor collects nothing. When you paste HTML into the tool, it is processed
            entirely within your browser using native browser APIs. No HTML content, CSS selectors,
            or extraction results are transmitted to a server, stored in any database, or shared with
            any third party.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-white">Cookies</h2>
          <p>
            HTML Extractor does not set any cookies. Your hosting provider or CDN may set short-lived
            security cookies as part of standard network operation. Those are set by the platform,
            not by this application, and do not contain your pasted content.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-white">Analytics</h2>
          <p>None. There are no analytics scripts, tracking pixels, or telemetry in this application.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-white">localStorage and URL state</h2>
          <p>
            Your workspace may be encoded into the URL hash if you use the share-link feature. That
            encoding happens entirely in your browser. This app does not use localStorage to persist
            workspace state between sessions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-white">Service worker</h2>
          <p>
            Offline support uses a service worker that caches static application files (JavaScript,
            CSS, icons). It does not cache your HTML input, selectors, or extraction results.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-white">Contact</h2>
          <p>
            Questions about this notice:{" "}
            <a className="text-[#a78bfa] hover:underline" href="mailto:hi@chaitanyaprabuddha.com">
              hi@chaitanyaprabuddha.com
            </a>
          </p>
        </section>

        <p>
          <Link href="/" className="text-[#a78bfa] hover:underline font-mono text-xs">
            ← Back to HTML Extractor
          </Link>
        </p>
      </div>
    </main>
  );
}
