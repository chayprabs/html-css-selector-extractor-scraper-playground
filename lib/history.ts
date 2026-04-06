import type { ExtractorOptions } from "@/types/options";

const STORAGE_KEY = "html_extractor_history";
const MAX_ENTRIES = 20;

export type HistoryEntry = {
  id: string;
  timestamp: number;
  selector: string;
  options: ExtractorOptions;
  matchCount: number;
  htmlPreview: string;
};

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate shape: keep only entries with required fields
    return parsed.filter(
      (e: unknown): e is HistoryEntry =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as HistoryEntry).id === "string" &&
        typeof (e as HistoryEntry).timestamp === "number" &&
        typeof (e as HistoryEntry).selector === "string" &&
        typeof (e as HistoryEntry).matchCount === "number",
    );
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable or full — silently ignore
  }
}

export function addHistoryEntry(
  entry: Omit<HistoryEntry, "id" | "timestamp">,
): HistoryEntry[] {
  const entries = loadHistory();

  // Deduplicate: if last entry has same selector + options, update its timestamp
  if (entries.length > 0) {
    const last = entries[0];
    if (
      last.selector === entry.selector &&
      JSON.stringify(last.options) === JSON.stringify(entry.options)
    ) {
      last.timestamp = Date.now();
      last.matchCount = entry.matchCount;
      saveHistory(entries);
      return entries;
    }
  }

  const newEntry: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };

  const updated = [newEntry, ...entries].slice(0, MAX_ENTRIES);
  saveHistory(updated);
  return updated;
}

export function deleteHistoryEntry(id: string): HistoryEntry[] {
  const entries = loadHistory().filter((e) => e.id !== id);
  saveHistory(entries);
  return entries;
}

export function clearHistory(): HistoryEntry[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return [];
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
}
