"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const isMac =
  typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
const mod = isMac ? "\u2318" : "Ctrl";

const shortcuts = [
  { keys: `${mod}+K`, action: "Focus selector input" },
  { keys: `${mod}+Shift+C`, action: "Copy all results" },
  { keys: `${mod}+Shift+X`, action: "Clear HTML input" },
  { keys: `${mod}+Shift+H`, action: "Toggle history panel" },
  { keys: `${mod}+Shift+E`, action: "Export as JSON" },
  { keys: "Escape", action: "Close panels / blur" },
  { keys: `${mod}+1, 2, 3`, action: "Load sample 1, 2, 3" },
];

export default function ShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => setOpen(false), []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, handleClose]);

  // Focus trap
  useEffect(() => {
    if (!open || !modalRef.current) return;
    closeRef.current?.focus();

    const modal = modalRef.current;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
        className="fixed bottom-4 right-4 z-30 w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#333] text-[#666] hover:text-[#ccc] hover:border-[#555] transition-colors flex items-center justify-center text-sm font-bold"
      >
        ?
      </button>

      {/* Modal */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-96 max-w-[90vw] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#222]">
              <h2 className="text-sm font-medium text-[#e5e5e5]">Keyboard Shortcuts</h2>
              <button
                ref={closeRef}
                onClick={handleClose}
                aria-label="Close"
                className="text-[#666] hover:text-[#ccc] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <table className="w-full">
                <tbody>
                  {shortcuts.map((s) => (
                    <tr key={s.keys} className="border-b border-[#222] last:border-0">
                      <td className="py-2 pr-4">
                        <kbd className="text-xs font-mono text-[#a78bfa] bg-[#7c3aed]/10 px-2 py-1 rounded whitespace-nowrap">
                          {s.keys}
                        </kbd>
                      </td>
                      <td className="py-2 text-xs text-[#999]">{s.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
