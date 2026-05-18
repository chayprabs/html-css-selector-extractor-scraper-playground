"use client";

import { forwardRef, useState, useCallback } from "react";
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
  showCopyLink?: boolean;
  /** PRD §9 — workspace too large for LZ-string hash */
  shareTooLarge?: boolean;
  onToggleHistory?: () => void;
  historyCount?: number;
  /** PRD §6.2 — Ctrl/Cmd+Enter runs extraction immediately */
  onModifierEnter?: () => void;
};

/**
 * Full-width top bar: selector input, match count, share link, history, clear.
 */
const SelectorBar = forwardRef<HTMLInputElement, SelectorBarProps>(function SelectorBar(
  {
    selector,
    onSelectorChange,
    matchCount,
    error,
    onClear,
    violations,
    processingState,
    showCopyLink,
    shareTooLarge,
    onToggleHistory,
    historyCount,
    onModifierEnter,
  },
  ref,
) {
  const blockViolation = violations?.find((v) => v.severity === "block");
  const warnViolation = violations?.find((v) => v.severity === "warn");
  const hasError = !!error || !!blockViolation;

  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    if (shareTooLarge) return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [shareTooLarge]);

  return (
    <div className="w-full bg-[#141414] border-b border-[#222] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            ref={ref}
            type="text"
            value={selector}
            onChange={(e) => onSelectorChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                onModifierEnter?.();
              }
            }}
            maxLength={LIMITS.SELECTOR_MAX_LENGTH}
            placeholder="CSS selector, e.g. a[href]"
            aria-label="CSS selector"
            spellCheck={false}
            className={`w-full h-12 px-4 bg-[#0d0d0d] text-[#e5e5e5] font-mono text-sm rounded border-2 transition-colors outline-none placeholder:text-[#555] ${
              hasError ? "border-red-500/70 focus:border-red-500" : "border-[#222] focus:border-[#7c3aed]"
            }`}
            style={{ borderLeftWidth: "3px" }}
          />
          {(error || blockViolation) && (
            <div className="absolute top-full left-0 mt-1 px-3 py-1.5 bg-red-950/80 border border-red-500/30 rounded text-xs text-red-400 font-mono z-10">
              {error || blockViolation?.message}
            </div>
          )}
          {!error && !blockViolation && warnViolation && (
            <div className="absolute top-full left-0 mt-1 px-3 py-1.5 bg-yellow-950/80 border border-yellow-600/30 rounded text-xs text-yellow-400 font-mono z-10">
              {warnViolation.message}
            </div>
          )}
        </div>

        {selector.length > 0 && (
          <span className="text-[10px] text-[#555] font-mono whitespace-nowrap">
            {selector.length} / {LIMITS.SELECTOR_MAX_LENGTH}
          </span>
        )}

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
              ? "…"
              : `${matchCount} match${matchCount !== 1 ? "es" : ""} found`}
          </div>
        )}

        {shareTooLarge && (
          <span className="text-[10px] text-yellow-400 font-mono max-w-[200px] leading-tight">
            Input is too large to encode in a URL.
          </span>
        )}

        {showCopyLink && !shareTooLarge && (
          <button
            type="button"
            onClick={handleCopyLink}
            title="Copy shareable link with workspace state"
            className={`px-3 py-1.5 text-xs border rounded transition-colors whitespace-nowrap ${
              linkCopied
                ? "bg-green-950/60 text-green-400 border-green-500/30"
                : "bg-[#1e1e1e] text-[#888] border-[#333] hover:text-[#ccc] hover:border-[#555]"
            }`}
          >
            {linkCopied ? "Link copied." : "Copy link"}
          </button>
        )}

        {onToggleHistory && (
          <button
            type="button"
            onClick={onToggleHistory}
            title="Toggle history panel"
            className="px-2.5 py-1.5 text-xs bg-[#1e1e1e] text-[#888] border border-[#333] rounded hover:text-[#ccc] hover:border-[#555] transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {typeof historyCount === "number" && historyCount > 0 && (
              <span className="text-[#a78bfa]">{historyCount}</span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onClear}
          aria-label="Clear all"
          className="px-3 py-1.5 text-xs bg-[#1e1e1e] text-[#888] border border-[#333] rounded hover:text-[#ccc] hover:border-[#555] transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
});

export default SelectorBar;
