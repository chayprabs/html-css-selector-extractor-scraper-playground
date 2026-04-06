/**
 * HTML Extractor engine — pure function, no side effects.
 *
 * Uses the browser's native DOMParser and querySelectorAll.
 *
 * Options: attribute, textOnly, prettyPrint, ignoreWhitespace, removeNodes, baseUrl
 *
 * Processing order:
 *   1. Parse HTML into detached document via DOMParser (or use cached doc)
 *   2. Remove nodes matching removeNodes selector
 *   3. Run main CSS selector query
 *   4. For each match: rewrite URLs if baseUrl set
 *   5. Extract output per priority: attribute > textOnly > prettyPrint > raw HTML
 */

import { LIMITS, formatBytes } from "./limits";
import { validateRemoveNodesCount, validateParsedDocument } from "./validators";

// ─── Types ───────────────────────────────────────────────────────────

export type ExtractorInput = {
  html: string;
  selector: string;
  attribute?: string;
  textOnly?: boolean;
  prettyPrint?: boolean;
  removeNodes?: string;
  baseUrl?: string;
  ignoreWhitespace?: boolean;
  /** Pre-parsed document to avoid re-parsing HTML on every call */
  parsedDoc?: Document;
};

export type MatchResult = {
  index: number;
  raw: string;
  text: string;
  attribute?: string;
  pretty?: string;
  prettyPrintSkipped?: boolean;
  highlightSkipped?: boolean;
};

