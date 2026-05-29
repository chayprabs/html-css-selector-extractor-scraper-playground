import type { Metadata } from "next";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import SiteFooter from "@/components/SiteFooter";
import { GITHUB_REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service — HTML Extractor",
  description: "Terms of use for HTML Extractor.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-800">
      <TopBar />
      <main className="flex-1 px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
          <h1 className="text-xl font-semibold">Terms of Service</h1>
          <p className="text-neutral-500">Last updated: May 2026</p>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">Use at your own risk</h2>
            <p>
              HTML Extractor is provided free of charge and as-is, without warranty of any kind, under
              the MIT License.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">No warranty on extraction correctness</h2>
            <p>
              CSS selector evaluation uses your browser&apos;s native selector engine. There is no
              guarantee that extraction results are accurate, complete, or suitable for any purpose.
              Results may vary across browsers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">Acceptable use</h2>
            <p>
              Do not use HTML Extractor to facilitate activities that violate applicable laws. You are
              responsible for the content you paste and for how you use extraction results.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">No sensitive data</h2>
            <p>
              Although pasted HTML is not transmitted to a server by this app, content exists in your
              browser&apos;s memory during the session. Exercise caution with credentials, session tokens,
              or other sensitive values embedded in markup.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">Output safety</h2>
            <p>
              Extraction results may include HTML strings from the source document. Do not render
              extracted HTML as live DOM in other applications without sanitizing it first.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">Open source</h2>
            <p>
              Source code is available on{" "}
              <a
                href={GITHUB_REPO_URL}
                className="text-[#a78bfa] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>{" "}
              under the MIT License. Key runtime dependencies include js-beautify (MIT) and Prism.js
              (MIT).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-medium text-white">Changes</h2>
            <p>These terms may be updated at any time. Continued use constitutes acceptance.</p>
          </section>

          <p>
            <Link href="/" className="text-[#a78bfa] hover:underline font-mono text-xs">
              ← Back to HTML Extractor
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
