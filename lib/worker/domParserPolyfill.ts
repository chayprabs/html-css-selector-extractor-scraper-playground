/**
 * Web Workers do not expose DOMParser in all runtimes (including Chromium headless).
 * Polyfill with linkedom so the extraction engine can parse HTML off the main thread.
 */
import { parseHTML } from "linkedom";

export function ensureWorkerDOMParser(): void {
  if (typeof DOMParser !== "undefined") return;

  class WorkerDOMParser {
    parseFromString(html: string, contentType: string): Document {
      if (contentType !== "text/html") {
        throw new Error(`Unsupported content type: ${contentType}`);
      }
      const { document } = parseHTML(html);
      return document as unknown as Document;
    }
  }

  (self as unknown as { DOMParser: typeof DOMParser }).DOMParser =
    WorkerDOMParser as unknown as typeof DOMParser;
}
