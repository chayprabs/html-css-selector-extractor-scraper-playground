"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import CopyButton from "./CopyButton";
import type { ExtractorOutput } from "@/lib/extractor";
import type { ProcessingState } from "@/types/processing";
import type { ExtractionMode } from "@/types/options";
import { exportAsJson, exportAsCsv, exportAsText } from "@/lib/exporters";
import { highlightHtml, highlightText } from "@/lib/highlight";
import { LIMITS } from "@/lib/limits";

type OutputPanelProps = {
  output: ExtractorOutput | null;
  mode: ExtractionMode;
  processingState: ProcessingState;
};

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
  URL.revokeObjectURL(url);
}

function prdDownloadFilename(mode: ExtractionMode): { name: string; mime: string } {
  if (mode === "outerHTML" || mode === "innerHTML") {
    return { name: "extracted.html", mime: "text/html;charset=utf-8" };
  }
  return { name: "extracted.txt", mime: "text/plain;charset=utf-8" };
}

/**
 * PRD §6.4 — combined output, truncation notice, syntax highlight cap.
 */
export default function OutputPanel({ output, mode, processingState }: OutputPanelProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const joined = output?.joinedOutput ?? "";

  const { displayText, truncated, highlighted } = useMemo(() => {
    if (!joined) return { displayText: "", truncated: false, highlighted: "" };

    const trunc = joined.length > LIMITS.OUTPUT_DISPLAY_MAX_CHARS;
    const displayText = trunc ? joined.slice(0, LIMITS.OUTPUT_DISPLAY_MAX_CHARS) : joined;

    const useMarkup =
      (mode === "outerHTML" || mode === "innerHTML") && displayText.length <= LIMITS.HIGHLIGHT_MAX_CHARS;

    const highlighted = useMarkup ? highlightHtml(displayText) : highlightText(displayText);

    return { displayText, truncated: trunc, highlighted };
  }, [joined, mode]);

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

  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExportOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [exportOpen]);

  const handlePrdDownload = () => {
    if (!joined) return;
    const { name, mime } = prdDownloadFilename(mode);
    downloadBlob(joined, name, mime);
  };

  const handleExport = (format: "json" | "csv" | "txt") => {
    if (!output?.matches.length) return;
    const opts = { mode, includeIndex: true as const };
    switch (format) {
      case "json":
        exportAsJson(output.matches, opts);
        break;
      case "csv":
        exportAsCsv(output.matches, opts);
        break;
      case "txt":
        exportAsText(output.matches, opts);
        break;
    }
    setExportOpen(false);
  };

  const matchLabel =
    output && output.matchCount === 1 ? "1 match" : output ? `${output.matchCount} matches` : "";

  return (
    <div className="flex flex-col h-full bg-[#141414] rounded-lg border border-[#222] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#222] shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-sans text-[#888] uppercase tracking-wider">Output</span>
          {processingState === "processing" && (
            <span className="text-[10px] text-[#7c3aed] font-mono animate-pulse">Processing...</span>
          )}
          {output && !output.error && processingState !== "timeout" && (
            <span className="text-[11px] text-[#666] font-mono">{matchLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {output && joined.length > 0 && !output.error && (
            <>
              <button
                type="button"
                onClick={handlePrdDownload}
                className="px-2.5 py-1 text-xs bg-[#1e1e1e] text-[#888] border border-[#333] rounded hover:text-[#ccc] hover:border-[#555] transition-colors"
              >
                Download
              </button>
              <div ref={exportRef} className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen(!exportOpen)}
                  aria-expanded={exportOpen}
                  className="px-2.5 py-1 text-xs bg-[#1e1e1e] text-[#888] border border-[#333] rounded hover:text-[#ccc] hover:border-[#555] transition-colors"
                >
                  Export &#x25BE;
                </button>
                {exportOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 w-40 bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden z-50"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleExport("json")}
                      className="w-full text-left px-3 py-2 text-xs text-[#e5e5e5] hover:bg-[#252525] border-b border-[#222]"
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleExport("csv")}
                      className="w-full text-left px-3 py-2 text-xs text-[#e5e5e5] hover:bg-[#252525] border-b border-[#222]"
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleExport("txt")}
                      className="w-full text-left px-3 py-2 text-xs text-[#e5e5e5] hover:bg-[#252525]"
                    >
                      TXT
                    </button>
                  </div>
                )}
              </div>
              <CopyButton text={joined} label="Copy" />
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {output?.warning && (
          <div className="mb-3 px-3 py-2 bg-yellow-950/40 border border-yellow-600/30 rounded text-xs text-yellow-400 font-mono">
            {output.warning}
          </div>
        )}

        {output?.error && (
          <div className="mb-3 px-3 py-2 bg-red-950/40 border border-red-500/30 rounded text-xs text-red-400 font-mono">
            {output.error}
          </div>
        )}

        {processingState === "timeout" && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8">
            <p className="text-sm text-red-400 font-medium mb-2">Extraction timed out</p>
            <p className="text-xs text-[#888]">Try a simpler selector or a smaller HTML snippet.</p>
          </div>
        )}

        {!output && processingState !== "timeout" && processingState !== "processing" && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <p className="text-sm text-[#777]">Paste HTML and enter a selector to begin.</p>
          </div>
        )}

        {processingState === "processing" && !output && (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-8 h-8 border-2 border-[#7c3aed]/30 border-t-[#7c3aed] rounded-full animate-spin mb-4" />
            <p className="text-sm text-[#777]">Processing...</p>
          </div>
        )}

        {output && output.matchCount === 0 && !output.error && processingState !== "timeout" && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <p className="text-sm text-[#777]">No elements matched this selector.</p>
          </div>
        )}

        {output && joined.length > 0 && !output.error && processingState !== "timeout" && (
          <div className="space-y-2">
            {truncated && (
              <div className="text-xs text-yellow-400 font-mono px-1">
                Output is large — showing first {LIMITS.OUTPUT_DISPLAY_MAX_CHARS.toLocaleString()} characters.
                Download for the full result.
              </div>
            )}
            {displayText.length > LIMITS.HIGHLIGHT_MAX_CHARS && (
              <div className="text-[10px] text-[#888] font-mono px-1">
                Syntax highlighting skipped — output over {LIMITS.HIGHLIGHT_MAX_CHARS.toLocaleString()} characters.
              </div>
            )}
            <pre className="p-3 bg-[#111] border border-[#222] rounded-lg overflow-x-auto text-xs leading-relaxed font-mono whitespace-pre-wrap break-words">
              <code dangerouslySetInnerHTML={{ __html: highlighted }} />
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
