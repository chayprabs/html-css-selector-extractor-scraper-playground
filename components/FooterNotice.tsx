import Link from "next/link";

/**
 * PRD §14.3 notice + compact legal links (also linked from dedicated pages).
 */
export default function FooterNotice() {
  return (
    <footer className="shrink-0 border-t border-[#222] bg-[#0d0d0d] px-4 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 max-w-[1800px] mx-auto text-[11px] text-[#777]">
        <p className="text-[#9ca3af]">
          Nothing leaves your browser. HTML is parsed and queried locally. No data is sent to any server.
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 font-mono">
          <Link href="/privacy/" className="text-[#a78bfa] hover:underline">
            Privacy
          </Link>
          <Link href="/terms/" className="text-[#a78bfa] hover:underline">
            Terms
          </Link>
          <Link href="/credits/" className="text-[#a78bfa] hover:underline">
            Credits
          </Link>
          <span className="text-[#555]">
            © {new Date().getFullYear()} Chaitanya Prabuddha — MIT License
          </span>
        </nav>
      </div>
    </footer>
  );
}
