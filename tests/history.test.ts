import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadHistory,
  addHistoryEntry,
  deleteHistoryEntry,
  clearHistory,
  formatRelativeTime,
} from "@/lib/history";
import { defaultOptions } from "@/types/options";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
Object.defineProperty(window, "localStorage", { value: localStorageMock, configurable: true });

// Mock crypto.randomUUID
let uuidCounter = 0;
vi.stubGlobal("crypto", {
  randomUUID: () => `uuid-${uuidCounter++}`,
});

beforeEach(() => {
  localStorageMock.clear();
  uuidCounter = 0;
});

const entry = {
  selector: "div",
  options: defaultOptions,
  matchCount: 3,
  htmlPreview: "<div>hello</div>",
};

describe("loadHistory", () => {
  it("returns [] when localStorage is empty", () => {
    expect(loadHistory()).toEqual([]);
  });

  it("returns [] when localStorage has corrupted data", () => {
    store["html_extractor_history"] = "not json";
    expect(loadHistory()).toEqual([]);
  });

  it("returns [] when data is not an array", () => {
    store["html_extractor_history"] = JSON.stringify({ foo: "bar" });
    expect(loadHistory()).toEqual([]);
  });

  it("filters out malformed entries", () => {
    store["html_extractor_history"] = JSON.stringify([
      { id: "1", timestamp: 123, selector: "div", matchCount: 1 },
      { bad: "entry" },
    ]);
    const result = loadHistory();
    expect(result).toHaveLength(1);
  });
});

describe("addHistoryEntry", () => {
  it("persists to localStorage", () => {
    addHistoryEntry(entry);
    const raw = store["html_extractor_history"];
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].selector).toBe("div");
  });

  it("returns entries sorted newest first", () => {
    addHistoryEntry({ ...entry, selector: "first" });
    const result = addHistoryEntry({ ...entry, selector: "second" });
    expect(result[0].selector).toBe("second");
    expect(result[1].selector).toBe("first");
  });

  it("caps at 20 entries", () => {
    for (let i = 0; i < 21; i++) {
      addHistoryEntry({ ...entry, selector: `sel${i}` });
    }
    const result = loadHistory();
    expect(result).toHaveLength(20);
  });

  it("oldest entry dropped when 21st is added", () => {
    for (let i = 0; i < 21; i++) {
      addHistoryEntry({ ...entry, selector: `sel${i}` });
    }
    const result = loadHistory();
    // sel0 should have been dropped (it was the oldest)
    expect(result.find((e) => e.selector === "sel0")).toBeUndefined();
    expect(result[0].selector).toBe("sel20");
  });

  it("deduplicates consecutive entries with same selector+options", () => {
    addHistoryEntry(entry);
    const result = addHistoryEntry(entry);
    expect(result).toHaveLength(1);
  });
});

describe("deleteHistoryEntry", () => {
  it("removes correct entry", () => {
    addHistoryEntry({ ...entry, selector: "first" });
    const added = addHistoryEntry({ ...entry, selector: "second" });
    const idToDelete = added[0].id;
    const result = deleteHistoryEntry(idToDelete);
    expect(result).toHaveLength(1);
    expect(result[0].selector).toBe("first");
  });
});

describe("clearHistory", () => {
  it("empties localStorage", () => {
    addHistoryEntry(entry);
    clearHistory();
    expect(store["html_extractor_history"]).toBeUndefined();
  });

  it("returns empty array", () => {
    addHistoryEntry(entry);
    expect(clearHistory()).toEqual([]);
  });
});

describe("formatRelativeTime", () => {
  it("returns 'just now' for very recent timestamps", () => {
    expect(formatRelativeTime(Date.now() - 5000)).toBe("just now");
  });

  it("returns minutes ago", () => {
    expect(formatRelativeTime(Date.now() - 120_000)).toBe("2 min ago");
  });

  it("returns hours ago", () => {
    expect(formatRelativeTime(Date.now() - 3_600_000 * 2)).toBe("2 hours ago");
  });

  it("returns 'yesterday'", () => {
    expect(formatRelativeTime(Date.now() - 86_400_000)).toBe("yesterday");
  });

  it("returns days ago", () => {
    expect(formatRelativeTime(Date.now() - 86_400_000 * 3)).toBe("3 days ago");
  });

  it("returns weeks ago", () => {
    expect(formatRelativeTime(Date.now() - 86_400_000 * 14)).toBe("2 weeks ago");
  });
});
