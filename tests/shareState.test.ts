import { describe, it, expect } from "vitest";
import { encodeWorkspaceHash, decodeWorkspaceHash, type WorkspaceSnapshot } from "@/lib/shareState";
import { defaultOptions } from "@/types/options";

describe("shareState", () => {
  it("round-trip encode/decode", () => {
    const snap: WorkspaceSnapshot = {
      v: 1,
      html: "<p>hi</p>",
      selector: "p",
      options: { ...defaultOptions, mode: "textContent" },
    };
    const { hashFragment, tooLarge } = encodeWorkspaceHash(snap);
    expect(tooLarge).toBe(false);
    const decoded = decodeWorkspaceHash(hashFragment);
    expect(decoded?.html).toBe(snap.html);
    expect(decoded?.selector).toBe(snap.selector);
    expect(decoded?.options.mode).toBe("textContent");
  });

  it("returns null for garbage hash", () => {
    expect(decodeWorkspaceHash("#state=not-valid")).toBeNull();
  });

  it("flags state over URL size guard", () => {
    let html = "";
    let tooLarge = false;
    let hashFragment = "";
    for (let i = 0; i < 20 && !tooLarge; i++) {
      html += "<p>" + "content-".repeat(50_000) + "</p>";
      const snap: WorkspaceSnapshot = {
        v: 1,
        html,
        selector: "p",
        options: defaultOptions,
      };
      ({ tooLarge, hashFragment } = encodeWorkspaceHash(snap));
    }
    expect(tooLarge).toBe(true);
    expect(hashFragment).toBe("");
  });
});
