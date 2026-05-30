import type { Metadata } from "next";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy — HTML Extractor",
  description: "How HTML Extractor handles your data (nothing leaves your browser).",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-800">
      <TopBar />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-12 text-sm leading-relaxed sm:px-6">
        <h1 className="text-xl font-semibold text-neutral-900">Privacy</h1>
        <p className="text-neutral-500">Last updated: May 2026 — HTML Extractor is a static client-side tool.</p>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-neutral-900">Data we collect</h2>
          <p>
            HTML Extractor collects nothing. When you paste HTML into the tool, it is processed entirely within your
            browser using native browser APIs. No HTML content, CSS selectors, or extraction results are transmitted to
            a server, stored in any database, or shared with any third party.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-neutral-900">Analytics</h2>
          <p>None. There are no analytics scripts, tracking pixels, or telemetry in this application.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-neutral-900">localStorage and URL state</h2>
          <p>
            If you use the share-link feature, your workspace may be encoded into the URL hash entirely in your browser.
            Separately, the app may save a short list of recent extractions in <code className="font-mono text-xs">localStorage</code>{" "}
            (selector, options, match count, and a small HTML preview snippet — not your full HTML). You can clear this
            list from the history panel or by clearing site data for this origin.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-neutral-900">Service worker</h2>
          <p>
            Offline support uses a service worker that caches static application files (JavaScript, CSS, icons). It does
            not cache your HTML input, selectors, or extraction results.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-neutral-900">Contact</h2>
          <p>
            Questions about this notice:{" "}
            <a className="text-[#7c3aed] hover:underline" href="mailto:hi@chaitanyaprabuddha.com">
              hi@chaitanyaprabuddha.com
            </a>
          </p>
        </section>

        <p>
          <Link href="/" className="text-[#7c3aed] hover:underline">
            ← Back to HTML Extractor
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
