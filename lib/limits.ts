/**
 * Limits aligned with PRD §12 / §19 (plus defensive DOM guards).
 */

export const LIMITS = {
  HTML_MAX_BYTES: 524_288,
  HTML_WARN_BYTES: 409_600,

  HTML_MAX_ELEMENTS: 50_000,
  HTML_MAX_NESTING_DEPTH: 200,
  HTML_MAX_ATTRIBUTE_VALUE_BYTES: 100_000,

  SELECTOR_MAX_LENGTH: 500,
  SELECTOR_TIMEOUT_MS: 3000,

  /** Max elements materialized per extraction (matchCount still reports full total). */
  MAX_MATCHES: 2_000,

  OUTPUT_DISPLAY_MAX_CHARS: 50_000,
  HIGHLIGHT_MAX_CHARS: 100_000,

  PRETTY_PRINT_MAX_BYTES: 200_000,

  BASE_URL_MAX_LENGTH: 2000,
  BASE_URL_ALLOWED_SCHEMES: ["http", "https"] as const,

  ATTRIBUTE_NAME_MAX_LENGTH: 100,

  ENGINE_DEBOUNCE_MS: 400,
  URL_SYNC_DEBOUNCE_MS: 500,
  URL_STATE_MAX_CHARS: 6000,
} as const;

export type LimitViolation = {
  code: string;
  message: string;
  severity: "warn" | "block";
  input: "html" | "selector" | "attribute" | "stripSelectors" | "baseUrl" | "engine";
};

export type ValidationResult = {
  valid: boolean;
  violation?: LimitViolation;
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
