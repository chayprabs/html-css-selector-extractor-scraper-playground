import { defaultOptions, type ExtractorOptions } from "@/types/options";
import {
  validateSelector,
  validateAttribute,
  validateBaseUrl,
  validateRemoveNodesSelector,
} from "./validators";

const PARAM_MAP = {
  s: "selector",
  a: "attribute",
  t: "textOnly",
  p: "prettyPrint",
  w: "ignoreWhitespace",
  r: "removeNodes",
  b: "baseUrl",
} as const;

type ParamKey = keyof typeof PARAM_MAP;

const BOOL_FIELDS = new Set(["textOnly", "prettyPrint", "ignoreWhitespace"]);

export function encodeStateToUrl(selector: string, options: ExtractorOptions): string {
  const params = new URLSearchParams();

  if (selector) params.set("s", selector);
  if (options.attribute) params.set("a", options.attribute);
  if (options.textOnly) params.set("t", "1");
  if (options.prettyPrint) params.set("p", "1");
  if (options.ignoreWhitespace) params.set("w", "1");
  if (options.removeNodes) params.set("r", options.removeNodes);
  if (options.baseUrl) params.set("b", options.baseUrl);

  const qs = params.toString();
  return window.location.origin + window.location.pathname + (qs ? "?" + qs : "");
}

export function decodeStateFromUrl(search: string): {
  selector: string;
  options: Partial<ExtractorOptions>;
} {
  const result: { selector: string; options: Partial<ExtractorOptions> } = {
    selector: "",
    options: {},
  };

  try {
    const params = new URLSearchParams(search);

    // Selector
    const s = params.get("s");
    if (s) {
      const v = validateSelector(s);
      if (!v.violation || v.violation.severity !== "block") {
        result.selector = s;
      }
    }

    // Attribute
    const a = params.get("a");
    if (a) {
      const v = validateAttribute(a);
      if (!v.violation || v.violation.severity !== "block") {
        result.options.attribute = a;
      }
    }

    // Booleans
    if (params.has("t")) result.options.textOnly = params.get("t") === "1";
    if (params.has("p")) result.options.prettyPrint = params.get("p") === "1";
    if (params.has("w")) result.options.ignoreWhitespace = params.get("w") === "1";

    // Remove nodes
    const r = params.get("r");
    if (r) {
      const v = validateRemoveNodesSelector(r);
      if (!v.violation || v.violation.severity !== "block") {
        result.options.removeNodes = r;
      }
    }

    // Base URL
    const b = params.get("b");
    if (b) {
      const v = validateBaseUrl(b);
      if (!v.violation || v.violation.severity !== "block") {
        result.options.baseUrl = b;
      }
    }
  } catch {
    // Malformed URL params — silently ignore
  }

  return result;
}

export function isStateDefault(selector: string, options: ExtractorOptions): boolean {
  if (selector) return false;
  return (
    options.textOnly === defaultOptions.textOnly &&
    options.prettyPrint === defaultOptions.prettyPrint &&
    options.ignoreWhitespace === defaultOptions.ignoreWhitespace &&
    options.attribute === defaultOptions.attribute &&
    options.removeNodes === defaultOptions.removeNodes &&
    options.baseUrl === defaultOptions.baseUrl
  );
}
