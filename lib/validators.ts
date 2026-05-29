/**
 * Input validators — PRD §10 messages where applicable.
 */

import { LIMITS, type LimitViolation, type ValidationResult, formatBytes } from "./limits";

/** Split strip selectors: commas or newlines (PRD §5.3). */
export function splitSelectorList(input: string): string[] {
  const results: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === "'" && !inDouble) {
      inSingle = !inSingle;
      current += c;
      continue;
    }
    if (c === '"' && !inSingle) {
      inDouble = !inDouble;
      current += c;
      continue;
    }
    if (!inSingle && !inDouble && (c === "," || c === "\n")) {
      const trimmed = current.trim();
      if (trimmed) results.push(trimmed);
      current = "";
      continue;
    }
    current += c;
  }

  const trimmed = current.trim();
  if (trimmed) results.push(trimmed);
  return results;
}

/**
 * Browser-native selector validation (PRD §8 step 1).
 * Returns an error message from the browser, or undefined if valid.
 */
export function trySelectorSyntax(selector: string): string | undefined {
  const s = selector.trim();
  if (!s) return undefined;
  try {
    if (typeof document !== "undefined" && typeof document.createDocumentFragment === "function") {
      document.createDocumentFragment().querySelectorAll(s);
    } else if (typeof DOMParser !== "undefined") {
      const probe = new DOMParser().parseFromString("<!DOCTYPE html><html><body></body></html>", "text/html");
      probe.querySelectorAll(s);
    } else {
      return "Selector validation is unavailable in this environment.";
    }
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  return undefined;
}

// ─── HTML ───────────────────────────────────────────────────────────

export function validateHtml(html: string): ValidationResult {
  const byteLength = new TextEncoder().encode(html).length;

  if (byteLength > LIMITS.HTML_MAX_BYTES) {
    return {
      valid: false,
      violation: {
        code: "HTML_TOO_LARGE",
        message: "Input exceeds the 512 KB limit.",
        severity: "block",
        input: "html",
      },
    };
  }

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

  let ampCount = 0;
  for (let i = 0; i < html.length; i++) {
    if (html.charCodeAt(i) === 38) ampCount++;
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

  if (byteLength > LIMITS.HTML_WARN_BYTES) {
    return {
      valid: true,
      violation: {
        code: "HTML_LARGE",
        message: "Large input — processing may be slow",
        severity: "warn",
        input: "html",
      },
    };
  }

  return { valid: true };
}

export function validateParsedDocument(doc: Document): ValidationResult {
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

function measureMaxDepth(doc: Document): number {
  const root = doc.documentElement;
  if (!root) return 0;

  let maxDepth = 0;
  const stack: Array<{ node: Element; depth: number }> = [{ node: root, depth: 1 }];

  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    if (depth > maxDepth) maxDepth = depth;
    if (maxDepth > LIMITS.HTML_MAX_NESTING_DEPTH) return maxDepth;

    const children = node.children;
    for (let i = 0; i < children.length; i++) {
      stack.push({ node: children[i], depth: depth + 1 });
    }
  }

  return maxDepth;
}

// ─── Selector ───────────────────────────────────────────────────────

export function validateSelectorLength(selector: string): ValidationResult {
  if (selector.length > LIMITS.SELECTOR_MAX_LENGTH) {
    return {
      valid: false,
      violation: {
        code: "SELECTOR_TOO_LONG",
        message: "Selector is too long.",
        severity: "block",
        input: "selector",
      },
    };
  }

  if (/^[\s,]+$/.test(selector)) {
    return {
      valid: false,
      violation: {
        code: "SELECTOR_INVALID",
        message: "Enter a CSS selector.",
        severity: "block",
        input: "selector",
      },
    };
  }

  return { valid: true };
}

/** Length checks + live selector engine validation (PRD §10). */
export function validateSelector(selector: string): ValidationResult {
  const len = validateSelectorLength(selector);
  if (!len.valid) return len;

  const s = selector.trim();
  if (!s) {
    return {
      valid: false,
      violation: {
        code: "SELECTOR_EMPTY",
        message: "Enter a CSS selector.",
        severity: "block",
        input: "selector",
      },
    };
  }

  const syn = trySelectorSyntax(s);
  if (syn) {
    return {
      valid: false,
      violation: {
        code: "SELECTOR_INVALID",
        message: `Invalid selector: ${syn}`,
        severity: "block",
        input: "selector",
      },
    };
  }

  return { valid: true };
}

// ─── Attribute name ─────────────────────────────────────────────────

export function validateAttributeName(name: string): ValidationResult {
  if (!name.trim()) {
    return {
      valid: false,
      violation: {
        code: "ATTRIBUTE_EMPTY",
        message: "Enter an attribute name.",
        severity: "block",
        input: "attribute",
      },
    };
  }

  if (name.length > LIMITS.ATTRIBUTE_NAME_MAX_LENGTH) {
    return {
      valid: false,
      violation: {
        code: "ATTRIBUTE_TOO_LONG",
        message: `Attribute name is too long (max ${LIMITS.ATTRIBUTE_NAME_MAX_LENGTH} characters).`,
        severity: "block",
        input: "attribute",
      },
    };
  }

  if (!/^[a-zA-Z0-9\-_:.]+$/.test(name)) {
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

  if (/^on/i.test(name)) {
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

// ─── Base URL ───────────────────────────────────────────────────────

export function validateBaseUrl(url: string): ValidationResult {
  if (!url.trim()) return { valid: true };

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

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      valid: false,
      violation: {
        code: "BASE_URL_INVALID",
        message: "Invalid base URL. Use a full URL like https://example.com",
        severity: "block",
        input: "baseUrl",
      },
    };
  }

  const protocol = parsed.protocol;
  const allowedProtocols = LIMITS.BASE_URL_ALLOWED_SCHEMES.map((s) => `${s}:`);
  if (!allowedProtocols.includes(protocol)) {
    return {
      valid: false,
      violation: {
        code: "BASE_URL_BAD_SCHEME",
        message: "Invalid base URL. Use a full URL like https://example.com",
        severity: "block",
        input: "baseUrl",
      },
    };
  }

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

// ─── Strip selectors ────────────────────────────────────────────────

export function validateStripSelectorsField(field: string): ValidationResult {
  if (!field.trim()) return { valid: true };

  const parts = splitSelectorList(field);
  for (const part of parts) {
    if (part.length > LIMITS.SELECTOR_MAX_LENGTH) {
      return {
        valid: false,
        violation: {
          code: "STRIP_SELECTOR_TOO_LONG",
          message: `Invalid strip selector: ${part}`,
          severity: "block",
          input: "stripSelectors",
        },
      };
    }

    const syn = trySelectorSyntax(part);
    if (syn) {
      return {
        valid: false,
        violation: {
          code: "STRIP_SELECTOR_INVALID",
          message: `Invalid strip selector: ${part}`,
          severity: "block",
          input: "stripSelectors",
        },
      };
    }
  }

  return { valid: true };
}
