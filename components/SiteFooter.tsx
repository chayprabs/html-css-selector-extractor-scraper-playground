import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="shrink-0 border-t border-neutral-200 bg-white px-4 py-4 sm:px-6">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 text-sm text-neutral-600" aria-label="Legal">
        <Link href="/privacy/" className="hover:text-neutral-900 hover:underline">Privacy Policy</Link>
        <Link href="/terms/" className="hover:text-neutral-900 hover:underline">Terms &amp; Conditions</Link>
      </nav>
    </footer>
  );
}
