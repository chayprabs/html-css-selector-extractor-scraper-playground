"use client";

type HtmlPreviewProps = {
  html: string;
  matchCount: number | null;
};

/**
 * Sandboxed rendered preview of pasted HTML (no scripts executed).
 */
export default function HtmlPreview({ html, matchCount }: HtmlPreviewProps) {
  if (!html.trim()) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-xs text-neutral-500">
        Paste HTML above to see a live preview.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[10px] text-neutral-500">
        <span>Rendered preview (scripts disabled)</span>
        {matchCount !== null && (
          <span className="font-mono text-blue-700">
            {matchCount} match{matchCount !== 1 ? "es" : ""} in document
          </span>
        )}
      </div>
      <iframe
        title="HTML preview"
        sandbox=""
        srcDoc={html}
        className="h-44 w-full rounded-lg border border-neutral-200 bg-white"
      />
    </div>
  );
}
