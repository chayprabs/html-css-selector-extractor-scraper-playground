/**
 * Input validators — one function per user-controlled input.
 * Each returns { valid: boolean, violation?: LimitViolation }.
 * All validators are synchronous and pure.
 */

import { LIMITS, type LimitViolation, type ValidationResult, formatBytes } from "./limits";

// ─── HTML validators ────────────────────────────────────────────────

/** Validate raw HTML string before parsing. */
export function validateHtml(html: string): ValidationResult {
  // Check 1: Byte length (hard limit)
  const byteLength = new TextEncoder().encode(html).length;
  if (byteLength > LIMITS.HTML_MAX_BYTES) {
    return {
      valid: false,
      violation: {
        code: "HTML_TOO_LARGE",
        message: `HTML input exceeds 2MB (${formatBytes(byteLength)}). Please use a smaller snippet.`,
        severity: "block",
        input: "html",
      },
    };
  }

  // Check 2: Null bytes
  if (html.includes("\x00")) {
    return {
      valid: false,
      violation: {
        code: "HTML_NULL_BYTES",
        message: "HTML contains null bytes and cannot be processed.",
        severity: "block",
        input: "html",
      },
    };
  }

  // Check 3: Entity bomb detection
  let ampCount = 0;
  for (let i = 0; i < html.length; i++) {
    if (html.charCodeAt(i) === 38) ampCount++; // '&'
    if (ampCount > 50_000) break;
  }
  if (ampCount > 50_000) {
    return {
      valid: false,
      violation: {
        code: "HTML_ENTITY_BOMB",
        message: "HTML contains an unusual number of HTML entities.",
        severity: "block",
        input: "html",
      },
    };
  }

  // Check 4: Soft warning on large input (>500KB)
  const warnThreshold = 500 * 1024;
  if (byteLength > warnThreshold) {
    return {
      valid: true,
      violation: {
        code: "HTML_LARGE",
        message: `Large HTML input detected (${formatBytes(byteLength)}). Processing may be slow.`,
        severity: "warn",
        input: "html",
      },
    };
  }

  return { valid: true };
}

