/**
 * Web Worker entry point for the HTML extraction engine.
 *
 * Runs the full extraction pipeline off the main thread.
 * The main thread enforces a timeout — if this worker takes too long,
 * it gets terminated and a fresh worker is created.
 *
 * Document objects cannot cross the postMessage boundary (not structured-cloneable),
 * so the worker re-parses HTML on every invocation. DOMParser is available in workers.
 */

import { runExtractor, type ExtractorInput, type ExtractorOutput } from "../extractor";

export type WorkerRequest = {
  id: number;
  input: Omit<ExtractorInput, "parsedDoc">;
};

export type WorkerResponse = {
  id: number;
  result?: ExtractorOutput;
  error?: string;
};

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, input } = e.data;
  try {
    // parsedDoc is intentionally omitted — worker parses fresh every time
    const result = await runExtractor(input);
    self.postMessage({ id, result } as WorkerResponse);
  } catch (err) {
    self.postMessage({ id, error: String(err) } as WorkerResponse);
  }
};
