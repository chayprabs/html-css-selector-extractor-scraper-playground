import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Credits — HTML Extractor",
  description: "Open-source libraries used by HTML Extractor.",
};

export default function CreditsPage() {
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-[#e5e5e5] px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
        <h1 className="text-xl font-semibold">Credits</h1>
        <ul className="space-y-3 list-disc pl-5">
          <li>
            HTML formatting:{" "}
            <a
              href="https://github.com/beautify-web/js-beautify"
              className="text-[#a78bfa] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              js-beautify
            </a>{" "}
            (MIT)
          </li>
          <li>
            Syntax highlighting:{" "}
            <a href="https://prismjs.com" className="text-[#a78bfa] hover:underline" target="_blank" rel="noopener noreferrer">
              Prism.js
            </a>{" "}
            (MIT)
          </li>
          <li>
            Framework:{" "}
            <a href="https://nextjs.org" className="text-[#a78bfa] hover:underline" target="_blank" rel="noopener noreferrer">
              Next.js
            </a>{" "}
            (MIT)
          </li>
        </ul>
        <p className="text-[#888] font-mono text-xs">
          © {new Date().getFullYear()} Chaitanya Prabuddha — MIT License
        </p>
        <p>
          <Link href="/" className="text-[#a78bfa] hover:underline font-mono text-xs">
            ← Back to HTML Extractor
          </Link>
        </p>
      </div>
    </main>
  );
}
