/**
 * Web Worker entry point for the HTML extraction engine.
 *
 * Runs the full extraction pipeline off the main thread.
 * The main thread enforces a timeout — if this worker takes too long,
 * it gets terminated and a fresh worker is created.
 *
 * Document objects cannot cross the postMessage boundary (not structured-cloneable),
 * so the worker parses HTML internally. The parsed document is cached so that
 * option-only changes (toggling pretty-print, text-only, etc.) skip re-parsing.
 */

import { runExtractor, parseHtml, type ExtractorInput, type ExtractorOutput } from "../extractor";

export type WorkerRequest = {
  id: number;
  input: Omit<ExtractorInput, "parsedDoc">;
};

export type WorkerResponse = {
  id: number;
  result?: ExtractorOutput;
  error?: string;
};

// Cache the last parsed document so option-only changes skip re-parsing
let cachedHtml: string | null = null;
let cachedDoc: Document | null = null;

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, input } = e.data;
  try {
    // Reuse cached document when HTML hasn't changed
    if (input.html !== cachedHtml || !cachedDoc) {
      cachedDoc = parseHtml(input.html);
      cachedHtml = input.html;
    }

    const result = await runExtractor({ ...input, parsedDoc: cachedDoc });
    self.postMessage({ id, result } as WorkerResponse);
  } catch (err) {
    self.postMessage({ id, error: String(err) } as WorkerResponse);
  }
};
