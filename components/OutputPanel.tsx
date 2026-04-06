"use client";

import { useMemo } from "react";
import CopyButton from "./CopyButton";
import MatchCard from "./MatchCard";
import type { ExtractorOutput } from "@/lib/extractor";
import type { ProcessingState } from "@/types/processing";

type OutputPanelProps = {
  output: ExtractorOutput | null;
  /** Which display mode to use, derived from active options */
  mode: "html" | "text" | "attribute" | "pretty";
  processingState: ProcessingState;
};

/**
 * Right panel: renders matched results as a scrollable list of MatchCards.
 * Shows empty state, no-matches state, processing indicator, timeout/error messages, or results.
 */
export default function OutputPanel({ output, mode, processingState }: OutputPanelProps) {
  // Compute the "copy all" text by joining all visible results
  const allText = useMemo(() => {
    if (!output) return "";
    return output.matches
      .map((m) => {
        switch (mode) {
          case "attribute":
            return m.attribute ?? "";
          case "text":
            return m.text;
          case "pretty":
            return m.pretty ?? m.raw;
          default:
            return m.raw;
        }
      })
      .join("\n\n");
  }, [output, mode]);

  return (
    <div className="flex flex-col h-full bg-[#141414] rounded-lg border border-[#222] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#222] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-sans text-[#888] uppercase tracking-wider">
            Output
          </span>
          {processingState === "processing" && (
            <span className="text-[10px] text-[#7c3aed] font-mono animate-pulse">
              Processing...
            </span>
          )}
        </div>
        {output && output.matches.length > 0 && (
          <CopyButton text={allText} label="Copy all" />
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {/* Warning banner */}
        {output?.warning && (
          <div className="mb-3 px-3 py-2 bg-yellow-950/40 border border-yellow-600/30 rounded text-xs text-yellow-400 font-mono">
            {output.warning}
          </div>
        )}

        {/* Error banner from engine */}
        {output?.error && (
          <div className="mb-3 px-3 py-2 bg-red-950/40 border border-red-500/30 rounded text-xs text-red-400 font-mono">
            {output.error}
          </div>
        )}

        {/* Timeout state */}
        {processingState === "timeout" && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="mb-4 text-2xl">&#9203;</div>
            <p className="text-sm text-red-400 font-medium mb-3">
              Extraction timed out
            </p>
            <div className="text-xs text-[#888] space-y-1">
              <p>Try:</p>
              <ul className="text-left inline-block space-y-1">
                <li>&#8226; A simpler selector</li>
                <li>&#8226; A smaller HTML snippet</li>
                <li>&#8226; Removing :not() nesting in your selector</li>
              </ul>
            </div>
          </div>
        )}

        {/* Empty state — no query yet (not timeout/error) */}
        {!output && processingState !== "timeout" && processingState !== "processing" && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#333"
              strokeWidth="1.5"
              className="mb-4"
            >
              <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
            <p className="text-sm text-[#777]">
              Paste HTML and enter a selector to begin
            </p>
          </div>
        )}

        {/* Processing indicator (no output yet) */}
        {processingState === "processing" && !output && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-8 h-8 border-2 border-[#7c3aed]/30 border-t-[#7c3aed] rounded-full animate-spin mb-4" />
            <p className="text-sm text-[#777]">Processing...</p>
          </div>
        )}

        {/* Zero matches state */}
        {output && output.matchCount === 0 && !output.error && processingState !== "timeout" && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-[#777]">
              No matches for this selector
            </p>
          </div>
        )}

        {/* Match results */}
        {output && output.matches.length > 0 && (
          <div className="space-y-3">
            {output.matches.map((match) => (
              <MatchCard key={match.index} match={match} mode={mode} />
            ))}

            {/* "Showing X of Y" note when results are capped */}
            {output.matchCount > output.matches.length && (
              <div className="text-center py-2 text-xs text-[#777] font-mono">
                Showing {output.matches.length} of {output.matchCount} matches
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
