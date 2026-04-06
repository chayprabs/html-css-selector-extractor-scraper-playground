/**
 * Comprehensive verification tests for HTML Extractor engine.
 * Covers all edge cases from the spec + core functional tests.
 * Uses linkedom to provide DOMParser in Node.js.
 */
import { parseHTML } from "linkedom";

// Polyfill browser globals
const { DOMParser, NodeFilter } = parseHTML("<!DOCTYPE html><html><body></body></html>");
globalThis.DOMParser = DOMParser;
globalThis.NodeFilter = NodeFilter;

const { runExtractor } = await import("./lib/extractor.ts");

let passed = 0;
let failed = 0;
const results = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    results.push(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    results.push(`  FAIL  ${name}: ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed");
}

function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg || ""} Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ─── Core functional tests ──────────────────────────────────────────

await test("F1: Basic selector — matches li elements", async () => {
  const r = await runExtractor({ html: "<ul><li>one</li><li>two</li></ul>", selector: "li" });
  eq(r.matchCount, 2);
  assert(r.matches[0].raw.includes("one"));
  assert(r.matches[1].raw.includes("two"));
  eq(r.error, undefined);
});

await test("F2: Attribute extraction — href", async () => {
  const r = await runExtractor({ html: '<a href="/about">About</a>', selector: "a", attribute: "href" });
  eq(r.matchCount, 1);
  eq(r.matches[0].attribute, "/about");
});

await test("F3: Text only mode", async () => {
  const r = await runExtractor({ html: '<p>Hello <b>World</b></p>', selector: "p", textOnly: true });
  eq(r.matches[0].text, "Hello World");
});

await test("F4: Pretty print — adds indentation", async () => {
  const r = await runExtractor({ html: "<div><p><span>Hi</span></p></div>", selector: "div", prettyPrint: true });
  assert(r.matches[0].pretty.includes("\n"), "Should have newlines");
  assert(r.matches[0].pretty.includes("  "), "Should have indentation");
});

await test("F5: Remove nodes — strips script", async () => {
  const r = await runExtractor({ html: '<div><p>Hi</p><script>alert("x")</script></div>', selector: "div", removeNodes: "script" });
  assert(!r.matches[0].raw.includes("script"), "Script should be removed");
  assert(r.matches[0].raw.includes("Hi"), "Content should remain");
});

await test("F6: Base URL rewriting", async () => {
  const r = await runExtractor({ html: '<a href="/page">Link</a>', selector: "a", baseUrl: "https://example.com" });
  assert(r.matches[0].raw.includes("https://example.com/page"));
});

await test("F7: Ignore whitespace", async () => {
  const r = await runExtractor({ html: "<p>  Hello   World  </p>", selector: "p", textOnly: true, ignoreWhitespace: true });
  eq(r.matches[0].text, "Hello World");
});

// ─── Edge case tests ────────────────────────────────────────────────

await test("E1: Empty selector → no error, no output", async () => {
  const r = await runExtractor({ html: "<div>Hi</div>", selector: "" });
  eq(r.matchCount, 0);
  eq(r.matches.length, 0);
  eq(r.error, undefined);
});

await test("E2: Whitespace-only selector → treat as empty", async () => {
  const r = await runExtractor({ html: "<div>Hi</div>", selector: "   " });
  eq(r.matchCount, 0);
  eq(r.error, undefined);
});

await test("E3: Invalid CSS selector → error, no crash", async () => {
  const r = await runExtractor({ html: "<div></div>", selector: "##bad" });
  assert(r.error && r.error.includes("Invalid"), "Should return error");
  eq(r.matches.length, 0);
});

await test("E3b: Unclosed bracket selector → error", async () => {
  const r = await runExtractor({ html: "<div></div>", selector: "[unclosed" });
  assert(r.error && r.error.includes("Invalid"), "Should return error");
});

await test("E4: Valid selector, zero matches", async () => {
  const r = await runExtractor({ html: "<div>Hi</div>", selector: ".nonexistent" });
  eq(r.matchCount, 0);
  eq(r.matches.length, 0);
  eq(r.error, undefined);
});

await test("E5: HTML with <script> tags → DOMParser never executes them", async () => {
  const r = await runExtractor({ html: '<div><script>document.write("hacked")</script><p>Safe</p></div>', selector: "p" });
  eq(r.matchCount, 1);
  assert(r.matches[0].text.includes("Safe"));
});

await test("E6: removeNodes strips script before query", async () => {
  const r = await runExtractor({ html: '<html><body><script>x</script><p>Hi</p></body></html>', selector: "body", removeNodes: "script" });
  assert(!r.matches[0].raw.includes("<script>"), "Script should be gone");
});

await test("E7: Attribute not found → empty string + warning", async () => {
  const r = await runExtractor({ html: "<div>Hi</div>", selector: "div", attribute: "href" });
  eq(r.matches[0].attribute, "");
  assert(r.warning && r.warning.includes("not found"));
});

await test("E8: Pretty print on already-indented HTML → no double-indent issues", async () => {
  const html = "<div>\n  <p>Hello</p>\n</div>";
  const r = await runExtractor({ html, selector: "div", prettyPrint: true });
  const maxIndent = Math.max(...r.matches[0].pretty.split("\n").map(l => l.match(/^(\s*)/)[0].length));
  assert(maxIndent <= 6, `Indent too deep: ${maxIndent}`);
});

await test("E9: Large HTML (100KB+) → no crash", async () => {
  const big = "<ul>" + "<li>Item number test content</li>".repeat(5000) + "</ul>";
  assert(big.length > 100000, `Should be >100KB, got ${big.length}`);
  const r = await runExtractor({ html: big, selector: "li" });
  eq(r.matchCount, 5000);
  assert(r.matches.length <= 50, "Should cap at 50 displayed");
});

await test("E10: SVG elements → no error", async () => {
  const r = await runExtractor({ html: '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5" cx="10" cy="10"/></svg>', selector: "circle" });
  assert(r.error === undefined, "Should not error on SVG");
});

await test("E11: Emoji and Unicode content", async () => {
  const r = await runExtractor({ html: "<p>Hello 🌍 Wörld café</p>", selector: "p" });
  assert(r.matches[0].text.includes("🌍"), "Should preserve emoji");
  assert(r.matches[0].text.includes("café"), "Should preserve Unicode");
});

await test("E12: Broken/unclosed HTML → graceful recovery", async () => {
  const r = await runExtractor({ html: "<div><p>Unclosed<span>tags", selector: "p" });
  assert(r.error === undefined, "Should not error");
  assert(r.matchCount >= 1, "Should still find elements");
});

await test("E13: removeNodes matches everything → 0 results, no crash", async () => {
  const r = await runExtractor({ html: "<div><p>Hi</p></div>", selector: "p", removeNodes: "p" });
  eq(r.matchCount, 0);
  eq(r.error, undefined);
});

await test("E14: baseUrl with no trailing slash", async () => {
  const r = await runExtractor({ html: '<a href="/page">Link</a>', selector: "a", baseUrl: "https://example.com" });
  assert(r.matches[0].raw.includes("https://example.com/page"), "Should resolve correctly without trailing slash");
});

await test("E15: Multiple attributes in selector like a[href][data-id]", async () => {
  const r = await runExtractor({
    html: '<a href="/link" data-id="1">One</a><a href="/other">Two</a>',
    selector: 'a[href][data-id]',
  });
  eq(r.matchCount, 1);
  assert(r.matches[0].raw.includes("data-id"));
});

await test("E16: 100+ matches → capped at 50 in output", async () => {
  const html = "<ul>" + Array.from({ length: 150 }, (_, i) => `<li>Item ${i}</li>`).join("") + "</ul>";
  const r = await runExtractor({ html, selector: "li" });
  eq(r.matchCount, 150);
  eq(r.matches.length, 50);
});

// ─── Additional: Detect base URL from <base> tag ────────────────────

await test("F8: Detect base from HTML (via baseUrl manual entry)", async () => {
  const r = await runExtractor({
    html: '<html><head><base href="https://example.com"></head><body><a href="/page">Link</a></body></html>',
    selector: "a",
    baseUrl: "https://example.com",
  });
  assert(r.matches[0].raw.includes("https://example.com/page"));
});

// ─── New edge case tests (Phase 7) ─────────────────────────────────

await test("E17: Protocol-relative URL preserved", async () => {
  const r = await runExtractor({
    html: '<img src="//cdn.example.com/img.png">',
    selector: "img",
    baseUrl: "https://other.com",
  });
  assert(r.matches[0].raw.includes("//cdn.example.com/img.png"),
    "Protocol-relative URL should be preserved");
});

await test("E18: :not() pseudo-class", async () => {
  const r = await runExtractor({
    html: '<div class="a"><p>A</p></div><div class="b"><p>B</p></div>',
    selector: "div:not(.b)",
  });
  eq(r.matchCount, 1);
  assert(r.matches[0].raw.includes("A"));
});

await test("E19: body selector matches DOMParser wrapper (browser-dependent)", async () => {
  // linkedom may not generate body wrappers like browser DOMParser
  const r = await runExtractor({ html: "<html><body><p>Hello</p></body></html>", selector: "body" });
  assert(r.matchCount >= 1, "Should match the body element");
  assert(r.matches[0].raw.includes("<p>Hello</p>"), "Should contain original content");
});

await test("E20: Nested matches (parent and child both match)", async () => {
  const r = await runExtractor({
    html: '<div class="x"><div class="x"><p>Inner</p></div></div>',
    selector: ".x",
  });
  eq(r.matchCount, 2);
});

await test("E21: Empty attribute value extracted correctly", async () => {
  const r = await runExtractor({
    html: '<input disabled="" value="">',
    selector: "input",
    attribute: "value",
  });
  eq(r.matches[0].attribute, "");
  // Empty string is a valid attribute value — should NOT trigger warning
  eq(r.warning, undefined);
});

await test("E22: 50 rapid consecutive calls don't crash", async () => {
  for (let i = 0; i < 50; i++) {
    await runExtractor({ html: `<p>${i}</p>`, selector: "p" });
  }
  assert(true);
});

await test("E23: Plain text with no tags", async () => {
  const r = await runExtractor({ html: "just plain text", selector: "p" });
  eq(r.matchCount, 0);
  eq(r.error, undefined);
});

await test("E24: removeNodes and main selector match same elements", async () => {
  const r = await runExtractor({
    html: "<div><p>One</p><p>Two</p></div>",
    selector: "p",
    removeNodes: "p",
  });
  eq(r.matchCount, 0);
});

await test("E25: Attribute warning denominator uses displayed count, not total", async () => {
  // 100 divs, none with href, cap at 50
  const html = Array.from({ length: 100 }, () => "<div>x</div>").join("");
  const r = await runExtractor({ html, selector: "div", attribute: "href" });
  eq(r.matchCount, 100);
  eq(r.matches.length, 50);
  // Warning should reference 50 (displayed), not 100 (total)
  assert(r.warning.includes("50 of 50"), `Warning should reference displayed count, got: ${r.warning}`);
});

// ─── Report ─────────────────────────────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(" HTML Extractor engine — test results");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
results.forEach(r => console.log(r));
console.log(`\n  ${passed} passed, ${failed} failed out of ${passed + failed} tests\n`);
process.exit(failed > 0 ? 1 : 0);
