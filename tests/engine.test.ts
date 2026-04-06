import { describe, it, expect } from "vitest";
import { runExtractor } from "@/lib/extractor";

describe("runExtractor", () => {
  // ─── Basic extraction ──────────────────────────────────────

  it("empty HTML returns 0 matches", async () => {
    const result = await runExtractor({ html: "", selector: "div" });
    expect(result.matches).toHaveLength(0);
    expect(result.matchCount).toBe(0);
  });

  it("empty selector returns 0 matches", async () => {
    const result = await runExtractor({ html: "<div>hello</div>", selector: "" });
    expect(result.matches).toHaveLength(0);
    expect(result.matchCount).toBe(0);
  });

  it("basic selector 'li' matches all li elements", async () => {
    const html = "<ul><li>A</li><li>B</li><li>C</li></ul>";
    const result = await runExtractor({ html, selector: "li" });
    expect(result.matchCount).toBe(3);
    expect(result.matches).toHaveLength(3);
    expect(result.matches[0].text).toBe("A");
    expect(result.matches[1].text).toBe("B");
    expect(result.matches[2].text).toBe("C");
  });

  it("selector with no matches returns empty array with no error", async () => {
    const html = "<div>hello</div>";
    const result = await runExtractor({ html, selector: "span" });
    expect(result.matches).toHaveLength(0);
    expect(result.matchCount).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("invalid selector returns error", async () => {
    const html = "<div>hello</div>";
    const result = await runExtractor({ html, selector: "[[[" });
    expect(result.error).toBeDefined();
    expect(result.matches).toHaveLength(0);
  });

  // ─── Attribute extraction ──────────────────────────────────

  it("extracts href from anchor tags", async () => {
    const html = '<a href="https://example.com">Link</a>';
    const result = await runExtractor({ html, selector: "a", attribute: "href" });
    expect(result.matches[0].attribute).toBe("https://example.com");
  });

  it("returns empty string when attribute doesn't exist", async () => {
    const html = "<div>no attr</div>";
    const result = await runExtractor({ html, selector: "div", attribute: "data-id" });
    expect(result.matches[0].attribute).toBe("");
  });

  it("sets warning when attribute missing on some elements", async () => {
    const html = '<a href="/link">Link</a><a>No href</a>';
    const result = await runExtractor({ html, selector: "a", attribute: "href" });
    expect(result.warning).toContain("not found");
  });

  it("handles data-* attributes", async () => {
    const html = '<div data-id="42">Item</div>';
    const result = await runExtractor({ html, selector: "div", attribute: "data-id" });
    expect(result.matches[0].attribute).toBe("42");
  });

  // ─── Text only ─────────────────────────────────────────────

  it("textOnly returns textContent", async () => {
    const html = "<div><strong>Bold</strong> text</div>";
    const result = await runExtractor({ html, selector: "div", textOnly: true });
    expect(result.matches[0].text).toBe("Bold text");
  });

  it("handles elements with no text content", async () => {
    const html = '<img src="test.png" />';
    const result = await runExtractor({ html, selector: "img", textOnly: true });
    expect(result.matches[0].text).toBe("");
  });

  // ─── Remove nodes ──────────────────────────────────────────

  it("removes matching elements before querying", async () => {
    const html = "<div><span>keep</span><script>remove</script></div>";
    const result = await runExtractor({ html, selector: "div", removeNodes: "script" });
    expect(result.matches[0].raw).not.toContain("script");
    expect(result.matches[0].raw).toContain("keep");
  });

  it("does not error when removeNodes matches nothing", async () => {
    const html = "<div>hello</div>";
    const result = await runExtractor({ html, selector: "div", removeNodes: "script" });
    expect(result.matches).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it("main selector runs on post-removal document", async () => {
    const html = "<div class='a'>keep</div><div class='b'>remove</div>";
    const result = await runExtractor({ html, selector: "div", removeNodes: ".b" });
    expect(result.matchCount).toBe(1);
    expect(result.matches[0].text).toBe("keep");
  });

  // ─── Base URL ──────────────────────────────────────────────

  it("rewrites relative href", async () => {
    const html = '<a href="/page">Link</a>';
    const result = await runExtractor({ html, selector: "a", baseUrl: "https://example.com" });
    expect(result.matches[0].raw).toContain("https://example.com/page");
  });

  it("rewrites relative src", async () => {
    const html = '<img src="img.png" />';
    const result = await runExtractor({ html, selector: "img", baseUrl: "https://example.com" });
    expect(result.matches[0].raw).toContain("https://example.com/img.png");
  });

  it("does NOT rewrite absolute URLs", async () => {
    const html = '<a href="https://other.com">Link</a>';
    const result = await runExtractor({ html, selector: "a", baseUrl: "https://example.com" });
    expect(result.matches[0].raw).toContain("https://other.com");
  });

  it("does NOT rewrite anchor-only URLs", async () => {
    const html = '<a href="#section">Link</a>';
    const result = await runExtractor({ html, selector: "a", baseUrl: "https://example.com" });
    expect(result.matches[0].raw).toContain('#section');
  });

  it("handles baseUrl with no trailing slash", async () => {
    const html = '<a href="/page">Link</a>';
    const result = await runExtractor({ html, selector: "a", baseUrl: "https://example.com" });
    expect(result.matches[0].raw).toContain("https://example.com/page");
  });

  // ─── Ignore whitespace ────────────────────────────────────

  it("collapses multiple spaces to one", async () => {
    const html = "<div>hello    world</div>";
    const result = await runExtractor({ html, selector: "div", ignoreWhitespace: true });
    expect(result.matches[0].text).toBe("hello world");
  });

  it("collapses newlines and tabs", async () => {
    const html = "<div>hello\n\t\tworld</div>";
    const result = await runExtractor({ html, selector: "div", ignoreWhitespace: true });
    expect(result.matches[0].text).toBe("hello world");
  });

  // ─── Security ──────────────────────────────────────────────

  it("script tags in HTML do not execute", async () => {
    const html = '<script>window.__TEST_XSS = true</script><div>safe</div>';
    const result = await runExtractor({ html, selector: "div" });
    expect(result.matches[0].text).toBe("safe");
    expect((window as unknown as Record<string, unknown>).__TEST_XSS).toBeUndefined();
  });

  it("onerror attributes are returned as plain text", async () => {
    const html = '<img onerror="alert(1)" src="x" />';
    const result = await runExtractor({ html, selector: "img" });
    expect(result.matches[0].raw).toContain("onerror");
    expect(typeof result.matches[0].raw).toBe("string");
  });
});

// ─── Document validation (validateParsedDocument) ────────

describe("document validation via runExtractor", () => {
  it("returns error when document exceeds max element count", async () => {
    const elements = "<i></i>".repeat(50_001);
    const html = `<div>${elements}</div>`;
    const result = await runExtractor({ html, selector: "i" });
    expect(result.error).toBeDefined();
    expect(result.error).toContain("too many elements");
    expect(result.matches).toHaveLength(0);
    expect(result.matchCount).toBe(0);
  });

  it("returns error when document exceeds max nesting depth", async () => {
    const depth = 201;
    const open = "<div>".repeat(depth);
    const close = "</div>".repeat(depth);
    const html = open + "deep" + close;
    const result = await runExtractor({ html, selector: "div" });
    expect(result.error).toBeDefined();
    expect(result.error).toContain("nesting depth");
    expect(result.matches).toHaveLength(0);
  });

  it("allows documents within safe limits", async () => {
    const items = Array.from({ length: 100 }, (_, i) => `<li>${i}</li>`).join("");
    const html = `<ul>${items}</ul>`;
    const result = await runExtractor({ html, selector: "li" });
    expect(result.error).toBeUndefined();
    expect(result.matchCount).toBe(100);
  });
});
