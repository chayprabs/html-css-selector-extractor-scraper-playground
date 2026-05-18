/**
 * Node smoke tests for runExtractor (PRD). Uses linkedom for DOMParser.
 */
import { parseHTML } from "linkedom";

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

await test("F1: matches li", async () => {
  const r = await runExtractor({
    html: "<ul><li>one</li><li>two</li></ul>",
    selector: "li",
    mode: "outerHTML",
  });
  eq(r.matchCount, 2);
  assert(r.matches[0].outer.includes("one"));
});

await test("F2: attribute href", async () => {
  const r = await runExtractor({
    html: '<a href="/about">About</a>',
    selector: "a",
    mode: "attribute",
    attributeName: "href",
  });
  eq(r.matches[0].attribute, "/about");
});

await test("F3: textContent", async () => {
  const r = await runExtractor({
    html: "<p>Hello <b>World</b></p>",
    selector: "p",
    mode: "textContent",
  });
  eq(r.matches[0].text, "Hello World");
});

await test("F4: pretty print outerHTML", async () => {
  const r = await runExtractor({
    html: "<div><p><span>Hi</span></p></div>",
    selector: "div",
    mode: "outerHTML",
    prettyPrint: true,
  });
  const p = r.matches[0].prettyOuter ?? r.matches[0].outer;
  assert(p.includes("\n"), "Should have newlines");
});

await test("F5: strip script", async () => {
  const r = await runExtractor({
    html: '<div><p>Hi</p><script>alert("x")</script></div>',
    selector: "div",
    mode: "outerHTML",
    stripSelectors: "script",
  });
  assert(!r.matches[0].outer.includes("script"));
});

await test("F6: base URL", async () => {
  const r = await runExtractor({
    html: '<a href="/page">Link</a>',
    selector: "a",
    mode: "outerHTML",
    baseUrl: "https://example.com",
  });
  assert(r.matches[0].outer.includes("https://example.com/page"));
});

await test("E1: empty selector", async () => {
  const r = await runExtractor({ html: "<div/>", selector: "", mode: "outerHTML" });
  eq(r.matchCount, 0);
});

await test("E2: invalid selector", async () => {
  const r = await runExtractor({ html: "<div/>", selector: "##bad", mode: "outerHTML" });
  assert(r.error?.includes("Invalid"));
});

await test("E3: javascript URL blocked with base", async () => {
  const r = await runExtractor({
    html: '<a href="javascript:void(0)">x</a>',
    selector: "a",
    mode: "outerHTML",
    baseUrl: "https://example.com",
  });
  assert(r.error?.includes("javascript"));
});

await test("E4: innerHTML mode", async () => {
  const r = await runExtractor({
    html: "<div><span>x</span></div>",
    selector: "div",
    mode: "innerHTML",
  });
  assert(r.matches[0].inner.includes("span"));
});

await test("E5: whole-document rewrite visible on nested href", async () => {
  const r = await runExtractor({
    html: '<div><a href="/inner">x</a></div>',
    selector: "div",
    mode: "outerHTML",
    baseUrl: "https://example.com",
  });
  assert(r.matches[0].outer.includes("https://example.com/inner"));
});

console.log("\n━━━ HTML Extractor — test-extractor.mjs ━━━\n");
results.forEach((x) => console.log(x));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
