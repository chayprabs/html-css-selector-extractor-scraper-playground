import { describe, it, expect, vi, beforeEach } from "vitest";

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

  const OrigBlob = globalThis.Blob;
  vi.stubGlobal("Blob", class MockBlob extends OrigBlob {
    constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options);
      lastBlobContent = parts?.map((p) => (typeof p === "string" ? p : "")).join("") ?? "";
    }
  });

  Object.defineProperty(mockAnchor, "download", {
    set(val: string) {
      lastFilename = val;
    },
    get() {
      return lastFilename;
    },
    configurable: true,
  });
});

import { exportAsJson, exportAsCsv, exportAsText } from "@/lib/exporters";
import type { MatchResult } from "@/lib/extractor";

const mk = (outer: string, inner: string, text: string, attribute?: string): MatchResult => ({
  index: 0,
  outer,
  inner,
  text,
  attribute,
});

const sampleMatches: MatchResult[] = [
  mk("<div>Hello</div>", "Hello", "Hello"),
  mk("<div>World</div>", "World", "World"),
];

describe("exportAsJson", () => {
  it("parses JSON", () => {
    exportAsJson(sampleMatches, { mode: "outerHTML", includeIndex: true });
    const parsed = JSON.parse(lastBlobContent);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toHaveProperty("outerHTML");
  });

  it("attribute mode", () => {
    const matches = [mk('<a href="/l">x</a>', "x", "x", "/l")];
    exportAsJson(matches, { mode: "attribute", attributeName: "href", includeIndex: false });
    const parsed = JSON.parse(lastBlobContent);
    expect(parsed[0]).toHaveProperty("href", "/l");
  });
});

describe("exportAsCsv", () => {
  it("headers for outerHTML", () => {
    exportAsCsv(sampleMatches, { mode: "outerHTML", includeIndex: true });
    const lines = lastBlobContent.replace("\uFEFF", "").split("\n");
    expect(lines[0]).toContain("outerHTML");
  });

  it("textContent mode has no outer column only text", () => {
    exportAsCsv(sampleMatches, { mode: "textContent", includeIndex: false });
    const header = lastBlobContent.replace("\uFEFF", "").split("\n")[0];
    expect(header).toBe("textContent");
  });
});

describe("exportAsText", () => {
  it("uses outer vs text per mode", () => {
    exportAsText(sampleMatches, { mode: "textContent", includeIndex: false });
    expect(lastBlobContent).toContain("Hello");
    expect(lastBlobContent).not.toContain("<div>");
  });
});
