import { describe, it, expect } from "vitest";
import { runExtractor } from "@/lib/extractor";
import { splitSelectorList } from "@/lib/validators";

describe("splitSelectorList", () => {
  it("does not split on commas inside quoted attribute selectors", () => {
    expect(splitSelectorList('[data-x="a,b"], p')).toEqual(['[data-x="a,b"]', "p"]);
  });
});

describe("strip selectors (PRD §5.3)", () => {
  it("removes comma-separated strip selectors before main query", async () => {
    const result = await runExtractor({
      html: "<body><nav>x</nav><footer>y</footer><p>keep</p></body>",
      selector: "p",
      mode: "textContent",
      stripSelectors: "nav, footer",
    });
    expect(result.matchCount).toBe(1);
    expect(result.joinedOutput).toBe("keep");
  });

  it("removes newline-separated strip selectors", async () => {
    const result = await runExtractor({
      html: "<div><script>a</script><style>b</style><span>c</span></div>",
      selector: "span",
      mode: "textContent",
      stripSelectors: "script\nstyle",
    });
    expect(result.matchCount).toBe(1);
    expect(result.joinedOutput).toBe("c");
  });
});
