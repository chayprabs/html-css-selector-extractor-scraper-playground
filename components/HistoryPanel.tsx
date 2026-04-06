"use client";

import { useEffect, useRef } from "react";
import type { HistoryEntry } from "@/lib/history";
import { formatRelativeTime } from "@/lib/history";

type HistoryPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  entries: HistoryEntry[];
  onLoad: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
};

export default function HistoryPanel({
  isOpen,
  onClose,
  entries,
  onLoad,
  onDelete,
  onClear,
}: HistoryPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full w-80 z-50 bg-[#141414] border-l border-[#222] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222] shrink-0">
          <span className="text-xs font-sans text-[#888] uppercase tracking-wider">
            History ({entries.length})
          </span>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <button
                onClick={onClear}
                className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close history"
              className="text-[#666] hover:text-[#ccc] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-full px-6 text-center">
              <p className="text-sm text-[#555]">
                No history yet. Successful extractions appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#222]">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="px-4 py-3 hover:bg-[#1a1a1a] transition-colors group"
                >
                  {/* Selector */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <code className="text-xs text-[#e5e5e5] font-mono truncate max-w-[200px]">
                      {entry.selector.length > 40
                        ? entry.selector.slice(0, 40) + "\u2026"
                        : entry.selector}
                    </code>
                    <button
                      onClick={() => onDelete(entry.id)}
                      aria-label="Delete entry"
                      className="text-[#444] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] text-[#a78bfa] bg-[#7c3aed]/10 px-1.5 py-0.5 rounded">
                      {entry.matchCount} match{entry.matchCount !== 1 ? "es" : ""}
                    </span>
                    <span className="text-[10px] text-[#555]">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>

                  {/* HTML preview */}
                  {entry.htmlPreview && (
                    <div className="text-[10px] text-[#444] font-mono truncate mb-2">
                      {entry.htmlPreview.slice(0, 60)}
                    </div>
                  )}

                  {/* Load button */}
                  <button
                    onClick={() => onLoad(entry)}
                    className="text-[10px] text-[#7c3aed] hover:text-[#a78bfa] transition-colors"
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
