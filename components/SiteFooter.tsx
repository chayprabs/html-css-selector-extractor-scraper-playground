"use client";

import Link from "next/link";

/**
 * Site footer — light theme.
 */
export default function SiteFooter() {
  return (
    <footer className="shrink-0 border-t border-[#e5e5e5] bg-white px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] font-mono text-[#a3a3a3]">
          © {new Date().getFullYear()} Chaitanya Prabuddha — MIT License
        </p>
        <div className="flex flex-wrap gap-4 text-xs font-mono text-[#737373]">
          <Link href="/privacy" className="hover:text-[#171717] transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[#171717] transition-colors">
            Terms
          </Link>
          <Link href="/credits" className="hover:text-[#171717] transition-colors">
            Credits
          </Link>
        </div>
      </div>
    </footer>
  );
}
