"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import CopyButton from "./CopyButton";
import type { ExtractorOutput, MatchResult } from "@/lib/extractor";
import type { ProcessingState } from "@/types/processing";
import type { ExtractionMode } from "@/types/options";
import { exportAsJson, exportAsCsv, exportAsText } from "@/lib/exporters";
import { highlightHtml, highlightText } from "@/lib/highlight";
import { displayLineForMatch } from "@/lib/matchDisplay";
import { LIMITS } from "@/lib/limits";

type OutputPanelProps = {
  output: ExtractorOutput | null;
  mode: ExtractionMode;
  processingState: ProcessingState;
  attributeName?: string;
  prettyPrint?: boolean;
};

type ViewTab = "combined" | "matches";

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function prdDownloadFilename(mode: ExtractionMode): { name: string; mime: string } {
  if (mode === "outerHTML" || mode === "innerHTML") {
    return { name: "extracted.html", mime: "text/html;charset=utf-8" };
  }
  return { name: "extracted.txt", mime: "text/plain;charset=utf-8" };
}

function MatchCard({
  match,
  line,
  mode,
}: {
  match: MatchResult;
  line: string;
  mode: ExtractionMode;
}) {
  const useMarkup =
    (mode === "outerHTML" || mode === "innerHTML") && line.length <= LIMITS.HIGHLIGHT_MAX_CHARS;
  const highlighted = useMarkup ? highlightHtml(line) : highlightText(line);
  const truncated = line.length > 4000;
  const display = truncated ? line.slice(0, 4000) : line;

  return (
    <article className="animate-[fadeIn_0.2s_ease-out] rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-medium text-neutral-500">#{match.index + 1}</span>
        <CopyButton text={line} label="Copy" className="!py-0.5 !text-[10px]" />
      </div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-neutral-800">
        <code dangerouslySetInnerHTML={{ __html: useMarkup ? highlightHtml(display) : highlightText(display) }} />
      </pre>
      {truncated && <p className="mt-1 text-[10px] text-neutral-500">Truncated — copy for full value.</p>}
    </article>
  );
}

export default function OutputPanel({
  output,
  mode,
  processingState,
  attributeName,
  prettyPrint = false,
}: OutputPanelProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [viewTab, setViewTab] = useState<ViewTab>("combined");
  const exportRef = useRef<HTMLDivElement>(null);

  const joined = output?.joinedOutput ?? "";

  const exportOpts = useMemo(
    () => ({ mode, attributeName, includeIndex: true as const }),
    [mode, attributeName],
  );

  const { displayText, truncated, highlighted } = useMemo(() => {
    if (!joined) return { displayText: "", truncated: false, highlighted: "" };

    const trunc = joined.length > LIMITS.OUTPUT_DISPLAY_MAX_CHARS;
    const displayText = trunc ? joined.slice(0, LIMITS.OUTPUT_DISPLAY_MAX_CHARS) : joined;

    const useMarkup =
      (mode === "outerHTML" || mode === "innerHTML") && displayText.length <= LIMITS.HIGHLIGHT_MAX_CHARS;

    const highlighted = useMarkup ? highlightHtml(displayText) : highlightText(displayText);

    return { displayText, truncated: trunc, highlighted };
  }, [joined, mode]);

  const matchLines = useMemo(() => {
    if (!output?.matches.length) return [];
    return output.matches.map((m) => displayLineForMatch(m, mode, prettyPrint));
  }, [output?.matches, mode, prettyPrint]);

  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  const handlePrdDownload = () => {
    if (!joined) return;
    const { name, mime } = prdDownloadFilename(mode);
    downloadBlob(joined, name, mime);
  };

  const handleExport = (format: "json" | "csv" | "txt") => {
    if (!output?.matches.length) return;
    switch (format) {
      case "json":
        exportAsJson(output.matches, exportOpts);
        break;
      case "csv":
        exportAsCsv(output.matches, exportOpts);
        break;
      case "txt":
        exportAsText(output.matches, exportOpts);
        break;
    }
    setExportOpen(false);
  };

  const matchLabel =
    output && output.matchCount === 1
      ? "1 match"
      : output
        ? `${output.matchCount} matches`
        : "";

  const hasResults = output && output.matchCount > 0 && !output.error;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">Output</span>
          {processingState === "processing" && (
            <span className="animate-pulse font-mono text-[10px] text-blue-600">Processing…</span>
          )}
          {hasResults && <span className="font-mono text-[11px] text-neutral-500">{matchLabel}</span>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasResults && (
            <>
              <button
                type="button"
                onClick={handlePrdDownload}
                className="rounded border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
              >
                Download
              </button>
              <div ref={exportRef} className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen(!exportOpen)}
                  aria-expanded={exportOpen}
                  className="rounded border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
                >
                  Export ▾
                </button>
                {exportOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg"
                  >
                    <button type="button" role="menuitem" onClick={() => handleExport("json")} className="w-full border-b border-neutral-100 px-3 py-2 text-left text-xs hover:bg-neutral-50">
                      JSON
                    </button>
                    <button type="button" role="menuitem" onClick={() => handleExport("csv")} className="w-full border-b border-neutral-100 px-3 py-2 text-left text-xs hover:bg-neutral-50">
                      CSV
                    </button>
                    <button type="button" role="menuitem" onClick={() => handleExport("txt")} className="w-full px-3 py-2 text-left text-xs hover:bg-neutral-50">
                      TXT
                    </button>
                  </div>
                )}
              </div>
              <CopyButton text={joined} label="Copy all" />
            </>
          )}
        </div>
      </div>

      {hasResults && (
        <div className="flex shrink-0 gap-1 border-b border-neutral-200 px-2 py-1.5" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={viewTab === "combined"}
            onClick={() => setViewTab("combined")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              viewTab === "combined" ? "bg-blue-50 text-blue-700" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Combined
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewTab === "matches"}
            onClick={() => setViewTab("matches")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              viewTab === "matches" ? "bg-blue-50 text-blue-700" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Per match ({output!.matches.length})
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {output?.warning && (
          <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-xs text-amber-800">
            {output.warning}
          </div>
        )}

        {output?.error && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-700">
            {output.error}
          </div>
        )}

        {processingState === "timeout" && (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-red-600">Extraction timed out</p>
            <p className="mt-1 text-xs text-neutral-500">Try a simpler selector or smaller HTML.</p>
          </div>
        )}

        {!output && processingState !== "timeout" && processingState !== "processing" && (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-neutral-500">Results appear here after you extract.</p>
          </div>
        )}

        {processingState === "processing" && !output && (
          <div className="flex h-full flex-col items-center justify-center py-12">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            <p className="text-sm text-neutral-500">Processing…</p>
          </div>
        )}

        {output && output.matchCount === 0 && !output.error && processingState !== "timeout" && (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-neutral-500">No elements matched this selector.</p>
          </div>
        )}

        {hasResults && viewTab === "combined" && joined.length > 0 && (
          <div className="space-y-2">
            {truncated && (
              <p className="font-mono text-xs text-amber-700">
                Showing first {LIMITS.OUTPUT_DISPLAY_MAX_CHARS.toLocaleString()} characters. Download for full output.
              </p>
            )}
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs leading-relaxed">
              <code dangerouslySetInnerHTML={{ __html: highlighted }} />
            </pre>
          </div>
        )}

        {hasResults && viewTab === "matches" && (
          <div className="space-y-2">
            {output!.matches.map((m, i) => (
              <MatchCard key={m.index} match={m} line={matchLines[i] ?? ""} mode={mode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