/** Validate a parsed Document (runs AFTER DOMParser on detached document). */
export function validateParsedDocument(doc: Document): ValidationResult {
  // Check 1: Total element count
  const elementCount = doc.getElementsByTagName("*").length;
  if (elementCount > LIMITS.HTML_MAX_ELEMENTS) {
    return {
      valid: false,
      violation: {
        code: "HTML_TOO_MANY_ELEMENTS",
        message: `Document contains too many elements (${elementCount.toLocaleString()} > ${LIMITS.HTML_MAX_ELEMENTS.toLocaleString()}).`,
        severity: "block",
        input: "html",
      },
    };
  }

  // Check 2: Nesting depth — ITERATIVE walk (never recursive)
  const maxDepth = measureMaxDepth(doc);
  if (maxDepth > LIMITS.HTML_MAX_NESTING_DEPTH) {
    return {
      valid: false,
      violation: {
        code: "HTML_TOO_DEEP",
        message: `Document nesting depth exceeds safe limits (${maxDepth} > ${LIMITS.HTML_MAX_NESTING_DEPTH}).`,
        severity: "block",
        input: "html",
      },
    };
  }

  // Check 3: Attribute value length — sample first 1000 elements
  const allElements = doc.getElementsByTagName("*");
  const sampleSize = Math.min(allElements.length, 1000);
  for (let i = 0; i < sampleSize; i++) {
    const el = allElements[i];
    for (let j = 0; j < el.attributes.length; j++) {
      if (el.attributes[j].value.length > LIMITS.HTML_MAX_ATTRIBUTE_VALUE_BYTES) {
        return {
          valid: false,
          violation: {
            code: "HTML_ATTR_TOO_LARGE",
            message: `An attribute value exceeds ${formatBytes(LIMITS.HTML_MAX_ATTRIBUTE_VALUE_BYTES)}.`,
            severity: "block",
            input: "html",
          },
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Measure maximum DOM nesting depth using an explicit stack (iterative).
 * CRITICAL: Never use recursion — deeply nested HTML will overflow the call stack.
 */
function measureMaxDepth(doc: Document): number {
  const root = doc.documentElement;
  if (!root) return 0;

  let maxDepth = 0;
  const stack: Array<{ node: Element; depth: number }> = [{ node: root, depth: 1 }];

  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    if (depth > maxDepth) maxDepth = depth;

    // Early exit if we already know it's too deep
    if (maxDepth > LIMITS.HTML_MAX_NESTING_DEPTH) return maxDepth;

    const children = node.children;
    for (let i = 0; i < children.length; i++) {
      stack.push({ node: children[i], depth: depth + 1 });
    }
  }

  return maxDepth;
}

// ─── Selector validators ────────────────────────────────────────────

/** Validate a CSS selector string. */
export function validateSelector(selector: string): ValidationResult {
  // Check 1: Length
  if (selector.length > LIMITS.SELECTOR_MAX_LENGTH) {
    return {
      valid: false,
      violation: {
        code: "SELECTOR_TOO_LONG",
        message: `Selector is too long (${selector.length} / max ${LIMITS.SELECTOR_MAX_LENGTH} characters).`,
        severity: "block",
        input: "selector",
      },
    };
  }

  // Check 2: Comma parts count
  const commaParts = selector.split(",").length;
  if (commaParts > LIMITS.SELECTOR_MAX_COMMA_PARTS) {
    return {
      valid: false,
      violation: {
        code: "SELECTOR_TOO_MANY_PARTS",
        message: `Selector has too many comma-separated parts (${commaParts} / max ${LIMITS.SELECTOR_MAX_COMMA_PARTS}).`,
        severity: "block",
        input: "selector",
      },
    };
  }

  // Check 5: Suspicious patterns (check before complexity — these are hard blocks)
  // Only whitespace or only commas
  if (/^[\s,]+$/.test(selector)) {
    return {
      valid: false,
      violation: {
        code: "SELECTOR_INVALID",
        message: "Selector contains only whitespace or commas.",
        severity: "block",
        input: "selector",
      },
    };
  }

  // Contains javascript: or data:
  if (/javascript\s*:|data\s*:/i.test(selector)) {
    return {
      valid: false,
      violation: {
        code: "SELECTOR_SUSPICIOUS",
        message: "Selector contains a suspicious URI scheme.",
        severity: "block",
        input: "selector",
      },
    };
  }

  // Longer than 200 chars and all the same character repeated
  if (selector.length > 200) {
    const first = selector[0];
    let allSame = true;
    for (let i = 1; i < selector.length; i++) {
      if (selector[i] !== first) { allSame = false; break; }
    }
    if (allSame) {
      return {
        valid: false,
        violation: {
          code: "SELECTOR_SUSPICIOUS",
          message: "Selector appears to be a repeated character pattern.",
          severity: "block",
          input: "selector",
        },
      };
    }
  }

  // Check 3: Descendant depth (space-separated tokens heuristic)
  const tokens = selector.split(/\s+/).filter((t) => t && t !== ">" && t !== "+" && t !== "~");
  if (tokens.length > LIMITS.SELECTOR_MAX_NESTING_DEPTH) {
    return {
      valid: true,
      violation: {
        code: "SELECTOR_DEEP",
        message: "This selector has many descendant combinators and may be slow on large documents.",
        severity: "warn",
        input: "selector",
      },
    };
  }

  // Check 4: Complexity scoring
  const score = computeSelectorComplexity(selector);
  if (score > LIMITS.SELECTOR_COMPLEXITY_SCORE_MAX) {
    return {
      valid: true, // warn, NOT block
      violation: {
        code: "SELECTOR_COMPLEX",
        message: `This selector is complex (score: ${score}) and may be slow on large documents.`,
        severity: "warn",
        input: "selector",
      },
    };
  }

  return { valid: true };
}

/** Compute a weighted complexity score for a CSS selector. */
export function computeSelectorComplexity(selector: string): number {
  let score = 0;

  // Tag selectors: bare words that aren't combinators
  const tagMatches = selector.match(/(?:^|[\s,>+~])([a-zA-Z][a-zA-Z0-9-]*)/g);
  if (tagMatches) score += tagMatches.length * 1;

  // Class selectors
  const classMatches = selector.match(/\./g);
  if (classMatches) score += classMatches.length * 2;

  // Attribute selectors
  const attrMatches = selector.match(/\[/g);
  if (attrMatches) score += attrMatches.length * 3;

  // :not()
  const notMatches = selector.match(/:not\(/gi);
  if (notMatches) score += notMatches.length * 5;

  // :has()
  const hasMatches = selector.match(/:has\(/gi);
  if (hasMatches) score += hasMatches.length * 5;

  // :nth-child()
  const nthMatches = selector.match(/:nth-child\(/gi);
  if (nthMatches) score += nthMatches.length * 3;

  // Universal selector (*) combined with other parts
  const universalMatches = selector.match(/\*/g);
  if (universalMatches) {
    // * alone is cheaper than * combined with other selectors
    const combined = selector.trim() !== "*";
    score += universalMatches.length * (combined ? 10 : 3);
  }

  // Descendant combinator (spaces between tokens, excluding explicit combinators)
  const descendantParts = selector.split(/\s+/).filter((t) => t && t !== ">" && t !== "+" && t !== "~");
  if (descendantParts.length > 1) {
    score += (descendantParts.length - 1) * 2;
  }

  // Child combinator (>)
  const childMatches = selector.match(/>/g);
  if (childMatches) score += childMatches.length * 1;

  return score;
}

// ─── Attribute validator ────────────────────────────────────────────

/** Validate an attribute name string. */
export function validateAttribute(attribute: string): ValidationResult {
  if (!attribute.trim()) return { valid: true };

  // Check 1: Length
  if (attribute.length > 200) {
    return {
      valid: false,
      violation: {
        code: "ATTRIBUTE_TOO_LONG",
        message: "Attribute name is too long (max 200 characters).",
        severity: "block",
        input: "attribute",
      },
    };
  }

  // Check 2: Valid attribute name characters
  if (!/^[a-zA-Z0-9\-_:.]+$/.test(attribute)) {
    return {
      valid: false,
      violation: {
        code: "ATTRIBUTE_INVALID_CHARS",
        message:
          "Invalid attribute name. Only letters, numbers, hyphens, underscores, colons, and dots are allowed.",
        severity: "block",
        input: "attribute",
      },
    };
  }

  // Check 3: Dangerous attribute names (warn, not block)
  if (/^on/i.test(attribute)) {
    return {
      valid: true,
      violation: {
        code: "ATTRIBUTE_EVENT_HANDLER",
        message:
          "You are extracting an event handler attribute. The extracted value will be shown as text only.",
        severity: "warn",
        input: "attribute",
      },
    };
  }

  return { valid: true };
}

// ─── Base URL validator ─────────────────────────────────────────────

/** Validate a base URL string. */
export function validateBaseUrl(url: string): ValidationResult {
  if (!url.trim()) return { valid: true };

  // Check 1: Length
  if (url.length > LIMITS.BASE_URL_MAX_LENGTH) {
    return {
      valid: false,
      violation: {
        code: "BASE_URL_TOO_LONG",
        message: `Base URL is too long (max ${LIMITS.BASE_URL_MAX_LENGTH} characters).`,
        severity: "block",
        input: "baseUrl",
      },
    };
  }

  // Check 2: Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      valid: false,
      violation: {
        code: "BASE_URL_INVALID",
        message: "Invalid URL format.",
        severity: "block",
        input: "baseUrl",
      },
    };
  }

  // Check 3: Scheme — CRITICAL
  const protocol = parsed.protocol; // includes trailing colon
  const allowedProtocols = LIMITS.BASE_URL_ALLOWED_SCHEMES.map((s) => `${s}:`);
  if (!allowedProtocols.includes(protocol)) {
    return {
      valid: false,
      violation: {
        code: "BASE_URL_BAD_SCHEME",
        message: "Only http:// and https:// URLs are allowed as base URL.",
        severity: "block",
        input: "baseUrl",
      },
    };
  }

  // Check 4: Private/internal URLs (warn only)
  const hostname = parsed.hostname;
  const isPrivate =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname);

  if (isPrivate) {
    return {
      valid: true,
      violation: {
        code: "BASE_URL_PRIVATE",
        message: "This appears to be a local/private URL.",
        severity: "warn",
        input: "baseUrl",
      },
    };
  }

  return { valid: true };
}

// ─── Remove nodes selector validator ────────────────────────────────

/** Validate a removeNodes selector string. Delegates to validateSelector with additional checks. */
export function validateRemoveNodesSelector(selector: string): ValidationResult {
  if (!selector.trim()) return { valid: true };

  // Run all standard selector checks
  return validateSelector(selector);
}

/**
 * Post-query check for removeNodes: validates the count of matched elements.
 * Called inside the engine AFTER querySelectorAll, not in the pre-flight validator.
 */
export function validateRemoveNodesCount(count: number): ValidationResult {
  if (count > LIMITS.REMOVE_NODES_MAX_REMOVALS) {
    return {
      valid: false,
      violation: {
        code: "REMOVE_NODES_TOO_MANY",
        message: `This selector would remove more than ${LIMITS.REMOVE_NODES_MAX_REMOVALS.toLocaleString()} elements. Narrow your remove selector.`,
        severity: "block",
        input: "removeNodes",
      },
    };
  }
  return { valid: true };
}
