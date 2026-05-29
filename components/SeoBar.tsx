"use client";

/**
 * Visible hero copy for SEO and first paint (client page has no server metadata body).
 */
export default function SeoBar() {
  return (
    <section className="shrink-0 border-b border-[#e5e5e5] bg-white px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-[1600px]">
        <h1 className="font-sans text-lg font-semibold text-[#171717] sm:text-xl">
          Extract HTML with CSS selectors
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[#737373] leading-relaxed">
          Paste HTML, choose a selector, and get structured output — text, attributes, or markup. Runs entirely in your
          browser.
        </p>
      </div>
    </section>
  );
}
