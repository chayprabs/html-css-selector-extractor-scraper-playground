import { describe, it, expect } from "vitest";
import { rewriteUrlsOnDocument, parseHtml } from "@/lib/extractor";

describe("rewriteUrlsOnDocument", () => {
  it("rewrites relative href across document before query", () => {
    const doc = parseHtml('<div><a href="/inner">x</a></div>');
    rewriteUrlsOnDocument(doc, "https://example.com");
    expect(doc.querySelector("a")?.getAttribute("href")).toBe("https://example.com/inner");
  });

  it("leaves absolute URLs unchanged", () => {
    const doc = parseHtml('<a href="https://other.com/x">x</a>');
    rewriteUrlsOnDocument(doc, "https://example.com");
    expect(doc.querySelector("a")?.getAttribute("href")).toBe("https://other.com/x");
  });

  it("leaves data: URIs unchanged", () => {
    const doc = parseHtml('<img src="data:image/png;base64,abc" />');
    rewriteUrlsOnDocument(doc, "https://example.com");
    expect(doc.querySelector("img")?.getAttribute("src")).toBe("data:image/png;base64,abc");
  });
});
