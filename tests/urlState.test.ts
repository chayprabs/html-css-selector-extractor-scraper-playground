import { describe, it, expect, beforeEach } from "vitest";
import { encodeStateToUrl, decodeStateFromUrl, isStateDefault } from "@/lib/urlState";
import { defaultOptions, type ExtractorOptions } from "@/types/options";

// Mock window.location for encodeStateToUrl
beforeEach(() => {
  Object.defineProperty(window, "location", {
    value: {
      origin: "http://localhost:3000",
      pathname: "/",
      search: "",
      href: "http://localhost:3000/",
    },
    writable: true,
    configurable: true,
  });
});

describe("encodeStateToUrl / decodeStateFromUrl", () => {
  it("round-trip: encode → decode → same state", () => {
    const opts: ExtractorOptions = {
      ...defaultOptions,
      textOnly: true,
      attribute: "href",
      baseUrl: "https://example.com",
    };
    const url = encodeStateToUrl("div.link", opts);
    const decoded = decodeStateFromUrl(new URL(url).search);

    expect(decoded.selector).toBe("div.link");
    expect(decoded.options.textOnly).toBe(true);
    expect(decoded.options.attribute).toBe("href");
    expect(decoded.options.baseUrl).toBe("https://example.com");
  });

  it("default values are not included in encoded URL", () => {
    const url = encodeStateToUrl("", defaultOptions);
    expect(url).toBe("http://localhost:3000/");
  });

  it("non-default values are included", () => {
    const opts = { ...defaultOptions, prettyPrint: true };
    const url = encodeStateToUrl("div", opts);
    expect(url).toContain("s=div");
    expect(url).toContain("p=1");
  });

  it("empty selector is not encoded", () => {
    const url = encodeStateToUrl("", { ...defaultOptions, textOnly: true });
    expect(url).not.toContain("s=");
    expect(url).toContain("t=1");
  });
});

describe("decodeStateFromUrl", () => {
  it("ignores unknown params", () => {
    const decoded = decodeStateFromUrl("?s=div&foo=bar&baz=qux");
    expect(decoded.selector).toBe("div");
    expect((decoded.options as Record<string, unknown>).foo).toBeUndefined();
  });

  it("validates params and ignores invalid ones", () => {
    // Create a selector that is too long (>500 chars)
    const longSelector = "a".repeat(501);
    const decoded = decodeStateFromUrl(`?s=${longSelector}`);
    expect(decoded.selector).toBe(""); // Blocked by validator
  });

  it("validates base URL and ignores bad schemes", () => {
    const decoded = decodeStateFromUrl("?b=javascript:alert(1)");
    expect(decoded.options.baseUrl).toBeUndefined();
  });

  it("returns empty state for no params", () => {
    const decoded = decodeStateFromUrl("");
    expect(decoded.selector).toBe("");
    expect(Object.keys(decoded.options)).toHaveLength(0);
  });
});

describe("isStateDefault", () => {
  it("returns true for empty selector and default options", () => {
    expect(isStateDefault("", defaultOptions)).toBe(true);
  });

  it("returns false when selector is set", () => {
    expect(isStateDefault("div", defaultOptions)).toBe(false);
  });

  it("returns false when an option differs", () => {
    expect(isStateDefault("", { ...defaultOptions, textOnly: true })).toBe(false);
  });
});
