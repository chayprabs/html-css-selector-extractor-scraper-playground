/**
 * HTML Extractor — main page. Client-side validation; worker-backed extraction (PRD §4).
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import SelectorBar from "@/components/SelectorBar";
import HtmlInput from "@/components/HtmlInput";
import ControlPanel from "@/components/ControlPanel";
import OutputPanel from "@/components/OutputPanel";
import HistoryPanel from "@/components/HistoryPanel";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import TopBar from "@/components/TopBar";
import SeoBar from "@/components/SeoBar";
import SiteFooter from "@/components/SiteFooter";
import ErrorBoundary from "@/components/ErrorBoundary";
import type { ExtractorOutput } from "@/lib/extractor";
import { LIMITS, type LimitViolation } from "@/lib/limits";
import { type ExtractorOptions, defaultOptions } from "@/types/options";
import {
  validateHtml,
  validateSelector,
  validateAttributeName,
  validateBaseUrl,
  validateStripSelectorsField,
} from "@/lib/validators";
import { useExtractorWorker } from "@/lib/useExtractorWorker";
import { useHistory } from "@/lib/useHistory";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { encodeWorkspaceHash, decodeWorkspaceHash, type WorkspaceSnapshot } from "@/lib/shareState";
import { decodeLegacyQueryParams, mergeDecodedOptions, isWorkspaceVisiblyEmpty } from "@/lib/urlState";
import { exportAsJson } from "@/lib/exporters";
import { prdPresets, defaultPreset } from "@/lib/presets";
import { clearHistory } from "@/lib/history";
import type { ProcessingState } from "@/types/processing";

export default function Home() {
  const [html, setHtml] = useState("");
  const [selector, setSelector] = useState("");
  const [options, setOptions] = useState<ExtractorOptions>(defaultOptions);
  const [output, setOutput] = useState<ExtractorOutput | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");

  const [htmlViolations, setHtmlViolations] = useState<LimitViolation[]>([]);
  const [selectorViolations, setSelectorViolations] = useState<LimitViolation[]>([]);
  const [attributeViolations, setAttributeViolations] = useState<LimitViolation[]>([]);
  const [baseUrlViolations, setBaseUrlViolations] = useState<LimitViolation[]>([]);
  const [stripSelectorsViolations, setStripSelectorsViolations] = useState<LimitViolation[]>([]);
  const [shareTooLarge, setShareTooLarge] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const selectorInputRef = useRef<HTMLInputElement>(null);

  const { runExtraction } = useExtractorWorker();
  const {
    entries: historyEntries,
    addEntry: addHistoryEntry,
    deleteEntry: deleteHistoryEntry,
    clearAll: clearAllHistory,
  } = useHistory();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const snap = decodeWorkspaceHash(window.location.hash);
    if (snap) {
      setHtml(snap.html);
      setSelector(snap.selector);
      setOptions(mergeDecodedOptions(snap.options));
    } else if (window.location.search) {
      const leg = decodeLegacyQueryParams(window.location.search);
      setSelector(leg.selector);
      setOptions(mergeDecodedOptions(leg.options));
      setHtml(defaultPreset.html);
      window.history.replaceState(null, "", window.location.pathname);
    } else {
      setHtml(defaultPreset.html);
      setSelector(defaultPreset.selector);
      setOptions(defaultPreset.options);
    }

    setWorkspaceReady(true);
  }, []);

  const performExtract = useCallback(
    async (h: string, s: string, opts: ExtractorOptions) => {
      if (!h.trim() && !s.trim()) {
        setOutput(null);
        setProcessingState("idle");
        setHtmlViolations([]);
        setSelectorViolations([]);
        setAttributeViolations([]);
        setBaseUrlViolations([]);
        setStripSelectorsViolations([]);
        return;
      }

      setProcessingState("validating");

      const hv: LimitViolation[] = [];
      const sv: LimitViolation[] = [];
      const av: LimitViolation[] = [];
      const bv: LimitViolation[] = [];
      const rv: LimitViolation[] = [];

      if (!h.trim()) {
        hv.push({
          code: "HTML_EMPTY",
          message: "Paste some HTML to get started.",
          severity: "block",
          input: "html",
        });
      } else {
        const htmlResult = validateHtml(h);
        if (htmlResult.violation) hv.push(htmlResult.violation);
      }

      if (!s.trim()) {
        sv.push({
          code: "SELECTOR_EMPTY",
          message: "Enter a CSS selector.",
          severity: "block",
          input: "selector",
        });
      } else {
        const selectorResult = validateSelector(s);
        if (selectorResult.violation) sv.push(selectorResult.violation);
      }

      if (opts.mode === "attribute") {
        const attrResult = validateAttributeName(opts.attributeName);
        if (attrResult.violation) av.push(attrResult.violation);
      }

      if (opts.stripSelectors.trim()) {
        const stripResult = validateStripSelectorsField(opts.stripSelectors);
        if (stripResult.violation) rv.push(stripResult.violation);
      }

      if (opts.baseUrl.trim()) {
        const urlResult = validateBaseUrl(opts.baseUrl);
        if (urlResult.violation) bv.push(urlResult.violation);
      }

      setHtmlViolations(hv);
      setSelectorViolations(sv);
      setAttributeViolations(av);
      setBaseUrlViolations(bv);
      setStripSelectorsViolations(rv);

      const allViolations = [...hv, ...sv, ...av, ...bv, ...rv];
      const hasBlock = allViolations.some((v) => v.severity === "block");
      if (hasBlock) {
        setProcessingState("error");
        setOutput(null);
        return;
      }

      setProcessingState("processing");

      try {
        const result = await runExtraction({
          html: h,
          selector: s,
          mode: opts.mode,
          attributeName: opts.mode === "attribute" ? opts.attributeName || undefined : undefined,
          stripSelectors: opts.stripSelectors || undefined,
          baseUrl: opts.baseUrl || undefined,
          prettyPrint: opts.prettyPrint,
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
            joinedOutput: "",
            error: message,
          });
        }
      }
    },
    [runExtraction],
  );

  useEffect(() => {
    if (!workspaceReady) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void performExtract(html, selector, options);
    }, LIMITS.ENGINE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [html, selector, options, performExtract, workspaceReady]);

  useEffect(() => {
    if (!workspaceReady) return;
    if (typeof window === "undefined") return;

    if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    urlSyncTimerRef.current = setTimeout(() => {
      const snapshot: WorkspaceSnapshot = { v: 1, html, selector, options };
      const { hashFragment, tooLarge } = encodeWorkspaceHash(snapshot);
      if (tooLarge) {
        setShareTooLarge(true);
        window.history.replaceState(null, "", window.location.pathname);
      } else {
        setShareTooLarge(false);
        window.history.replaceState(null, "", window.location.pathname + hashFragment);
      }
    }, LIMITS.URL_SYNC_DEBOUNCE_MS);

    return () => {
      if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    };
  }, [html, selector, options, workspaceReady]);

  useEffect(() => {
    if (!workspaceReady) return;
    if (processingState !== "done" || !output || output.matchCount === 0) return;

    addHistoryEntry({
      selector,
      options,
      matchCount: output.matchCount,
      htmlPreview: html.slice(0, 100),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- add once per completed extraction, not on every html/selector/options edit
  }, [processingState, output]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    };
  }, []);

  const flushExtract = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void performExtract(html, selector, options);
  }, [performExtract, html, selector, options]);

  /** PRD §6.1 — HTML panel Clear resets input and output only. */
  const handleClearHtml = useCallback(() => {
    setHtml("");
    setOutput(null);
    setProcessingState("idle");
    setHtmlViolations([]);
  }, []);

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
    setStripSelectorsViolations([]);
    setShareTooLarge(false);
  }, []);

  const matchCount = output ? output.matchCount : null;

  const showCopyLink = !isWorkspaceVisiblyEmpty(html, selector, options);

  const joinedForCopy = output?.joinedOutput ?? "";

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  }, []);

  useKeyboardShortcuts({
    focusSelector: () => selectorInputRef.current?.focus(),
    copyResults: () => {
      if (!joinedForCopy) return;
      navigator.clipboard.writeText(joinedForCopy).then(() => {
        showToast("Copied.");
      });
    },
    clearHtml: handleClearHtml,
    toggleHistory: () => setHistoryOpen((prev) => !prev),
    exportJson: () => {
      if (!output || output.matches.length === 0) return;
      exportAsJson(output.matches, { mode: options.mode, includeIndex: true });
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
      if (index >= 0 && index < prdPresets.length) {
        const p = prdPresets[index]!;
        setHtml(p.html);
        setSelector(p.selector);
        setOptions(p.options);
      }
    },
  });

  const handleLoadPreset = useCallback((h: string, s: string, o: ExtractorOptions) => {
    setHtml(h);
    setSelector(s);
    setOptions(o);
  }, []);

  const handleLoadHistory = useCallback((entry: { selector: string; options: ExtractorOptions }) => {
    setSelector(entry.selector);
    setOptions(entry.options);
    setHistoryOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const engineError = useMemo(() => {
    if (!output?.error) return undefined;
    return output.error;
  }, [output?.error]);

  return (
    <div className="flex flex-col h-screen bg-[#0d0d0d] overflow-hidden">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#7c3aed] text-white text-xs font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <TopBar />
      <SeoBar />

      <SelectorBar
        ref={selectorInputRef}
        selector={selector}
        onSelectorChange={setSelector}
        matchCount={matchCount}
        error={engineError}
        onClear={handleClearAll}
        violations={selectorViolations}
        processingState={processingState}
        showCopyLink={showCopyLink}
        shareTooLarge={shareTooLarge}
        onToggleHistory={() => setHistoryOpen((prev) => !prev)}
        historyCount={historyEntries.length}
        onModifierEnter={flushExtract}
      />

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row gap-2 p-2">
        <div className="lg:w-[38%] h-[300px] lg:h-full shrink-0">
          <HtmlInput
            html={html}
            onHtmlChange={setHtml}
            onClear={handleClearHtml}
            violations={htmlViolations}
            onLoadPreset={handleLoadPreset}
          />
        </div>

        <div className="lg:w-[22%] h-auto lg:h-full shrink-0">
          <ControlPanel
            options={options}
            onOptionsChange={setOptions}
            attributeViolations={attributeViolations}
            stripSelectorsViolations={stripSelectorsViolations}
            baseUrlViolations={baseUrlViolations}
          />
        </div>

        <div className="lg:flex-1 min-h-[300px] lg:h-full flex flex-col min-w-0">
          <ErrorBoundary
            fallback={
              <div className="flex flex-col items-center justify-center h-full bg-[#141414] rounded-lg border border-[#222] p-6 text-center">
                <p className="text-sm text-[#e5e5e5] mb-3">Output panel encountered an error.</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 text-xs bg-[#7c3aed] text-white rounded hover:bg-[#6d28d9] transition-colors"
                >
                  Reset
                </button>
              </div>
            }
          >
            <OutputPanel output={output} mode={options.mode} processingState={processingState} />
          </ErrorBoundary>
        </div>
      </div>

      <SiteFooter />

      <ErrorBoundary
        fallback={
          <div className="fixed top-0 right-0 h-full w-80 z-50 bg-[#141414] border-l border-[#222] flex items-center justify-center p-6 text-center">
            <div>
              <p className="text-sm text-[#e5e5e5] mb-3">History unavailable.</p>
              <button
                type="button"
                onClick={() => {
                  clearHistory();
                  window.location.reload();
                }}
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

      <ShortcutsHelp />
    </div>
  );
}
