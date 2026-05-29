"use client";

import Link from "next/link";

/**
 * App header — light theme.
 */
export default function TopBar() {
  return (
    <header className="shrink-0 border-b border-[#e5e5e5] bg-white">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="font-sans text-sm font-semibold text-[#171717] hover:text-[#7c3aed] transition-colors">
          HTML Extractor
        </Link>
        <nav className="flex items-center gap-4 text-xs font-mono text-[#737373]">
          <Link href="/privacy" className="hover:text-[#171717] transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[#171717] transition-colors">
            Terms
          </Link>
          <Link href="/credits" className="hover:text-[#171717] transition-colors">
            Credits
          </Link>
        </nav>
      </div>
    </header>
  );
}
