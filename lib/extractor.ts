/**
 * HTML Extractor engine — PRD §8 order:
 * 1) Validate main selector (caller / trySelectorSyntax before parse)
 * 2) Parse HTML
 * 3) Strip selectors on document clone
 * 4) Rewrite ALL href/src on document when baseUrl set; reject javascript:
 * 5) querySelectorAll(main selector)
 * 6) Extract per mode; pretty-print only outerHTML/innerHTML
 * 7) Join matches (\n---\n vs \n)
 */

import { LIMITS } from "./limits";
import { validateParsedDocument, splitSelectorList, trySelectorSyntax } from "./validators";
import type { ExtractionMode } from "../types/options";

export type ExtractorInput = {
  html: string;
  selector: string;
  mode: ExtractionMode;
  attributeName?: string;
  stripSelectors?: string;
  baseUrl?: string;
  prettyPrint?: boolean;
  parsedDoc?: Document;
};

export type MatchResult = {
  index: number;
  outer: string;
  inner: string;
  text: string;
  attribute?: string;
  prettyOuter?: string;
  prettyInner?: string;
};

export type ExtractorOutput = {
  matches: MatchResult[];
  matchCount: number;
  joinedOutput: string;
  error?: string;
  warning?: string;
};

export const JOIN_SEPARATOR_HTML = "\n---\n";
export const JOIN_SEPARATOR_TEXT = "\n";

export function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function normalizeTextContent(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function documentHasJavascriptUrl(doc: Document): boolean {
  const check = (val: string | null) => !!val && /^javascript:/i.test(val.trim());
  const els = doc.querySelectorAll("[href],[src]");
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (check(el.getAttribute("href"))) return true;
    if (check(el.getAttribute("src"))) return true;
  }
  return false;
}

/** Rewrite relative href/src across the entire document (PRD §8 step 4). */
export function rewriteUrlsOnDocument(doc: Document, baseUrl: string): void {
  doc.querySelectorAll("*").forEach((el) => {
    if (el.hasAttribute("href")) rewriteAttr(el, "href", baseUrl);
    if (el.hasAttribute("src")) rewriteAttr(el, "src", baseUrl);
  });
}

