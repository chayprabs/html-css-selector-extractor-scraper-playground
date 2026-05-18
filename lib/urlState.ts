/**
 * Legacy query-string sharing (?s=&a=&…) retained for backward compatibility (PRD §9 migration).
 */

import { defaultOptions, type ExtractorOptions } from "@/types/options";
import {
  validateSelectorLength,
  trySelectorSyntax,
  validateAttributeName,
  validateBaseUrl,
  validateStripSelectorsField,
} from "./validators";

/** Decode pre-hash legacy URLs into selector + partial options. */
export function decodeLegacyQueryParams(search: string): {
  selector: string;
  options: Partial<ExtractorOptions>;
} {
  const result: { selector: string; options: Partial<ExtractorOptions> } = {
    selector: "",
    options: {},
  };

  try {
    const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);

    const s = params.get("s");
    if (s) {
      const len = validateSelectorLength(s);
      if (len.valid) {
        const syn = trySelectorSyntax(s);
        if (!syn) result.selector = s;
      }
    }

    const a = params.get("a");
    if (a?.trim()) {
      const v = validateAttributeName(a);
      if (v.valid || v.violation?.severity === "warn") {
        result.options.mode = "attribute";
        result.options.attributeName = a;
        result.options.prettyPrint = false;
      }
    }

    const legacyText = params.get("t") === "1";
    const legacyPretty = params.get("p") === "1";
    const r = params.get("r");
    const b = params.get("b");

    if (legacyText && !a?.trim()) {
      result.options.mode = "textContent";
    }

    if (legacyPretty) {
      if (result.options.mode !== "attribute") {
        result.options.prettyPrint = true;
        if (!result.options.mode) result.options.mode = "outerHTML";
      }
    }

    if (r) {
      const v = validateStripSelectorsField(r);
      if (v.valid || v.violation?.severity === "warn") {
        result.options.stripSelectors = r;
      }
    }

    if (b) {
      const v = validateBaseUrl(b);
      if (v.valid || v.violation?.severity === "warn") {
        result.options.baseUrl = b;
      }
    }

    // Old URLs sometimes implied attribute mode only via `a` (handled above).
    if (!result.options.mode) {
      result.options.mode = defaultOptions.mode;
    }
  } catch {
    /* ignore */
  }

  return result;
}

export function mergeDecodedOptions(partial: Partial<ExtractorOptions>): ExtractorOptions {
  return {
    ...defaultOptions,
    ...partial,
    mode: partial.mode ?? defaultOptions.mode,
    attributeName: partial.attributeName ?? defaultOptions.attributeName,
    stripSelectors: partial.stripSelectors ?? defaultOptions.stripSelectors,
    baseUrl: partial.baseUrl ?? defaultOptions.baseUrl,
    prettyPrint: partial.prettyPrint ?? defaultOptions.prettyPrint,
  };
}

export function isWorkspaceVisiblyEmpty(html: string, selector: string, options: ExtractorOptions): boolean {
  if (html.trim() !== "") return false;
  if (selector.trim() !== "") return false;
  return (
    options.mode === defaultOptions.mode &&
    options.attributeName === defaultOptions.attributeName &&
    options.stripSelectors === defaultOptions.stripSelectors &&
    options.baseUrl === defaultOptions.baseUrl &&
    options.prettyPrint === defaultOptions.prettyPrint
  );
}