export type ExtractorOutput = {
  matches: MatchResult[];
  matchCount: number;
  error?: string;
  warning?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────

/** Parse HTML into a detached Document. DOMParser never executes scripts. */
export function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

// ─── Main engine ─────────────────────────────────────────────────────

export async function runExtractor(input: ExtractorInput): Promise<ExtractorOutput> {
  const { html, selector, attribute, textOnly, prettyPrint, removeNodes, baseUrl, ignoreWhitespace, parsedDoc } = input;

  // Empty or whitespace-only selector → return empty state, no error
  if (!selector || !selector.trim()) {
    return { matches: [], matchCount: 0 };
  }

  // No HTML to process → empty state
  if (!html || !html.trim()) {
    return { matches: [], matchCount: 0 };
  }

  // Use cached document (cloned to avoid mutation) or parse fresh.
  // Clone is necessary because removeNodes mutates the document.
  const doc = parsedDoc
    ? parsedDoc.cloneNode(true) as Document
    : parseHtml(html);

  // Validate parsed document structure (element count, nesting depth, attribute sizes)
  const docValidation = validateParsedDocument(doc);
  if (!docValidation.valid) {
    return {
      matches: [],
      matchCount: 0,
      error: docValidation.violation?.message,
    };
  }

  // Step 1: Remove nodes before running the main selector
  if (removeNodes && removeNodes.trim()) {
    try {
      const toRemove = doc.querySelectorAll(removeNodes.trim());

      // Guard: check removal count before proceeding
      const removeCheck = validateRemoveNodesCount(toRemove.length);
      if (!removeCheck.valid) {
        return {
          matches: [],
          matchCount: 0,
          warning: removeCheck.violation?.message,
        };
      }

      toRemove.forEach((n) => n.remove());
    } catch {
      // Invalid remove selector — silently skip, don't fail the whole query
    }
  }

  // Step 2: Run the main CSS selector
  let elements: Element[];
  try {
    elements = Array.from(doc.querySelectorAll(selector.trim()));
  } catch {
    return {
      matches: [],
      matchCount: 0,
      error: `Invalid CSS selector: ${selector}`,
    };
  }

  const totalCount = elements.length;
  if (totalCount === 0) {
    return { matches: [], matchCount: 0 };
  }

  // Warn if selector matched document wrapper elements
  let warning: string | undefined;
  if (elements.some(el => ["HTML", "HEAD", "BODY"].includes(el.tagName))) {
    warning = "Selector matched a document wrapper element (html/head/body). Results include DOMParser-generated wrappers.";
  }

  // Step 3: Process each matched element
  let missingAttrCount = 0;

  // Cap to RESULTS_MAX_PROCESS to limit computation
  const processElements = elements.slice(0, LIMITS.RESULTS_MAX_PROCESS);

  // Warn if we're processing fewer than total
  if (totalCount > LIMITS.RESULTS_MAX_PROCESS) {
    warning = `Found ${totalCount.toLocaleString()} matches. Processing first ${LIMITS.RESULTS_MAX_PROCESS} only.`;
  }

  // Lazy-load js-beautify only when prettyPrint is enabled
  let htmlBeautify: ((html: string, options: Record<string, unknown>) => string) | null = null;
  if (prettyPrint) {
    try {
      const mod = await import("js-beautify");
      // Handle both ESM default export and direct named exports
      const fn = mod.default?.html ?? mod.html;
      if (typeof fn === "function") htmlBeautify = fn;
    } catch {
      // Fallback: pretty print unavailable
    }
  }

  const matches: MatchResult[] = [];
  let totalOutputBytes = 0;

  for (let i = 0; i < processElements.length; i++) {
    const el = processElements[i];

    // Check total output byte budget
    if (totalOutputBytes > LIMITS.OUTPUT_TOTAL_MAX_BYTES) {
      warning = `Output truncated to ${matches.length} matches to prevent browser slowdown.`;
      break;
    }

    // Clone so mutations don't affect sibling matches
    const clone = el.cloneNode(true) as Element;

    // Rewrite relative URLs if baseUrl is set
    if (baseUrl && baseUrl.trim()) {
      rewriteUrls(clone, baseUrl.trim());
    }

    const raw = clone.outerHTML;
    let text = clone.textContent ?? "";

    // Guard: skip overly large single matches
    if (raw.length > LIMITS.RESULT_MAX_BYTES) {
      // Still include it but truncate for display
      const truncated = raw.slice(0, LIMITS.RESULT_MAX_BYTES);
      const result: MatchResult = {
        index: i,
        raw: truncated + `\n\n<!-- Truncated: element is ${formatBytes(raw.length)} -->`,
        text: text.slice(0, LIMITS.RESULT_MAX_BYTES),
        prettyPrintSkipped: true,
        highlightSkipped: true,
      };
      matches.push(result);
      totalOutputBytes += LIMITS.RESULT_MAX_BYTES;
      continue;
    }

    // Collapse whitespace if ignoreWhitespace is on
    if (ignoreWhitespace) {
      text = text.replace(/\s+/g, " ").trim();
    }

    const result: MatchResult = { index: i, raw, text };

    // Extract attribute if requested
    if (attribute && attribute.trim()) {
      const val = clone.getAttribute(attribute.trim());
      if (val === null) {
        missingAttrCount++;
        result.attribute = "";
      } else {
        result.attribute = val;
      }
    }

    // Pretty print if requested — with size guard
    if (prettyPrint && htmlBeautify) {
      if (raw.length > LIMITS.PRETTY_PRINT_MAX_BYTES) {
        result.prettyPrintSkipped = true;
        result.pretty = raw; // fall back to raw HTML
      } else {
        result.pretty = htmlBeautify(raw, {
          indent_size: 2,
          indent_char: " ",
          wrap_line_length: 0,
          preserve_newlines: false,
          indent_inner_html: true,
          unformatted: [],
        });
      }
    }

    // Mark highlight skip for large matches (enforced in MatchCard)
    if (raw.length > LIMITS.HIGHLIGHT_MAX_BYTES) {
      result.highlightSkipped = true;
    }

    matches.push(result);
    totalOutputBytes += raw.length + text.length + (result.pretty?.length ?? 0);
  }

  // Set warning if some elements were missing the requested attribute
  if (missingAttrCount > 0) {
    warning = `Attribute "${attribute}" not found on ${missingAttrCount} of ${processElements.length} element${processElements.length > 1 ? "s" : ""}`;
  }

  // Return only RESULTS_MAX_DISPLAY for rendering, but report full matchCount
  const displayMatches = matches.slice(0, LIMITS.RESULTS_MAX_DISPLAY);

  return { matches: displayMatches, matchCount: totalCount, warning };
}

// ─── URL rewriting ───────────────────────────────────────────────────

/**
 * Rewrites relative href and src attributes on an element and its descendants.
 * Covers a, link, area (href) and img, script, etc. (src).
 * Skips absolute URLs, protocol-relative URLs, data URIs, and anchors.
 */
function rewriteUrls(element: Element, baseUrl: string): void {
  const rewrite = (el: Element, attr: string) => {
    const val = el.getAttribute(attr);
    if (!val) return;

    // Skip already-absolute, protocol-relative, data URIs, and anchors
    if (/^(https?:\/\/|\/\/|data:|mailto:|tel:|#|javascript:)/i.test(val)) return;

    try {
      const resolved = new URL(val, baseUrl).toString();
      el.setAttribute(attr, resolved);
    } catch {
      // Invalid URL — leave unchanged
    }
  };

  // Rewrite on the element itself
  rewrite(element, "href");
  rewrite(element, "src");

  // Rewrite on all descendants with href or src
  element.querySelectorAll("[href]").forEach((el) => rewrite(el, "href"));
  element.querySelectorAll("[src]").forEach((el) => rewrite(el, "src"));
}