function rewriteAttr(el: Element, attr: "href" | "src", baseUrl: string): void {
  const val = el.getAttribute(attr);
  if (!val) return;
  const t = val.trim();
  if (/^(https?:\/\/|\/\/|data:|mailto:|tel:|#)/i.test(t)) return;
  if (/^javascript:/i.test(t)) return;
  try {
    el.setAttribute(attr, new URL(val, baseUrl).href);
  } catch {
    /* leave unchanged */
  }
}

function pickJoinedLine(m: MatchResult, mode: ExtractionMode, prettyPrint: boolean): string {
  switch (mode) {
    case "outerHTML":
      return prettyPrint ? (m.prettyOuter ?? m.outer) : m.outer;
    case "innerHTML":
      return prettyPrint ? (m.prettyInner ?? m.inner) : m.inner;
    case "textContent":
      return m.text;
    case "attribute":
      return m.attribute ?? "";
    default:
      return m.outer;
  }
}

function joinLines(lines: string[], mode: ExtractionMode): string {
  const sep =
    mode === "textContent" || mode === "attribute" ? JOIN_SEPARATOR_TEXT : JOIN_SEPARATOR_HTML;
  return lines.join(sep);
}

export async function runExtractor(input: ExtractorInput): Promise<ExtractorOutput> {
  const {
    html,
    selector,
    mode,
    attributeName,
    stripSelectors,
    baseUrl,
    prettyPrint,
    parsedDoc,
  } = input;

  const sel = selector.trim();
  if (!sel) {
    return { matches: [], matchCount: 0, joinedOutput: "" };
  }

  const selectorError = trySelectorSyntax(sel);
  if (selectorError) {
    return {
      matches: [],
      matchCount: 0,
      joinedOutput: "",
      error: `Invalid selector: ${selectorError}`,
    };
  }

  const htmlTrim = html?.trim() ?? "";
  if (!htmlTrim) {
    return { matches: [], matchCount: 0, joinedOutput: "", error: "Paste some HTML to get started." };
  }

  const docSource = parsedDoc ?? parseHtml(html);
  const doc = docSource.cloneNode(true) as Document;

  const docValidation = validateParsedDocument(doc);
  if (!docValidation.valid) {
    return {
      matches: [],
      matchCount: 0,
      joinedOutput: "",
      error: docValidation.violation?.message,
    };
  }

  const stripParts = stripSelectors ? splitSelectorList(stripSelectors) : [];
  for (const stripSel of stripParts) {
    try {
      doc.querySelectorAll(stripSel).forEach((n) => n.remove());
    } catch {
      return {
        matches: [],
        matchCount: 0,
        joinedOutput: "",
        error: `Invalid strip selector: ${stripSel}`,
      };
    }
  }

  if (baseUrl?.trim()) {
    rewriteUrlsOnDocument(doc, baseUrl.trim());
    if (documentHasJavascriptUrl(doc)) {
      return {
        matches: [],
        matchCount: 0,
        joinedOutput: "",
        error: "javascript: URLs are not supported.",
      };
    }
  }

  let elements: Element[];
  try {
    elements = Array.from(doc.querySelectorAll(sel));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      matches: [],
      matchCount: 0,
      joinedOutput: "",
      error: `Invalid selector: ${msg}`,
    };
  }

  const totalCount = elements.length;
  if (totalCount === 0) {
    return { matches: [], matchCount: 0, joinedOutput: "" };
  }

  let warning: string | undefined;
  if (elements.some((el) => ["HTML", "HEAD", "BODY"].includes(el.tagName))) {
    warning =
      "Selector matched a document wrapper element (html/head/body). Results include DOMParser-generated wrappers.";
  }

  const usePretty =
    prettyPrint && (mode === "outerHTML" || mode === "innerHTML");

  let htmlBeautify: ((html: string, options: Record<string, unknown>) => string) | null = null;
  if (usePretty) {
    try {
      const mod = await import("js-beautify");
      const fn = mod.default?.html ?? mod.html;
      if (typeof fn === "function") htmlBeautify = fn;
    } catch {
      /* optional */
    }
  }

  const matches: MatchResult[] = [];
  let missingAttrCount = 0;

  const attrName = attributeName?.trim();

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const clone = el.cloneNode(true) as Element;

    const outer = clone.outerHTML;
    const inner = clone.innerHTML;
    let text = normalizeTextContent(clone.textContent ?? "");

    const result: MatchResult = { index: i, outer, inner, text };

    if (mode === "attribute") {
      if (!attrName) {
        result.attribute = "";
      } else {
        const val = clone.getAttribute(attrName);
        if (val === null) {
          missingAttrCount++;
          result.attribute = "";
        } else {
          result.attribute = val;
        }
      }
    }

    if (usePretty && htmlBeautify) {
      if (outer.length <= LIMITS.PRETTY_PRINT_MAX_BYTES) {
        result.prettyOuter = htmlBeautify(outer, {
          indent_size: 2,
          indent_char: " ",
          wrap_line_length: 0,
          preserve_newlines: false,
          indent_inner_html: true,
          unformatted: [],
        });
      }
      if (inner.length <= LIMITS.PRETTY_PRINT_MAX_BYTES) {
        result.prettyInner = htmlBeautify(inner, {
          indent_size: 2,
          indent_char: " ",
          wrap_line_length: 0,
          preserve_newlines: false,
          indent_inner_html: true,
          unformatted: [],
        });
      }
    }

    matches.push(result);
  }

  if (missingAttrCount > 0 && attrName) {
    warning = `Attribute "${attrName}" not found on ${missingAttrCount} of ${matches.length} element${matches.length > 1 ? "s" : ""}`;
  }

  const lines = matches.map((m) => pickJoinedLine(m, mode, !!usePretty && !!htmlBeautify));
  const joinedOutput = joinLines(lines, mode);

  return { matches, matchCount: totalCount, joinedOutput, warning };
}
