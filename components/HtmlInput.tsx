"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import SampleLoader from "./SampleLoader";
import { LIMITS, formatBytes, type LimitViolation } from "@/lib/limits";

type HtmlInputProps = {
  html: string;
  onHtmlChange: (value: string) => void;
  onClear: () => void;
  violations?: LimitViolation[];
};

/**
 * Left panel: textarea with line numbers for pasting HTML.
 * Includes sample loader dropdown, byte counter, and paste guard.
 */
export default function HtmlInput({ html, onHtmlChange, onClear, violations }: HtmlInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Compute line count for the gutter
  const lineCount = useMemo(() => {
    if (!html) return 1;
    return html.split("\n").length;
  }, [html]);

  // Compute byte size for the counter
  const byteSize = useMemo(() => {
    return new TextEncoder().encode(html).length;
  }, [html]);

  // Color code the byte counter
  const byteSizeColor = useMemo(() => {
    if (byteSize > 1.5 * 1024 * 1024) return "text-red-400";
    if (byteSize > 500 * 1024) return "text-yellow-400";
    return "text-[#777]";
  }, [byteSize]);

  // Sync line number scroll position with textarea scroll
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Block pastes that exceed the size limit
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pastedText = e.clipboardData.getData("text");
      const pastedBytes = new TextEncoder().encode(pastedText).length;

      if (pastedBytes > LIMITS.HTML_MAX_BYTES) {
        e.preventDefault();
        setPasteError(`Pasted content exceeds 2MB limit (${formatBytes(pastedBytes)}).`);
        setTimeout(() => setPasteError(null), 4000);
      } else {
        setPasteError(null);
      }
    },
    [],
  );

  // Get first violation to display
  const displayViolation = violations?.find((v) => v.severity === "block") ?? violations?.[0];

  return (
    <div className="flex flex-col h-full bg-[#141414] rounded-lg border border-[#222] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#222] shrink-0">
        <span className="text-xs font-sans text-[#888] uppercase tracking-wider">
          HTML Input
        </span>
        <div className="flex items-center gap-2">
          <SampleLoader onLoad={onHtmlChange} />
          <button
            onClick={onClear}
            aria-label="Clear HTML"
            className="px-2.5 py-1 text-xs bg-[#1e1e1e] text-[#888] border border-[#333] rounded hover:text-[#ccc] hover:border-[#555] transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Editor area with line numbers */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Line numbers gutter */}
        <div
          ref={lineNumbersRef}
          className="w-12 shrink-0 bg-[#111] border-r border-[#222] overflow-hidden select-none pt-3 text-right pr-2"
          aria-hidden="true"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="text-[#666] text-xs font-mono leading-[1.65] h-[1.65em]">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={html}
          onChange={(e) => onHtmlChange(e.target.value)}
          onPaste={handlePaste}
          onScroll={handleScroll}
          placeholder="Paste your HTML here..."
          aria-label="HTML input"
          spellCheck={false}
          className="flex-1 p-3 bg-transparent text-[#e5e5e5] font-mono text-sm leading-[1.65] resize-none outline-none placeholder:text-[#444] min-h-0"
        />
      </div>

      {/* Footer with byte counter and violations */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#222] shrink-0 gap-2">
        <div className="flex-1 min-w-0">
          {pasteError && (
            <span className="text-[10px] text-red-400 font-mono truncate block">{pasteError}</span>
          )}
          {!pasteError && displayViolation && (
            <span
              className={`text-[10px] font-mono truncate block ${
                displayViolation.severity === "block" ? "text-red-400" : "text-yellow-400"
              }`}
            >
              {displayViolation.message}
            </span>
          )}
        </div>
        <span className={`text-[10px] font-mono shrink-0 ${byteSizeColor}`}>
          {formatBytes(byteSize)} / {formatBytes(LIMITS.HTML_MAX_BYTES)}
        </span>
      </div>
    </div>
  );
}
