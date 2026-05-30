"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import SampleLoader from "./SampleLoader";
import HtmlPreview from "./HtmlPreview";
import { LIMITS, formatBytes, type LimitViolation } from "@/lib/limits";
import type { ExtractorOptions } from "@/types/options";

type HtmlInputProps = {
  html: string;
  onHtmlChange: (value: string) => void;
  onClear: () => void;
  violations?: LimitViolation[];
  onLoadPreset?: (html: string, selector: string, options: ExtractorOptions) => void;
  matchCount?: number | null;
};

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export default function HtmlInput({
  html,
  onHtmlChange,
  onClear,
  violations,
  onLoadPreset,
  matchCount = null,
}: HtmlInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  const lineCount = useMemo(() => (html ? html.split("\n").length : 1), [html]);
  const byteSize = useMemo(() => new TextEncoder().encode(html).length, [html]);

  const byteSizeColor = useMemo(() => {
    if (byteSize > LIMITS.HTML_MAX_BYTES) return "text-red-600";
    if (byteSize > LIMITS.HTML_WARN_BYTES) return "text-amber-600";
    return "text-neutral-500";
  }, [byteSize]);

  const applyText = useCallback(
    (text: string) => {
      const bytes = new TextEncoder().encode(text).length;
      if (bytes > LIMITS.HTML_MAX_BYTES) {
        setPasteError(`Input exceeds the 512 KB limit (${formatBytes(bytes)}).`);
        setTimeout(() => setPasteError(null), 4000);
        return;
      }
      setPasteError(null);
      onHtmlChange(text);
    },
    [onHtmlChange],
  );

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
      const nextBytes = new TextEncoder().encode(nextHtml).length;

      if (nextBytes > LIMITS.HTML_MAX_BYTES) {
        e.preventDefault();
        setPasteError(`Input exceeds the 512 KB limit (${formatBytes(nextBytes)} total).`);
        setTimeout(() => setPasteError(null), 4000);
      } else {
        setPasteError(null);
      }
    },
    [html],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.includes("html") && !file.name.match(/\.(html?|xml|txt)$/i)) {
        setPasteError("Please upload an HTML, XML, or text file.");
        setTimeout(() => setPasteError(null), 4000);
        return;
      }
      try {
        const text = await readFileAsText(file);
        applyText(text);
      } catch {
        setPasteError("Could not read file.");
        setTimeout(() => setPasteError(null), 4000);
      }
    },
    [applyText],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const displayViolation = violations?.find((v) => v.severity === "block") ?? violations?.[0];

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-colors ${
        dragOver ? "border-blue-400 ring-2 ring-blue-100" : "border-neutral-200"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">HTML input</span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm,.xml,.txt,text/html,text/plain"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
          >
            Upload file
          </button>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="rounded border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
          >
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
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

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2">
        <div className="flex min-h-[140px] flex-1 overflow-hidden">
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
            placeholder="Paste HTML here, drag a file, or upload…"
            aria-label="HTML input"
            spellCheck={false}
            className="min-h-0 flex-1 resize-none bg-white p-2 font-mono text-sm leading-[1.65] text-neutral-900 outline-none placeholder:text-neutral-400"
          />
        </div>
        {showPreview && <HtmlPreview html={html} matchCount={matchCount} />}
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
