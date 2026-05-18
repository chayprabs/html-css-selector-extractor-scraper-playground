import LZString from "lz-string";
import { LIMITS } from "./limits";
import type { ExtractorOptions } from "@/types/options";

/** Persisted workspace (PRD §9). */
export type WorkspaceSnapshot = {
  v: 1;
  html: string;
  selector: string;
  options: ExtractorOptions;
};

const PREFIX = "state=";

export function encodeWorkspaceHash(snapshot: WorkspaceSnapshot): { hashFragment: string; tooLarge: boolean } {
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
    const data = JSON.parse(json) as WorkspaceSnapshot;
    if (data?.v !== 1 || typeof data.html !== "string" || typeof data.selector !== "string" || !data.options) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
