import Link from "next/link";
import { AUTHOR_URL, GITHUB_REPO_URL, SITE_NAME, X_URL } from "@/lib/site";

const externalLinkClass = "text-[#888] hover:text-[#ccc] transition-colors";

export default function TopBar() {
  return (
    <header className="shrink-0 border-b border-[#222] bg-[#0d0d0d] px-4 py-2">
      <div className="flex items-center justify-between gap-3 max-w-[1800px] mx-auto">
        <Link href="/" className="text-sm font-semibold text-[#e5e5e5] hover:text-white transition-colors">
          {SITE_NAME}
        </Link>
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono" aria-label="External links">
          <a href={GITHUB_REPO_URL} className={externalLinkClass} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href={X_URL} className={externalLinkClass} target="_blank" rel="noopener noreferrer">
            @chayprabs
          </a>
          <a href={AUTHOR_URL} className={externalLinkClass} target="_blank" rel="noopener noreferrer">
            chaitanyaprabuddha.com
          </a>
        </nav>
      </div>
    </header>
  );
}
