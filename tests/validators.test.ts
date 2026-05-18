import { describe, it, expect } from "vitest";
import {
  validateHtml,
  validateSelector,
  validateAttributeName,
  validateBaseUrl,
  validateStripSelectorsField,
  splitSelectorList,
} from "@/lib/validators";
import { LIMITS } from "@/lib/limits";

describe("validateHtml", () => {
  it("accepts small HTML", () => {
    const result = validateHtml("<div>Hello</div>");
    expect(result.valid).toBe(true);
    expect(result.violation).toBeUndefined();
  });

  it("blocks HTML over 512 KB", () => {
    const large = "x".repeat(LIMITS.HTML_MAX_BYTES + 1);
    const result = validateHtml(large);
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("HTML_TOO_LARGE");
  });

  it("warns over 400 KB", () => {
    const medium = "x".repeat(LIMITS.HTML_WARN_BYTES + 1);
    const result = validateHtml(medium);
    expect(result.valid).toBe(true);
    expect(result.violation?.severity).toBe("warn");
    expect(result.violation?.code).toBe("HTML_LARGE");
  });

  it("blocks null bytes", () => {
    expect(validateHtml("<div>\x00</div>").valid).toBe(false);
  });
});

describe("validateSelector", () => {
  it("accepts valid selectors", () => {
    expect(validateSelector("div").valid).toBe(true);
    expect(validateSelector("a[href]").valid).toBe(true);
  });

  it("blocks empty selector", () => {
    const r = validateSelector("   ");
    expect(r.valid).toBe(false);
  });

  it("blocks invalid selector", () => {
    const r = validateSelector("[[[");
    expect(r.valid).toBe(false);
    expect(r.violation?.message).toContain("Invalid selector:");
  });

  it("blocks overly long selector", () => {
    const r = validateSelector("x".repeat(LIMITS.SELECTOR_MAX_LENGTH + 1));
    expect(r.valid).toBe(false);
  });
});

describe("validateAttributeName", () => {
  it("requires non-empty", () => {
    expect(validateAttributeName(" ").valid).toBe(false);
  });

  it("accepts href", () => {
    expect(validateAttributeName("href").valid).toBe(true);
  });

  it("blocks over max length", () => {
    expect(validateAttributeName("a".repeat(LIMITS.ATTRIBUTE_NAME_MAX_LENGTH + 1)).valid).toBe(false);
  });
});

describe("validateStripSelectorsField", () => {
  it("accepts empty", () => {
    expect(validateStripSelectorsField("").valid).toBe(true);
  });

  it("accepts comma-separated valid selectors", () => {
    expect(validateStripSelectorsField("script, style").valid).toBe(true);
  });

  it("blocks invalid strip selector", () => {
    const r = validateStripSelectorsField("script, [[[");
    expect(r.valid).toBe(false);
    expect(r.violation?.message).toContain("Invalid strip selector:");
  });
});

describe("splitSelectorList", () => {
  it("splits on commas and newlines", () => {
    expect(splitSelectorList("a,\nb")).toEqual(["a", "b"]);
  });
});
