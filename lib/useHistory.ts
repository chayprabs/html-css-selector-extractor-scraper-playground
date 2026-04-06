"use client";

import { useState, useEffect, useCallback } from "react";
import {
  loadHistory,
  addHistoryEntry,
  deleteHistoryEntry,
  clearHistory,
  type HistoryEntry,
} from "./history";
import type { ExtractorOptions } from "@/types/options";

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(loadHistory());
  }, []);

  const addEntry = useCallback(
    (entry: { selector: string; options: ExtractorOptions; matchCount: number; htmlPreview: string }) => {
      const updated = addHistoryEntry(entry);
      setEntries(updated);
    },
    [],
  );

  const deleteEntry = useCallback((id: string) => {
    const updated = deleteHistoryEntry(id);
    setEntries(updated);
  }, []);

  const clearAll = useCallback(() => {
    const updated = clearHistory();
    setEntries(updated);
  }, []);

  return { entries, addEntry, deleteEntry, clearAll };
}
