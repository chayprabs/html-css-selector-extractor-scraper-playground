"use client";

import { LIMITS, type LimitViolation } from "@/lib/limits";
import type { ProcessingState } from "@/types/processing";

type SelectorBarProps = {
  selector: string;
  onSelectorChange: (value: string) => void;
  matchCount: number | null;
  error?: string;
  onClear: () => void;
  violations?: LimitViolation[];
  processingState?: ProcessingState;
};

/**
 * Full-width top bar with CSS selector input, match count badge, and clear button.
 * Purple left border when focused, red border + error message on invalid selector.
 */
export default function SelectorBar({
  selector,
  onSelectorChange,
  matchCount,
  error,
  onClear,
  violations,
  processingState,
}: SelectorBarProps) {
  const blockViolation = violations?.find((v) => v.severity === "block");
  const warnViolation = violations?.find((v) => v.severity === "warn");
  const hasError = !!error || !!blockViolation;

  return (
    <div className="w-full bg-[#141414] border-b border-[#222] px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Selector input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={selector}
            onChange={(e) => onSelectorChange(e.target.value)}
            maxLength={LIMITS.SELECTOR_MAX_LENGTH}
            placeholder="div.classname, #id, a[href]"
            aria-label="CSS selector"
            spellCheck={false}
            className={`w-full h-12 px-4 bg-[#0d0d0d] text-[#e5e5e5] font-mono text-sm rounded border-2 transition-colors outline-none placeholder:text-[#555] ${
              hasError
                ? "border-red-500/70 focus:border-red-500"
                : "border-[#222] focus:border-[#7c3aed]"
            }`}
            style={{ borderLeftWidth: "3px" }}
          />
          {/* Error message */}
          {(error || blockViolation) && (
            <div className="absolute top-full left-0 mt-1 px-3 py-1.5 bg-red-950/80 border border-red-500/30 rounded text-xs text-red-400 font-mono z-10">
              {error || blockViolation?.message}
            </div>
          )}
          {/* Warning message (only if no error) */}
          {!error && !blockViolation && warnViolation && (
            <div className="absolute top-full left-0 mt-1 px-3 py-1.5 bg-yellow-950/80 border border-yellow-600/30 rounded text-xs text-yellow-400 font-mono z-10">
              {warnViolation.message}
            </div>
          )}
        </div>

        {/* Character count */}
        {selector.length > 0 && (
          <span className="text-[10px] text-[#555] font-mono whitespace-nowrap">
            {selector.length} / {LIMITS.SELECTOR_MAX_LENGTH}
          </span>
        )}

        {/* Match count badge */}
        {matchCount !== null && !hasError && (
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              processingState === "processing"
                ? "bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/30 animate-pulse"
                : matchCount > 0
                  ? "bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/30"
                  : "bg-[#1e1e1e] text-[#666] border border-[#333]"
            }`}
          >
            {processingState === "processing"
              ? "..."
              : `${matchCount} match${matchCount !== 1 ? "es" : ""}`}
          </div>
        )}

        {/* Clear button */}
        <button
          onClick={onClear}
          aria-label="Clear all"
          className="px-3 py-1.5 text-xs bg-[#1e1e1e] text-[#888] border border-[#333] rounded hover:text-[#ccc] hover:border-[#555] transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
