import { describe, it, expect } from "vitest";
import {
  validateHtml,
  validateSelector,
  validateAttribute,
  validateBaseUrl,
  validateRemoveNodesSelector,
  computeSelectorComplexity,
} from "@/lib/validators";

// ─── validateHtml ───────────────────────────────────────────

describe("validateHtml", () => {
  it("accepts valid HTML under 2MB", () => {
    const result = validateHtml("<div>Hello</div>");
    expect(result.valid).toBe(true);
    expect(result.violation).toBeUndefined();
  });

  it("blocks HTML over 2MB", () => {
    const large = "x".repeat(2 * 1024 * 1024 + 1);
    const result = validateHtml(large);
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("HTML_TOO_LARGE");
    expect(result.violation?.severity).toBe("block");
  });

  it("blocks HTML with null bytes", () => {
    const result = validateHtml("<div>\x00</div>");
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("HTML_NULL_BYTES");
  });

  it("blocks HTML with >50,000 ampersands", () => {
    const result = validateHtml("&".repeat(50_001));
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("HTML_ENTITY_BOMB");
  });

  it("warns on HTML between 500KB and 2MB", () => {
    const medium = "x".repeat(600 * 1024);
    const result = validateHtml(medium);
    expect(result.valid).toBe(true);
    expect(result.violation?.severity).toBe("warn");
    expect(result.violation?.code).toBe("HTML_LARGE");
  });
});

// ─── validateSelector ───────────────────────────────────────

describe("validateSelector", () => {
  it("accepts valid simple selectors", () => {
    expect(validateSelector("div").valid).toBe(true);
    expect(validateSelector(".class").valid).toBe(true);
    expect(validateSelector("#id").valid).toBe(true);
    expect(validateSelector("a[href]").valid).toBe(true);
    expect(validateSelector("div > p").valid).toBe(true);
  });

  it("blocks selectors over 500 chars", () => {
    const long = "div".repeat(200);
    const result = validateSelector(long);
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("SELECTOR_TOO_LONG");
  });

  it("blocks selectors with >20 comma parts", () => {
    const parts = Array.from({ length: 21 }, (_, i) => `div${i}`).join(",");
    const result = validateSelector(parts);
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("SELECTOR_TOO_MANY_PARTS");
  });

  it("blocks whitespace-only selector", () => {
    const result = validateSelector("   ");
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("SELECTOR_INVALID");
  });

  it("blocks comma-only selector", () => {
    const result = validateSelector(",,,");
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("SELECTOR_INVALID");
  });

  it("blocks selectors containing javascript:", () => {
    const result = validateSelector("[href*=javascript:]");
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("SELECTOR_SUSPICIOUS");
  });

  it("warns on deep descendant selectors", () => {
    const deep = "div div div div div div div div div div";
    const result = validateSelector(deep);
    expect(result.valid).toBe(true);
    expect(result.violation?.severity).toBe("warn");
  });
});

// ─── computeSelectorComplexity ──────────────────────────────

describe("computeSelectorComplexity", () => {
  it("computes correct score for simple tag", () => {
    expect(computeSelectorComplexity("div")).toBeGreaterThan(0);
  });

  it("scores class selectors higher than tags", () => {
    const tagScore = computeSelectorComplexity("div");
    const classScore = computeSelectorComplexity(".myclass");
    expect(classScore).toBeGreaterThanOrEqual(tagScore);
  });

  it(":not() adds 5 points", () => {
    const base = computeSelectorComplexity("div");
    const withNot = computeSelectorComplexity("div:not(.x)");
    expect(withNot - base).toBeGreaterThanOrEqual(5);
  });

  it(":has() adds 5 points", () => {
    const base = computeSelectorComplexity("div");
    const withHas = computeSelectorComplexity("div:has(.x)");
    expect(withHas - base).toBeGreaterThanOrEqual(5);
  });
});

// ─── validateAttribute ──────────────────────────────────────

describe("validateAttribute", () => {
  it("accepts valid attribute names", () => {
    expect(validateAttribute("href").valid).toBe(true);
    expect(validateAttribute("data-id").valid).toBe(true);
    expect(validateAttribute("class").valid).toBe(true);
  });

  it("blocks invalid character attributes", () => {
    const result = validateAttribute("my attr");
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("ATTRIBUTE_INVALID_CHARS");
  });

  it("blocks attributes over 200 chars", () => {
    const result = validateAttribute("a".repeat(201));
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("ATTRIBUTE_TOO_LONG");
  });

  it("warns on event handler attributes (on*)", () => {
    const result = validateAttribute("onclick");
    expect(result.valid).toBe(true);
    expect(result.violation?.severity).toBe("warn");
    expect(result.violation?.code).toBe("ATTRIBUTE_EVENT_HANDLER");
  });

  it("accepts empty attribute (returns valid)", () => {
    expect(validateAttribute("").valid).toBe(true);
    expect(validateAttribute("  ").valid).toBe(true);
  });
});

// ─── validateBaseUrl ────────────────────────────────────────

describe("validateBaseUrl", () => {
  it("accepts http:// URLs", () => {
    expect(validateBaseUrl("http://example.com").valid).toBe(true);
  });

  it("accepts https:// URLs", () => {
    expect(validateBaseUrl("https://example.com").valid).toBe(true);
  });

  it("blocks javascript: URLs", () => {
    const result = validateBaseUrl("javascript:alert(1)");
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("BASE_URL_BAD_SCHEME");
  });

  it("blocks data: URLs", () => {
    const result = validateBaseUrl("data:text/html,foo");
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("BASE_URL_BAD_SCHEME");
  });

  it("blocks file: URLs", () => {
    const result = validateBaseUrl("file:///etc/passwd");
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("BASE_URL_BAD_SCHEME");
  });

  it("blocks malformed URLs", () => {
    const result = validateBaseUrl("not a url");
    expect(result.valid).toBe(false);
    expect(result.violation?.code).toBe("BASE_URL_INVALID");
  });

  it("warns on private/localhost URLs", () => {
    const result = validateBaseUrl("http://localhost:3000");
    expect(result.valid).toBe(true);
    expect(result.violation?.severity).toBe("warn");
    expect(result.violation?.code).toBe("BASE_URL_PRIVATE");
  });

  it("accepts empty URL (returns valid)", () => {
    expect(validateBaseUrl("").valid).toBe(true);
  });
});

// ─── validateRemoveNodesSelector ────────────────────────────

describe("validateRemoveNodesSelector", () => {
  it("delegates to validateSelector", () => {
    expect(validateRemoveNodesSelector("script").valid).toBe(true);
  });

  it("accepts empty selector (returns valid)", () => {
    expect(validateRemoveNodesSelector("").valid).toBe(true);
    expect(validateRemoveNodesSelector("  ").valid).toBe(true);
  });

  it("blocks invalid selectors", () => {
    const long = "div".repeat(200);
    const result = validateRemoveNodesSelector(long);
    expect(result.valid).toBe(false);
  });
});
