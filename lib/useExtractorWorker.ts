"use client";

import { useRef, useCallback, useEffect } from "react";
import { LIMITS } from "./limits";
import type { ExtractorInput, ExtractorOutput } from "./extractor";
import type { WorkerRequest, WorkerResponse } from "./worker/extractor.worker";

type PendingRequest = {
  requestId: number;
  resolve: (value: ExtractorOutput) => void;
  reject: (reason: Error) => void;
};

let globalRequestSeq = 0;

export function useExtractorWorker() {
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<PendingRequest | null>(null);

  const createWorker = useCallback(() => {
    return new Worker(new URL("./worker/extractor.worker.ts", import.meta.url));
  }, []);

  const abortPending = useCallback((reason: Error) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const pending = pendingRef.current;
    if (pending) {
      pending.reject(reason);
      pendingRef.current = null;
    }
  }, []);

  const runExtraction = useCallback(
    (input: Omit<ExtractorInput, "parsedDoc">): Promise<ExtractorOutput> => {
      return new Promise((resolve, reject) => {
        abortPending(new Error("ABORTED"));

        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }

        workerRef.current = createWorker();
        const worker = workerRef.current;

        const requestId = ++globalRequestSeq;
        pendingRef.current = { requestId, resolve, reject };

        timeoutRef.current = setTimeout(() => {
          worker.terminate();
          workerRef.current = null;
          if (pendingRef.current?.requestId === requestId) {
            pendingRef.current = null;
            reject(new Error("TIMEOUT"));
          }
        }, LIMITS.SELECTOR_TIMEOUT_MS);

        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.id !== requestId) return;
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = null;

          const pending = pendingRef.current;
          if (!pending || pending.requestId !== requestId) return;
          pendingRef.current = null;

          if (e.data.error) {
            pending.reject(new Error(e.data.error));
          } else {
            pending.resolve(e.data.result!);
          }
        };

        worker.onerror = (e) => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
          worker.terminate();
          workerRef.current = null;
          const pending = pendingRef.current;
          if (pending?.requestId === requestId) {
            pendingRef.current = null;
            pending.reject(new Error(e.message || "Worker error"));
          }
        };

        worker.postMessage({ id: requestId, input } satisfies WorkerRequest);
      });
    },
    [createWorker, abortPending],
  );

  useEffect(() => {
    return () => {
      abortPending(new Error("ABORTED"));
      if (workerRef.current) workerRef.current.terminate();
    };
  }, [abortPending]);

  return { runExtraction };
}
