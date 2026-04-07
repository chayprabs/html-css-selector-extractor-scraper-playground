"use client";

/**
 * Hook: manages a Web Worker running the extraction engine with timeout enforcement.
 *
 * - Creates worker via webpack 5's `new URL(...)` pattern (Next.js 14 compatible)
 * - Enforces SELECTOR_TIMEOUT_MS kill timeout on every run
 * - On timeout or crash: terminates worker, creates fresh instance, rejects with 'TIMEOUT'
 * - Keeps worker alive between successful runs so its internal parsed-document cache persists
 * - Cleans up on unmount
 */

import { useRef, useCallback, useEffect } from "react";
import { LIMITS } from "./limits";
import type { ExtractorInput, ExtractorOutput } from "./extractor";
import type { WorkerRequest, WorkerResponse } from "./worker/extractor.worker";

export function useExtractorWorker() {
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);

  /** Create a fresh worker instance. */
  const createWorker = useCallback(() => {
    return new Worker(
      new URL("./worker/extractor.worker.ts", import.meta.url),
    );
  }, []);

  /** Run an extraction in the worker with timeout. Returns a Promise. */
  const runExtraction = useCallback(
    (input: Omit<ExtractorInput, "parsedDoc">): Promise<ExtractorOutput> => {
      return new Promise((resolve, reject) => {
        // Clear any pending timeout
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // If a request is still in-flight, terminate the worker (may be stuck on a slow selector)
        if (pendingRef.current && workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }

        // Reuse idle worker (preserves parsed document cache) or create fresh
        if (!workerRef.current) {
          workerRef.current = createWorker();
        }
        const worker = workerRef.current;
        pendingRef.current = true;

        const requestId = Date.now();

        // Set kill timeout
        timeoutRef.current = setTimeout(() => {
          worker.terminate();
          workerRef.current = null;
          pendingRef.current = false;
          reject(new Error("TIMEOUT"));
        }, LIMITS.SELECTOR_TIMEOUT_MS);

        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.id !== requestId) return; // stale response

          clearTimeout(timeoutRef.current!);
          pendingRef.current = false;
          // Worker kept alive — its internal document cache persists

          if (e.data.error) {
            reject(new Error(e.data.error));
          } else {
            resolve(e.data.result!);
          }
        };

        worker.onerror = (e) => {
          clearTimeout(timeoutRef.current!);
          worker.terminate();
          workerRef.current = null;
          pendingRef.current = false;
          reject(new Error(e.message || "Worker error"));
        };

        worker.postMessage({ id: requestId, input } satisfies WorkerRequest);
      });
    },
    [createWorker],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  return { runExtraction };
}
