"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import SampleLoader from "./SampleLoader";
import { LIMITS, formatBytes, type LimitViolation } from "@/lib/limits";
import type { ExtractorOptions } from "@/types/options";

type HtmlInputProps = {
  html: string;
  onHtmlChange: (value: string) => void;
  onClear: () => void;
  violations?: LimitViolation[];
  onLoadPreset?: (html: string, selector: string, options: ExtractorOptions) => void;
};

export default function HtmlInput({ html, onHtmlChange, onClear, violations, onLoadPreset }: HtmlInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const lineCount = useMemo(() => (html ? html.split("\n").length : 1), [html]);
  const byteSize = useMemo(() => new TextEncoder().encode(html).length, [html]);

  const byteSizeColor = useMemo(() => {
    if (byteSize > LIMITS.HTML_MAX_BYTES) return "text-red-600";
    if (byteSize > LIMITS.HTML_WARN_BYTES) return "text-amber-600";
    return "text-neutral-500";
  }, [byteSize]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pastedText = e.clipboardData.getData("text");
      const textarea = e.currentTarget;
      const start = textarea.selectionStart ?? html.length;
      const end = textarea.selectionEnd ?? html.length;
      const nextHtml = html.slice(0, start) + pastedText + html.slice(end);
      if (new TextEncoder().encode(nextHtml).length > LIMITS.HTML_MAX_BYTES) {
        e.preventDefault();
        setPasteError(`Input exceeds the 512 KB limit.`);
        setTimeout(() => setPasteError(null), 4000);
      } else {
        setPasteError(null);
      }
    },
    [html],
  );

  const displayViolation = violations?.find((v) => v.severity === "block") ?? violations?.[0];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">HTML input</span>
        <div className="flex items-center gap-2">
          {onLoadPreset ? <SampleLoader onLoad={onLoadPreset} /> : null}
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear HTML"
            className="rounded border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          ref={lineNumbersRef}
          className="w-10 shrink-0 select-none overflow-hidden border-r border-neutral-200 bg-neutral-50 pt-3 pr-2 text-right"
          aria-hidden="true"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="h-[1.65em] font-mono text-xs leading-[1.65] text-neutral-400">
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={html}
          onChange={(e) => onHtmlChange(e.target.value)}
          onPaste={handlePaste}
          onScroll={handleScroll}
          placeholder="Paste your HTML here…"
          aria-label="HTML input"
          spellCheck={false}
          className="min-h-0 flex-1 resize-none bg-white p-3 font-mono text-sm leading-[1.65] text-neutral-900 outline-none placeholder:text-neutral-400"
        />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-neutral-200 px-3 py-1.5">
        <div className="min-w-0 flex-1">
          {pasteError && <span className="block truncate font-mono text-[10px] text-red-600">{pasteError}</span>}
          {!pasteError && displayViolation && (
            <span
              className={`block truncate font-mono text-[10px] ${
                displayViolation.severity === "block" ? "text-red-600" : "text-amber-600"
              }`}
            >
              {displayViolation.message}
            </span>
          )}
        </div>
        <span className={`shrink-0 font-mono text-[10px] ${byteSizeColor}`}>
          {formatBytes(byteSize)} / {formatBytes(LIMITS.HTML_MAX_BYTES)}
        </span>
      </div>
    </div>
  );
}
