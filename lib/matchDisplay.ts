import type { MatchResult } from "./extractor";
import type { ExtractionMode } from "@/types/options";

/** Single line of output for one match (mirrors extractor join logic). */
export function displayLineForMatch(
  m: MatchResult,
  mode: ExtractionMode,
  prettyPrint: boolean,
): string {
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
