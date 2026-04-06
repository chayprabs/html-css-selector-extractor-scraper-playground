import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the browser download mechanism
let lastBlobContent = "";
let lastFilename = "";

beforeEach(() => {
  lastBlobContent = "";
  lastFilename = "";

  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:mock",
    revokeObjectURL: vi.fn(),
  });

  const mockAnchor = {
    href: "",
    download: "",
    style: { display: "" },
    click: vi.fn(),
  };

  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "a") return mockAnchor as unknown as HTMLElement;
    return document.createElement(tag);
  });
  vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
  vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

  // Capture blob content
  const OrigBlob = globalThis.Blob;
  vi.stubGlobal("Blob", class MockBlob extends OrigBlob {
    constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options);
      lastBlobContent = parts?.map((p) => (typeof p === "string" ? p : "")).join("") ?? "";
    }
  });

  Object.defineProperty(mockAnchor, "download", {
    set(val: string) { lastFilename = val; },
    get() { return lastFilename; },
    configurable: true,
  });
});

// Import after mocks are set up
import { exportAsJson, exportAsCsv, exportAsText } from "@/lib/exporters";
import type { MatchResult } from "@/lib/extractor";

const sampleMatches: MatchResult[] = [
  { index: 0, raw: "<div>Hello</div>", text: "Hello" },
  { index: 1, raw: "<div>World</div>", text: "World" },
];

const matchWithAttr: MatchResult[] = [
  { index: 0, raw: '<a href="/link">Link</a>', text: "Link", attribute: "/link" },
];

// ─── exportAsJson ───────────────────────────────────────────

describe("exportAsJson", () => {
  it("output is valid parseable JSON", () => {
    exportAsJson(sampleMatches, { mode: "html", includeIndex: true });
    const parsed = JSON.parse(lastBlobContent);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("contains correct number of entries", () => {
    exportAsJson(sampleMatches, { mode: "html", includeIndex: true });
    const parsed = JSON.parse(lastBlobContent);
    expect(parsed).toHaveLength(2);
  });

  it("each entry has correct fields", () => {
    exportAsJson(sampleMatches, { mode: "html", includeIndex: true });
    const parsed = JSON.parse(lastBlobContent);
    expect(parsed[0]).toHaveProperty("index", 0);
    expect(parsed[0]).toHaveProperty("html");
    expect(parsed[0]).toHaveProperty("text", "Hello");
  });

  it("includes attribute field when mode is attribute", () => {
    exportAsJson(matchWithAttr, { mode: "attribute", attributeName: "href", includeIndex: false });
    const parsed = JSON.parse(lastBlobContent);
    expect(parsed[0]).toHaveProperty("href", "/link");
  });

  it("handles empty matches array", () => {
    exportAsJson([], { mode: "html", includeIndex: true });
    const parsed = JSON.parse(lastBlobContent);
    expect(parsed).toHaveLength(0);
  });
});

// ─── exportAsCsv ────────────────────────────────────────────

describe("exportAsCsv", () => {
  it("first row is headers", () => {
    exportAsCsv(sampleMatches, { mode: "html", includeIndex: true });
    const lines = lastBlobContent.replace("\uFEFF", "").split("\n");
    expect(lines[0]).toBe("index,html,text");
  });

  it("values with commas are quoted", () => {
    const matches: MatchResult[] = [
      { index: 0, raw: "<div>a,b</div>", text: "a,b" },
    ];
    exportAsCsv(matches, { mode: "html", includeIndex: false });
    const content = lastBlobContent.replace("\uFEFF", "");
    expect(content).toContain('"a,b"');
  });

  it("values with double quotes are escaped", () => {
    const matches: MatchResult[] = [
      { index: 0, raw: '<div class="x">text</div>', text: "text" },
    ];
    exportAsCsv(matches, { mode: "html", includeIndex: false });
    const content = lastBlobContent.replace("\uFEFF", "");
    expect(content).toContain('""x""');
  });

  it("values with newlines are quoted", () => {
    const matches: MatchResult[] = [
      { index: 0, raw: "<div>\n</div>", text: "\n" },
    ];
    exportAsCsv(matches, { mode: "html", includeIndex: false });
    const content = lastBlobContent.replace("\uFEFF", "");
    // The value containing newline should be wrapped in quotes
    expect(content).toContain('"');
  });

  it("starts with UTF-8 BOM", () => {
    exportAsCsv(sampleMatches, { mode: "html", includeIndex: true });
    expect(lastBlobContent.startsWith("\uFEFF")).toBe(true);
  });
});

// ─── exportAsText ───────────────────────────────────────────

describe("exportAsText", () => {
  it("one result per entry", () => {
    exportAsText(sampleMatches, { mode: "html", includeIndex: false });
    const lines = lastBlobContent.split("\n").filter(Boolean);
    expect(lines).toHaveLength(2);
  });

  it("index prefix when includeIndex is true", () => {
    exportAsText(sampleMatches, { mode: "html", includeIndex: true });
    expect(lastBlobContent).toContain("1. ");
    expect(lastBlobContent).toContain("2. ");
  });

  it("text mode outputs text content", () => {
    exportAsText(sampleMatches, { mode: "text", includeIndex: false });
    expect(lastBlobContent).toContain("Hello");
    expect(lastBlobContent).not.toContain("<div>");
  });
});
