"use client";

import { useMemo, memo } from "react";
import CopyButton from "./CopyButton";
import { highlightHtml, highlightText } from "@/lib/highlight";
import { LIMITS } from "@/lib/limits";
import type { MatchResult } from "@/lib/extractor";

type MatchCardProps = {
  match: MatchResult;
  mode: "html" | "text" | "attribute" | "pretty";
};

/**
 * Single matched result card with syntax highlighting, mode label, and copy button.
 * Uses a subtle fade-in animation on mount.
 */
function MatchCardInner({ match, mode }: MatchCardProps) {
  // Determine which content to display and how to highlight it
  const { content, highlighted, sizeWarning } = useMemo(() => {
    let c: string;
    let h: string;
    let warn: string | null = null;

    switch (mode) {
      case "attribute":
        c = match.attribute ?? "";
        h = highlightText(c);
        break;
      case "text":
        c = match.text;
        h = highlightText(c);
        break;
      case "pretty":
        c = match.pretty ?? match.raw;
        // Check for pretty-print skip
        if (match.prettyPrintSkipped) {
          warn = `Pretty-print skipped — element too large (${Math.round(match.raw.length / 1024)}KB)`;
        }
        // Highlight with size guard
        if (c.length > LIMITS.HIGHLIGHT_MAX_BYTES || match.highlightSkipped) {
          h = highlightText(c);
          warn = warn || "Syntax highlighting skipped — output too large";
        } else {
          h = highlightHtml(c);
        }
        break;
      default:
        c = match.raw;
        // Highlight with size guard
        if (c.length > LIMITS.HIGHLIGHT_MAX_BYTES || match.highlightSkipped) {
          h = highlightText(c);
          warn = "Syntax highlighting skipped — output too large";
        } else {
          h = highlightHtml(c);
        }
        break;
    }

    return { content: c, highlighted: h, sizeWarning: warn };
  }, [match, mode]);

  const modeLabel = {
    html: "HTML",
    text: "Text",
    attribute: "Attr",
    pretty: "Pretty",
  }[mode];

  return (
    <div className="bg-[#111] border border-[#222] rounded-lg overflow-hidden animate-[fadeIn_0.2s_ease-out]">
      {/* Card header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#777]">#{match.index + 1}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#7c3aed]/10 text-[#a78bfa] font-mono">
            {modeLabel}
          </span>
          {sizeWarning && (
            <span className="text-[10px] text-yellow-400 font-mono">{sizeWarning}</span>
          )}
        </div>
        <CopyButton text={content} />
      </div>

      {/* SECURITY: `highlighted` is always HTML-escaped by Prism.highlight or escapeHtml. Never pass raw user content. */}
      <pre className="p-3 overflow-x-auto text-xs leading-relaxed font-mono">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

const MatchCard = memo(MatchCardInner, (prev, next) => {
  return prev.mode === next.mode
    && prev.match.index === next.match.index
    && prev.match.raw === next.match.raw
    && prev.match.text === next.match.text
    && prev.match.attribute === next.match.attribute
    && prev.match.pretty === next.match.pretty
    && prev.match.prettyPrintSkipped === next.match.prettyPrintSkipped
    && prev.match.highlightSkipped === next.match.highlightSkipped;
});

export default MatchCard;
