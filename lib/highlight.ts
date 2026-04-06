/**
 * Prism.js setup for syntax highlighting HTML output.
 * Imports only the HTML/markup grammar to keep bundle size small.
 */

import Prism from "prismjs/components/prism-core";
import "prismjs/components/prism-markup";

/**
 * Returns syntax-highlighted HTML string using Prism's markup grammar.
 * The returned string contains <span> elements with Prism CSS classes.
 */
export function highlightHtml(code: string): string {
  return Prism.highlight(code, Prism.languages["markup"], "markup");
}

/**
 * Highlight plain text — just escapes HTML entities so it renders safely.
 */
export function highlightText(code: string): string {
  return escapeHtml(code);
}

/** Escapes HTML entities for safe innerHTML insertion. Single quotes not escaped — output is never placed in an attribute context. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
