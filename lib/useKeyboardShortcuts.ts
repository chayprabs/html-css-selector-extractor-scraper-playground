"use client";

import { useEffect, useRef } from "react";

type ShortcutActions = {
  focusSelector: () => void;
  copyResults: () => void;
  clearHtml: () => void;
  toggleHistory: () => void;
  exportJson: () => void;
  escape: () => void;
  loadSample: (index: number) => void;
};

export function useKeyboardShortcuts(actions: ShortcutActions): void {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");

    const handler = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const a = actionsRef.current;

      // Escape — always works
      if (e.key === "Escape") {
        a.escape();
        return;
      }

      if (!mod) return;

      // Cmd/Ctrl+K — focus selector (works even in input)
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        a.focusSelector();
        return;
      }

      // Cmd/Ctrl+Shift combos
      if (e.shiftKey) {
        switch (e.key) {
          case "C":
          case "c":
            e.preventDefault();
            a.copyResults();
            return;
          case "X":
          case "x":
            e.preventDefault();
            a.clearHtml();
            return;
          case "H":
          case "h":
            e.preventDefault();
            a.toggleHistory();
            return;
          case "E":
          case "e":
            e.preventDefault();
            a.exportJson();
            return;
        }
      }

      // Cmd/Ctrl+1,2,3 — load samples
      if (e.key === "1" || e.key === "2" || e.key === "3") {
        e.preventDefault();
        a.loadSample(parseInt(e.key) - 1);
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}
