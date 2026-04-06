/**
 * HTML Extractor — main page.
 *
 * State lives here. All children are controlled components.
 * Engine runs in a Web Worker with timeout protection.
 * All inputs are validated before dispatching to the worker.
 * Rate limiter prevents rapid-fire engine invocations.
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import SelectorBar from "@/components/SelectorBar";
import HtmlInput from "@/components/HtmlInput";
import ControlPanel from "@/components/ControlPanel";
import OutputPanel from "@/components/OutputPanel";
import HistoryPanel from "@/components/HistoryPanel";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import ErrorBoundary from "@/components/ErrorBoundary";
import type { ExtractorOutput } from "@/lib/extractor";
import { LIMITS, type LimitViolation } from "@/lib/limits";
import { type ExtractorOptions, defaultOptions } from "@/types/options";
import {
  validateHtml,
  validateSelector,
  validateAttribute,
  validateBaseUrl,
  validateRemoveNodesSelector,
} from "@/lib/validators";
import { useExtractorWorker } from "@/lib/useExtractorWorker";
import { useRateLimiter } from "@/lib/useRateLimiter";
import { useHistory } from "@/lib/useHistory";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { encodeStateToUrl, decodeStateFromUrl, isStateDefault } from "@/lib/urlState";
import { exportAsJson } from "@/lib/exporters";
import { samples } from "@/lib/samples";
import { clearHistory } from "@/lib/history";
import type { ProcessingState } from "@/types/processing";

export default function Home() {
  const [html, setHtml] = useState("");
  const [selector, setSelector] = useState("");
  const [options, setOptions] = useState<ExtractorOptions>(defaultOptions);
  const [output, setOutput] = useState<ExtractorOutput | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");

  // Validation violations per input
  const [htmlViolations, setHtmlViolations] = useState<LimitViolation[]>([]);
  const [selectorViolations, setSelectorViolations] = useState<LimitViolation[]>([]);
  const [attributeViolations, setAttributeViolations] = useState<LimitViolation[]>([]);
  const [baseUrlViolations, setBaseUrlViolations] = useState<LimitViolation[]>([]);
  const [removeNodesViolations, setRemoveNodesViolations] = useState<LimitViolation[]>([]);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  // UI state
  const [historyOpen, setHistoryOpen] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);
  const selectorInputRef = useRef<HTMLInputElement>(null);

  const { runExtraction } = useExtractorWorker();
  const { checkLimit, reset: resetRateLimit } = useRateLimiter(LIMITS.ENGINE_MAX_RUNS_PER_MINUTE);
  const { entries: historyEntries, addEntry: addHistoryEntry, deleteEntry: deleteHistoryEntry, clearAll: clearAllHistory } = useHistory();

  // ─── URL hydration on mount ─────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const { selector: s, options: opts } = decodeStateFromUrl(window.location.search);
    if (s) setSelector(s);
    if (Object.keys(opts).length > 0) {
      setOptions((prev) => ({ ...prev, ...opts }));
    }
    // Mark hydration complete after a tick so the engine effect picks up the new state
    requestAnimationFrame(() => {
      hydratedRef.current = true;
    });
  }, []);

  // ─── URL sync (debounced) ───────────────────────────────────
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (typeof window === "undefined") return;

    if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    urlSyncTimerRef.current = setTimeout(() => {
      if (isStateDefault(selector, options)) {
        window.history.replaceState(null, "", window.location.pathname);
      } else {
        const newUrl = encodeStateToUrl(selector, options);
        window.history.replaceState(null, "", newUrl);
      }
    }, 1000);

    return () => {
      if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    };
  }, [selector, options]);

  // Debounced engine runner
  const runEngine = useCallback(
    (h: string, s: string, opts: ExtractorOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        if (!h.trim() || !s.trim()) {
          setOutput(null);
          setProcessingState("idle");
          // Clear violations when inputs are empty
          setHtmlViolations([]);
          setSelectorViolations([]);
          setAttributeViolations([]);
          setBaseUrlViolations([]);
          setRemoveNodesViolations([]);
          return;
        }

        // ─── Phase 1: Validation ──────────────────────────────
        setProcessingState("validating");

        const hv: LimitViolation[] = [];
        const sv: LimitViolation[] = [];
        const av: LimitViolation[] = [];
        const bv: LimitViolation[] = [];
        const rv: LimitViolation[] = [];

        // Validate HTML
        const htmlResult = validateHtml(h);
        if (htmlResult.violation) hv.push(htmlResult.violation);

        // Validate selector
        const selectorResult = validateSelector(s);
        if (selectorResult.violation) sv.push(selectorResult.violation);

        // Validate attribute (if set)
        if (opts.attribute) {
          const attrResult = validateAttribute(opts.attribute);
          if (attrResult.violation) av.push(attrResult.violation);
        }

        // Validate baseUrl (if set)
        if (opts.baseUrl) {
          const urlResult = validateBaseUrl(opts.baseUrl);
          if (urlResult.violation) bv.push(urlResult.violation);
        }

        // Validate removeNodes selector (if set)
        if (opts.removeNodes) {
          const removeResult = validateRemoveNodesSelector(opts.removeNodes);
          if (removeResult.violation) rv.push(removeResult.violation);
        }

        // Update violation state
        setHtmlViolations(hv);
        setSelectorViolations(sv);
        setAttributeViolations(av);
        setBaseUrlViolations(bv);
        setRemoveNodesViolations(rv);

        // Check for blocking violations
        const allViolations = [...hv, ...sv, ...av, ...bv, ...rv];
        const hasBlock = allViolations.some((v) => v.severity === "block");
        if (hasBlock) {
          setProcessingState("error");
          setOutput(null);
          return;
        }

        // ─── Phase 2: Rate limit check ───────────────────────
        const rateCheck = checkLimit();
        if (!rateCheck.allowed) {
          const seconds = Math.ceil((rateCheck.retryAfterMs ?? 0) / 1000);
          setRateLimitMessage(`Running too many extractions. Slow down a bit. (Resets in ${seconds}s)`);
          setProcessingState("error");

          // Start countdown to clear the message
          if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
          rateLimitTimerRef.current = setTimeout(() => {
            setRateLimitMessage(null);
          }, rateCheck.retryAfterMs ?? 5000);
          return;
        }
        setRateLimitMessage(null);

        // ─── Phase 3: Run extraction in worker ────────────────
        setProcessingState("processing");

        try {
          const result = await runExtraction({
            html: h,
            selector: s,
            attribute: opts.attribute || undefined,
            textOnly: opts.textOnly,
            prettyPrint: opts.prettyPrint,
            removeNodes: opts.removeNodes || undefined,
            baseUrl: opts.baseUrl || undefined,
            ignoreWhitespace: opts.ignoreWhitespace,
          });

          setOutput(result);
          setProcessingState("done");
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (message === "TIMEOUT") {
            setProcessingState("timeout");
            setOutput(null);
          } else {
            setProcessingState("error");
            setOutput({
              matches: [],
              matchCount: 0,
              error: message,
            });
          }
        }
      }, LIMITS.ENGINE_MIN_INTERVAL_MS);
    },
    [runExtraction, checkLimit],
  );

  // Re-run whenever inputs change
  useEffect(() => {
    runEngine(html, selector, options);
  }, [html, selector, options, runEngine]);

  // ─── Save to history on successful extraction ───────────────
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (processingState !== "done" || !output || output.matchCount === 0) return;

    addHistoryEntry({
      selector,
      options,
      matchCount: output.matchCount,
      htmlPreview: html.slice(0, 100),
    });
  }, [processingState, output]); // intentionally omit selector/options/html/addHistoryEntry to only fire on state transitions

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
      if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    };
  }, []);

  // Clear everything
  const handleClearAll = useCallback(() => {
    setHtml("");
    setSelector("");
    setOptions(defaultOptions);
    setOutput(null);
    setProcessingState("idle");
    setHtmlViolations([]);
    setSelectorViolations([]);
    setAttributeViolations([]);
    setBaseUrlViolations([]);
    setRemoveNodesViolations([]);
    setRateLimitMessage(null);
    resetRateLimit();
  }, [resetRateLimit]);

  // Determine display mode based on active options
  const displayMode: "html" | "text" | "attribute" | "pretty" = options.attribute
    ? "attribute"
    : options.textOnly
      ? "text"
      : options.prettyPrint
        ? "pretty"
        : "html";

  // Match count for the badge — null when no query has been run
  const matchCount = output ? output.matchCount : null;

  // Copy link visibility
  const showCopyLink = !isStateDefault(selector, options);

  // ─── Compute "copy all" text for keyboard shortcut ──────────
  const allText = useMemo(() => {
    if (!output) return "";
    return output.matches
      .map((m) => {
        switch (displayMode) {
          case "attribute":
            return m.attribute ?? "";
          case "text":
            return m.text;
          case "pretty":
            return m.pretty ?? m.raw;
          default:
            return m.raw;
        }
      })
      .join("\n\n");
  }, [output, displayMode]);

  // ─── History handlers ───────────────────────────────────────
  const handleLoadHistory = useCallback(
    (entry: { selector: string; options: ExtractorOptions }) => {
      setSelector(entry.selector);
      setOptions(entry.options);
      setHistoryOpen(false);
    },
    [],
  );

  // ─── Toast for copy feedback ────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  }, []);

  // ─── Keyboard shortcuts ─────────────────────────────────────
  useKeyboardShortcuts({
    focusSelector: () => selectorInputRef.current?.focus(),
    copyResults: () => {
      if (!allText) return;
      navigator.clipboard.writeText(allText).then(() => {
        showToast(`Copied ${output?.matches.length ?? 0} results`);
      });
    },
    clearHtml: () => {
      setHtml("");
    },
    toggleHistory: () => setHistoryOpen((prev) => !prev),
    exportJson: () => {
      if (!output || output.matches.length === 0) return;
      const exportMode = displayMode === "pretty" ? "html" : displayMode === "attribute" ? "attribute" : displayMode === "text" ? "text" : "html";
      exportAsJson(output.matches, {
        mode: exportMode as "html" | "text" | "attribute",
        attributeName: options.attribute || undefined,
        includeIndex: true,
      });
    },
    escape: () => {
      if (historyOpen) {
        setHistoryOpen(false);
        return;
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    },
    loadSample: (index: number) => {
      if (index >= 0 && index < samples.length) {
        setHtml(samples[index].html);
      }
    },
  });

  return (
    <div className="flex flex-col h-screen bg-[#0d0d0d] overflow-hidden">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#7c3aed] text-white text-xs font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Rate limit banner */}
      {rateLimitMessage && (
        <div className="px-4 py-2 bg-red-950/60 border-b border-red-500/30 text-xs text-red-400 font-mono text-center">
          {rateLimitMessage}
        </div>
      )}

      {/* Top bar — selector input */}
      <SelectorBar
        ref={selectorInputRef}
        selector={selector}
        onSelectorChange={setSelector}
        matchCount={matchCount}
        error={output?.error}
        onClear={handleClearAll}
        violations={selectorViolations}
        processingState={processingState}
        showCopyLink={showCopyLink}
        onToggleHistory={() => setHistoryOpen((prev) => !prev)}
        historyCount={historyEntries.length}
      />

      {/* Three-panel layout */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row gap-2 p-2">
        {/* Left: HTML input */}
        <div className="lg:w-[38%] h-[300px] lg:h-full shrink-0">
          <HtmlInput
            html={html}
            onHtmlChange={setHtml}
            onClear={() => setHtml("")}
            violations={htmlViolations}
          />
        </div>

        {/* Middle: control panel */}
        <div className="lg:w-[22%] h-auto lg:h-full shrink-0">
          <ControlPanel
            options={options}
            onOptionsChange={setOptions}
            attributeViolations={attributeViolations}
            removeNodesViolations={removeNodesViolations}
            baseUrlViolations={baseUrlViolations}
          />
        </div>

        {/* Right: output */}
        <div className="lg:flex-1 min-h-[300px] lg:h-full">
          <ErrorBoundary
            fallback={
              <div className="flex flex-col items-center justify-center h-full bg-[#141414] rounded-lg border border-[#222] p-6 text-center">
                <p className="text-sm text-[#e5e5e5] mb-3">Output panel encountered an error.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 text-xs bg-[#7c3aed] text-white rounded hover:bg-[#6d28d9] transition-colors"
                >
                  Reset
                </button>
              </div>
            }
          >
            <OutputPanel
              output={output}
              mode={displayMode}
              processingState={processingState}
              attributeName={options.attribute}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* History panel */}
      <ErrorBoundary
        fallback={
          <div className="fixed top-0 right-0 h-full w-80 z-50 bg-[#141414] border-l border-[#222] flex items-center justify-center p-6 text-center">
            <div>
              <p className="text-sm text-[#e5e5e5] mb-3">History unavailable.</p>
              <button
                onClick={() => { clearHistory(); window.location.reload(); }}
                className="px-3 py-1.5 text-xs bg-[#7c3aed] text-white rounded hover:bg-[#6d28d9] transition-colors"
              >
                Clear history and reset
              </button>
            </div>
          </div>
        }
        onError={() => clearHistory()}
      >
        <HistoryPanel
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          entries={historyEntries}
          onLoad={handleLoadHistory}
          onDelete={deleteHistoryEntry}
          onClear={clearAllHistory}
        />
      </ErrorBoundary>

      {/* Keyboard shortcuts help */}
      <ShortcutsHelp />
    </div>
  );
}
