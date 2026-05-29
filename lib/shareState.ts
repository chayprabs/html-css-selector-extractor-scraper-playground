import LZString from "lz-string";
import { LIMITS } from "./limits";
import { validateHtml } from "./validators";
import { mergeDecodedOptions } from "./urlState";
import type { ExtractorOptions, ExtractionMode } from "@/types/options";
import { defaultOptions } from "@/types/options";

export type WorkspaceSnapshot = {
  v: 1;
  html: string;
  selector: string;
  options: ExtractorOptions;
};

const PREFIX = "state=";
const VALID_MODES: ExtractionMode[] = ["outerHTML", "innerHTML", "textContent", "attribute"];

function sanitizeOptions(raw: unknown): ExtractorOptions {
  if (!raw || typeof raw !== "object") return defaultOptions;
  const o = raw as Partial<ExtractorOptions>;
  const mode = VALID_MODES.includes(o.mode as ExtractionMode) ? o.mode! : defaultOptions.mode;
  return mergeDecodedOptions({
    mode,
    attributeName: typeof o.attributeName === "string" ? o.attributeName : defaultOptions.attributeName,
    stripSelectors: typeof o.stripSelectors === "string" ? o.stripSelectors : defaultOptions.stripSelectors,
    baseUrl: typeof o.baseUrl === "string" ? o.baseUrl : defaultOptions.baseUrl,
    prettyPrint: typeof o.prettyPrint === "boolean" ? o.prettyPrint : defaultOptions.prettyPrint,
  });
}

export function encodeWorkspaceHash(snapshot: WorkspaceSnapshot): { hashFragment: string; tooLarge: boolean } {
  const htmlCheck = validateHtml(snapshot.html);
  if (!htmlCheck.valid) {
    return { hashFragment: "", tooLarge: true };
  }

  const json = JSON.stringify(snapshot);
  const compressed = LZString.compressToEncodedURIComponent(json);
  const frag = `#${PREFIX}${compressed}`;
  if (frag.length > LIMITS.URL_STATE_MAX_CHARS) {
    return { hashFragment: "", tooLarge: true };
  }
  return { hashFragment: frag, tooLarge: false };
}

export function decodeWorkspaceHash(fullHash: string): WorkspaceSnapshot | null {
  const raw = fullHash.startsWith("#") ? fullHash.slice(1) : fullHash;
  if (!raw.startsWith(PREFIX)) return null;
  const payload = raw.slice(PREFIX.length);
  try {
    const json = LZString.decompressFromEncodedURIComponent(payload);
    if (!json) return null;
    if (new TextEncoder().encode(json).length > LIMITS.HTML_MAX_BYTES * 4) return null;

    const data = JSON.parse(json) as WorkspaceSnapshot;
    if (data?.v !== 1 || typeof data.html !== "string" || typeof data.selector !== "string") {
      return null;
    }

    const htmlCheck = validateHtml(data.html);
    if (!htmlCheck.valid) return null;

    return {
      v: 1,
      html: data.html,
      selector: data.selector,
      options: sanitizeOptions(data.options),
    };
  } catch {
    return null;
  }
}
