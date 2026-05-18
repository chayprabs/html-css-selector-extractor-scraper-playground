import { describe, it, expect, beforeEach } from "vitest";
import { decodeLegacyQueryParams, mergeDecodedOptions, isWorkspaceVisiblyEmpty } from "@/lib/urlState";
import { defaultOptions } from "@/types/options";

beforeEach(() => {
  Object.defineProperty(window, "location", {
    value: { pathname: "/", search: "", origin: "http://localhost:3000", href: "http://localhost:3000/" },
    writable: true,
    configurable: true,
  });
});

describe("decodeLegacyQueryParams", () => {
  it("decodes selector", () => {
    const { selector } = decodeLegacyQueryParams("?s=div.test");
    expect(selector).toBe("div.test");
  });

  it("maps attribute param", () => {
    const { options } = decodeLegacyQueryParams("?s=a&a=href");
    expect(options.mode).toBe("attribute");
    expect(options.attributeName).toBe("href");
  });

  it("maps text mode", () => {
    const { options } = decodeLegacyQueryParams("?s=p&t=1");
    expect(options.mode).toBe("textContent");
  });
});

describe("mergeDecodedOptions", () => {
  it("fills defaults", () => {
    const merged = mergeDecodedOptions({ baseUrl: "https://x.com" });
    expect(merged.baseUrl).toBe("https://x.com");
    expect(merged.mode).toBe(defaultOptions.mode);
  });
});

describe("isWorkspaceVisiblyEmpty", () => {
  it("false when html present", () => {
    expect(isWorkspaceVisiblyEmpty("x", "", defaultOptions)).toBe(false);
  });

  it("true when all empty/default", () => {
    expect(isWorkspaceVisiblyEmpty("", "", defaultOptions)).toBe(true);
  });
});
