import { describe, it, expect } from "vitest";
import { runExtractor, JOIN_SEPARATOR_HTML, JOIN_SEPARATOR_TEXT } from "@/lib/extractor";

describe("runExtractor", () => {
  it("empty selector returns empty joined output", async () => {
    const result = await runExtractor({ html: "<div>x</div>", selector: "", mode: "outerHTML" });
    expect(result.matchCount).toBe(0);
    expect(result.joinedOutput).toBe("");
  });

  it("empty HTML returns error", async () => {
    const result = await runExtractor({ html: "", selector: "div", mode: "outerHTML" });
    expect(result.error).toContain("Paste some HTML");
  });

  it("matches li with textContent mode", async () => {
    const html = "<ul><li>A</li><li>B</li></ul>";
    const result = await runExtractor({ html, selector: "li", mode: "textContent" });
    expect(result.matchCount).toBe(2);
    expect(result.joinedOutput).toBe(`A${JOIN_SEPARATOR_TEXT}B`);
  });

  it("outerHTML join separator", async () => {
    const result = await runExtractor({
      html: "<ul><li>A</li><li>B</li></ul>",
      selector: "li",
      mode: "outerHTML",
    });
    expect(result.joinedOutput).toContain(JOIN_SEPARATOR_HTML);
  });

  it("invalid selector error", async () => {
    const result = await runExtractor({ html: "<div/>", selector: "[[[", mode: "outerHTML" });
    expect(result.error).toContain("Invalid selector:");
  });

  it("attribute mode extracts href", async () => {
    const result = await runExtractor({
      html: '<a href="https://example.com">x</a>',
      selector: "a",
      mode: "attribute",
      attributeName: "href",
    });
    expect(result.matches[0].attribute).toBe("https://example.com");
  });

  it("innerHTML mode", async () => {
    const result = await runExtractor({
      html: "<div><span>x</span></div>",
      selector: "div",
      mode: "innerHTML",
    });
    expect(result.matches[0].inner).toContain("span");
    expect(result.matches[0].inner).not.toContain("<div>");
  });

  it("strip selectors remove nodes", async () => {
    const result = await runExtractor({
      html: '<div><p>Hi</p><script>x</script></div>',
      selector: "div",
      mode: "outerHTML",
      stripSelectors: "script",
    });
    expect(result.matches[0].outer).not.toContain("script");
    expect(result.matches[0].outer).toContain("Hi");
  });

  it("strip invalid returns error", async () => {
    const result = await runExtractor({
      html: "<div/>",
      selector: "div",
      mode: "outerHTML",
      stripSelectors: "[[[",
    });
    expect(result.error).toBeDefined();
  });

  it("base URL rewrites href on matched element", async () => {
    const result = await runExtractor({
      html: '<a href="/page">Link</a>',
      selector: "a",
      mode: "attribute",
      attributeName: "href",
      baseUrl: "https://example.com",
    });
    expect(result.matches[0].attribute).toBe("https://example.com/page");
  });

  it("javascript URL rejected when base URL set", async () => {
    const result = await runExtractor({
      html: '<a href="javascript:void(0)">x</a>',
      selector: "a",
      mode: "outerHTML",
      baseUrl: "https://example.com",
    });
    expect(result.error).toContain("javascript");
  });

  it("no matches returns empty joined output", async () => {
    const result = await runExtractor({
      html: "<div/>",
      selector: "span",
      mode: "outerHTML",
    });
    expect(result.matchCount).toBe(0);
    expect(result.joinedOutput).toBe("");
  });
});

describe("document validation", () => {
  it("errors on too many elements", async () => {
    const elements = "<i></i>".repeat(50_001);
    const html = `<div>${elements}</div>`;
    const result = await runExtractor({ html, selector: "i", mode: "outerHTML" });
    expect(result.error).toContain("too many elements");
  });
});
