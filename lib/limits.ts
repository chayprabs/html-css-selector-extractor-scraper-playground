/**
 * Rate limiting & abuse prevention — single source of truth for all limits.
 *
 * ATTACK SURFACE MAP:
 *
 * Input 1: HTML textarea (HtmlInput.tsx)
 *   → Size attacks (50MB paste freezes DOMParser)
 *   → Deep nesting (100k levels overflows call stack during traversal)
 *   → Element count (1M elements matching selector freezes results loop)
 *   → Large attribute values (10MB single attr value)
 *   → Entity bombs (&amp; x100,000)
 *   → Null bytes (\x00)
 *
 * Input 2: CSS selector (SelectorBar.tsx)
 *   → Pathological selectors (deeply nested descendants, nested :not(), universal + nth-child)
 *   → Long selector strings (10,000 chars)
 *   → Thousands of comma-separated parts
 *   → Selector complexity causing querySelectorAll to hang 30+ seconds
 *
 * Input 3: Attribute flag (ControlPanel.tsx)
 *   → Invalid characters / injection attempts
 *   → Event handler names (on*) extracting executable code
 *   → Extremely long attribute names
 *
 * Input 4: RemoveNodes selector (ControlPanel.tsx)
 *   → Same as CSS selector attacks
 *   → Mass removal (10k+ elements causing DOM thrashing)
 *
 * Input 5: Base URL (ControlPanel.tsx)
 *   → javascript: / data: / vbscript: / file: / blob: scheme injection
 *   → Extremely long URL strings
 *   → Private/internal URL probing
 *
 * Input 6: Sample loader (SampleLoader.tsx)
 *   → Controlled (hardcoded samples) — low risk, verified at build time
 */

export const LIMITS = {
  // ─── Input size limits ─────────────────────────────────────────────
  HTML_MAX_BYTES: 2 * 1024 * 1024,        // 2MB max HTML input
  HTML_MAX_ELEMENTS: 50_000,               // max elements in parsed document
  HTML_MAX_NESTING_DEPTH: 200,             // max DOM nesting depth
  HTML_MAX_ATTRIBUTE_VALUE_BYTES: 100_000, // max single attribute value length

  // ─── Selector limits ──────────────────────────────────────────────
  SELECTOR_MAX_LENGTH: 500,                // max selector string length
  SELECTOR_MAX_COMMA_PARTS: 20,            // max comma-separated selector parts
  SELECTOR_MAX_NESTING_DEPTH: 8,           // max descendant combinator depth
  SELECTOR_TIMEOUT_MS: 2000,               // kill selector eval after 2 seconds
  SELECTOR_COMPLEXITY_SCORE_MAX: 100,      // computed complexity score ceiling

  // ─── Output limits ────────────────────────────────────────────────
  RESULTS_MAX_DISPLAY: 50,                 // max match cards shown
  RESULTS_MAX_PROCESS: 200,                // max matches to even process
  RESULT_MAX_BYTES: 500_000,               // max size of single match output
  PRETTY_PRINT_MAX_BYTES: 200_000,         // max input size for pretty-print
  HIGHLIGHT_MAX_BYTES: 100_000,            // max input size for syntax highlight
  OUTPUT_TOTAL_MAX_BYTES: 5 * 1024 * 1024, // 5MB total output cap

  // ─── Rate limits ──────────────────────────────────────────────────
  ENGINE_MIN_INTERVAL_MS: 300,             // min time between engine runs
  ENGINE_MAX_RUNS_PER_MINUTE: 60,          // max engine invocations per minute
  PASTE_MIN_INTERVAL_MS: 100,              // min time between paste events

  // ─── Base URL limits ──────────────────────────────────────────────
  BASE_URL_MAX_LENGTH: 2000,               // max base URL string length
  BASE_URL_ALLOWED_SCHEMES: ['http', 'https'] as const,

  // ─── Remove nodes limits ──────────────────────────────────────────
  REMOVE_NODES_MAX_REMOVALS: 10_000,       // max elements to remove
} as const;

// ─── Types ────────────────────────────────────────────────────────────

export type LimitViolation = {
  code: string;
  message: string;
  severity: 'warn' | 'block';
  input: 'html' | 'selector' | 'attribute' | 'removeNodes' | 'baseUrl' | 'engine';
};

export type ValidationResult = {
  valid: boolean;
  violation?: LimitViolation;
};

// ─── Helpers ──────────────────────────────────────────────────────────

/** Returns human-readable size: "2.3 MB", "450 KB", "128 B" */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
