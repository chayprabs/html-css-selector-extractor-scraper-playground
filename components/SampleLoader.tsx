"use client";

import { useState, useRef, useEffect } from "react";
import { prdPresets } from "@/lib/presets";
import type { ExtractorOptions } from "@/types/options";

type SampleLoaderProps = {
  onLoad: (html: string, selector: string, options: ExtractorOptions) => void;
};

/**
 * PRD §6.5 presets — loads HTML, selector, and options together.
 */
export default function SampleLoader({ onLoad }: SampleLoaderProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        className="px-2.5 py-1 text-xs bg-[#1e1e1e] text-[#888] border border-[#333] rounded hover:text-[#ccc] hover:border-[#555] transition-colors"
      >
        Presets ▾
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 mb-1 w-72 max-h-72 overflow-y-auto bg-[#1a1a1a] border border-[#333] rounded-lg overflow-x-hidden z-50"
        >
          {prdPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onLoad(preset.html, preset.selector, preset.options);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 hover:bg-[#252525] transition-colors border-b border-[#222] last:border-b-0"
            >
              <div className="text-sm text-[#e5e5e5]">{preset.name}</div>
              <div className="text-xs text-[#666] mt-0.5">{preset.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
