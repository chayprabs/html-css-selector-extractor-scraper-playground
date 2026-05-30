import { describe, it, expect } from "vitest";
import { runExtractor } from "@/lib/extractor";
import { LIMITS } from "@/lib/limits";

describe("match cap", () => {
  it("caps materialized matches but reports full matchCount", async () => {
    const items = Array.from({ length: LIMITS.MAX_MATCHES + 50 }, (_, i) => `<li id="n${i}">${i}</li>`).join(
      "",
    );
    const html = `<ul>${items}</ul>`;
    const result = await runExtractor({ html, selector: "li", mode: "textContent" });

    expect(result.matchCount).toBe(LIMITS.MAX_MATCHES + 50);
    expect(result.matches.length).toBe(LIMITS.MAX_MATCHES);
    expect(result.warning).toContain("Showing first");
  });
});
