/**
 * HTML Extractor — main page. Client-side validation; worker-backed extraction (PRD §4).
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import TopBar from "@/components/TopBar";
import SeoBar from "@/components/SeoBar";
import SiteFooter from "@/components/SiteFooter";
import HtmlInput from "@/components/HtmlInput";
import ControlPanel from "@/components/ControlPanel";
import OutputPanel from "@/components/OutputPanel";
import ErrorBoundary from "@/components/ErrorBoundary";
import type { ExtractorOutput } from "@/lib/extractor";
import { LIMITS, type LimitViolation } from "@/lib/limits";
import { type ExtractorOptions, defaultOptions } from "@/types/options";
import type { ProcessingState } from "@/types/processing";
import {
  validateHtml,
  validateSelector,
  validateAttributeName,
  validateBaseUrl,
  validateStripSelectorsField,
} from "@/lib/validators";
import { useExtractorWorker } from "@/lib/useExtractorWorker";
import { addHistoryEntry } from "@/lib/history";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { encodeWorkspaceHash, decodeWorkspaceHash, type WorkspaceSnapshot } from "@/lib/shareState";
import { decodeLegacyQueryParams, mergeDecodedOptions, isWorkspaceVisiblyEmpty } from "@/lib/urlState";
import { exportAsJson } from "@/lib/exporters";
import { copyText } from "@/lib/clipboard";
import { prdPresets, defaultPreset } from "@/lib/presets";

function violationsForInput(violations: LimitViolation[], input: LimitViolation["input"]): LimitViolation[] {
  return violations.filter((v) => v.input === input);
}

function hasStateHash(hash: string): boolean {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return raw.startsWith("state=");
}

export default function Home() {
  const [html, setHtml] = useState("");
  const [selector, setSelector] = useState("");
  const [options, setOptions] = useState<ExtractorOptions>(defaultOptions);
  const [output, setOutput] = useState<ExtractorOutput | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [violations, setViolations] = useState<LimitViolation[]>([]);
  const [shareTooLarge, setShareTooLarge] = useState(false);
  const [shareLinkError, setShareLinkError] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectorInputRef = useRef<HTMLInputElement>(null);
  const extractGenerationRef = useRef(0);
  const userEditedRef = useRef(false);
  const skipHistoryRef = useRef(false);

  const { runExtraction } = useExtractorWorker();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    const snap = decodeWorkspaceHash(hash);

    if (snap) {
      setHtml(snap.html);
      setSelector(snap.selector);
      setOptions(mergeDecodedOptions(snap.options));
      skipHistoryRef.current = true;
    } else if (hash.length > 1 && hasStateHash(hash)) {
      setShareLinkError(true);
      setHtml(defaultPreset.html);
      setSelector(defaultPreset.selector);
      setOptions(defaultPreset.options);
      skipHistoryRef.current = true;
    } else if (window.location.search) {
      const leg = decodeLegacyQueryParams(window.location.search);
      setSelector(leg.selector);
      setOptions(mergeDecodedOptions(leg.options));
      setHtml(defaultPreset.html);
      window.history.replaceState(null, "", window.location.pathname);
      skipHistoryRef.current = true;
    } else {
      setHtml(defaultPreset.html);
      setSelector(defaultPreset.selector);
      setOptions(defaultPreset.options);
      skipHistoryRef.current = true;
    }

    setWorkspaceReady(true);
  }, []);

  const performExtract = useCallback(
    async (h: string, s: string, opts: ExtractorOptions) => {
      const generation = ++extractGenerationRef.current;
      setOutput(null);

      if (!h.trim() && !s.trim()) {
        if (generation !== extractGenerationRef.current) return;
        setViolations([]);
        setProcessingState("idle");
        return;
      }

      setProcessingState("validating");

      const nextViolations: LimitViolation[] = [];

      if (!h.trim()) {
        nextViolations.push({
          code: "HTML_EMPTY",
          message: "Paste some HTML to get started.",
          severity: "block",
          input: "html",
        });
      } else {
        const htmlResult = validateHtml(h);
        if (htmlResult.violation) nextViolations.push(htmlResult.violation);
      }

      if (!s.trim()) {
        nextViolations.push({
          code: "SELECTOR_EMPTY",
          message: "Enter a CSS selector.",
          severity: "block",
          input: "selector",
        });
      } else {
        const selectorResult = validateSelector(s);
        if (selectorResult.violation) nextViolations.push(selectorResult.violation);
      }

      if (opts.mode === "attribute") {
        const attrResult = validateAttributeName(opts.attributeName);
        if (attrResult.violation) nextViolations.push(attrResult.violation);
      }

      if (opts.stripSelectors.trim()) {
        const stripResult = validateStripSelectorsField(opts.stripSelectors);
        if (stripResult.violation) nextViolations.push(stripResult.violation);
      }

      if (opts.baseUrl.trim()) {
        const urlResult = validateBaseUrl(opts.baseUrl);
        if (urlResult.violation) nextViolations.push(urlResult.violation);
      }

      if (generation !== extractGenerationRef.current) return;

      setViolations(nextViolations);

      const hasBlock = nextViolations.some((v) => v.severity === "block");
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

        if (generation !== extractGenerationRef.current) return;

        setOutput(result);
        setProcessingState("done");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message === "ABORTED") return;
        if (generation !== extractGenerationRef.current) return;

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
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    if (!userEditedRef.current) return;
    if (processingState !== "done" || !output || output.matchCount === 0) return;

    addHistoryEntry({
      selector,
      options,
      matchCount: output.matchCount,
      htmlPreview: html.slice(0, 100),
    });
  }, [processingState, output, workspaceReady, selector, options, html]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const flushExtract = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void performExtract(html, selector, options);
  }, [performExtract, html, selector, options]);

  const handleHtmlChange = useCallback((value: string) => {
    userEditedRef.current = true;
    setHtml(value);
  }, []);

  const handleSelectorChange = useCallback((value: string) => {
    userEditedRef.current = true;
    setSelector(value);
  }, []);

  const handleOptionsChange = useCallback((next: ExtractorOptions) => {
    userEditedRef.current = true;
    setOptions(next);
  }, []);

  const handleClearHtml = useCallback(() => {
    userEditedRef.current = true;
    setHtml("");
    setOutput(null);
    setProcessingState("idle");
    setViolations((prev) => prev.filter((v) => v.input !== "html"));
  }, []);

  const handleClearAll = useCallback(() => {
    userEditedRef.current = true;
    setHtml("");
    setSelector("");
    setOptions(defaultOptions);
    setOutput(null);
    setProcessingState("idle");
    setViolations([]);
    setShareTooLarge(false);
    setShareLinkError(false);
  }, []);

  const handleLoadPreset = useCallback((h: string, s: string, o: ExtractorOptions) => {
    userEditedRef.current = true;
    setHtml(h);
    setSelector(s);
    setOptions(o);
  }, []);

  const handleCopyShareLink = useCallback(() => {
    if (shareTooLarge || typeof window === "undefined") return;

    const snapshot: WorkspaceSnapshot = { v: 1, html, selector, options };
    const { hashFragment, tooLarge } = encodeWorkspaceHash(snapshot);

    if (tooLarge) {
      setShareTooLarge(true);
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}${hashFragment}`;
    void copyText(url).then((ok) => {
      showToast(ok ? "Link copied." : "Could not copy link.");
    });
  }, [html, selector, options, shareTooLarge, showToast]);

  const matchCount = output ? output.matchCount : null;
  const showCopyLink = !isWorkspaceVisiblyEmpty(html, selector, options);
  const joinedForCopy = output?.joinedOutput ?? "";

  const htmlViolations = useMemo(() => violationsForInput(violations, "html"), [violations]);
  const selectorViolations = useMemo(() => violationsForInput(violations, "selector"), [violations]);
  const attributeViolations = useMemo(() => violationsForInput(violations, "attribute"), [violations]);
  const baseUrlViolations = useMemo(() => violationsForInput(violations, "baseUrl"), [violations]);
  const stripSelectorsViolations = useMemo(
    () => violationsForInput(violations, "stripSelectors"),
    [violations],
  );

  const engineError = useMemo(() => output?.error, [output?.error]);
  const selectorBlock = selectorViolations.find((v) => v.severity === "block");
  const selectorWarn = selectorViolations.find((v) => v.severity === "warn");
  const selectorHasError = !!engineError || !!selectorBlock;

  useKeyboardShortcuts({
    focusSelector: () => selectorInputRef.current?.focus(),
    copyResults: () => {
      if (!joinedForCopy) return;
      void copyText(joinedForCopy).then((ok) => {
        showToast(ok ? "Copied." : "Could not copy.");
      });
    },
    clearHtml: handleClearHtml,
    toggleHistory: () => {},
    exportJson: () => {
      if (!output || output.matches.length === 0) return;
      exportAsJson(output.matches, {
        mode: options.mode,
        includeIndex: true,
        ...(options.mode === "attribute" && options.attributeName
          ? { attributeName: options.attributeName }
          : {}),
      });
    },
    escape: () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    },
    loadSample: (index: number) => {
      if (index >= 0 && index < prdPresets.length) {
        const p = prdPresets[index]!;
        handleLoadPreset(p.html, p.selector, p.options);
      }
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa]">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[#e5e5e5] bg-white px-4 py-2 text-xs font-medium text-[#171717] shadow-md"
        >
          {toast}
        </div>
      )}

      <TopBar />
      <SeoBar />

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        {shareLinkError && (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            This share link could not be loaded. The workspace may be invalid or corrupted — start fresh or try another
            link.
          </div>
        )}

        <section className="rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="css-selector" className="sr-only">
                CSS selector
              </label>
              <input
                id="css-selector"
                ref={selectorInputRef}
                type="text"
                value={selector}
                onChange={(e) => handleSelectorChange(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    flushExtract();
                  }
                }}
                maxLength={LIMITS.SELECTOR_MAX_LENGTH}
                placeholder="CSS selector, e.g. a[href]"
                aria-label="CSS selector"
                spellCheck={false}
                className={`w-full rounded border-2 bg-[#fafafa] px-4 py-3 font-mono text-sm text-[#171717] outline-none transition-colors placeholder:text-[#a3a3a3] ${
                  selectorHasError
                    ? "border-red-400 focus:border-red-500"
                    : "border-[#e5e5e5] focus:border-[#7c3aed]"
                }`}
              />
              {(engineError || selectorBlock) && (
                <p className="mt-1 font-mono text-xs text-red-600">{engineError || selectorBlock?.message}</p>
              )}
              {!engineError && !selectorBlock && selectorWarn && (
                <p className="mt-1 font-mono text-xs text-amber-700">{selectorWarn.message}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {selector.length > 0 && (
                <span className="whitespace-nowrap font-mono text-[10px] text-[#a3a3a3]">
                  {selector.length} / {LIMITS.SELECTOR_MAX_LENGTH}
                </span>
              )}

              {matchCount !== null && !selectorHasError && (
                <span
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                    processingState === "processing"
                      ? "animate-pulse border-[#7c3aed]/30 bg-[#7c3aed]/10 text-[#7c3aed]"
                      : matchCount > 0
                        ? "border-[#7c3aed]/30 bg-[#7c3aed]/10 text-[#7c3aed]"
                        : "border-[#e5e5e5] bg-[#fafafa] text-[#737373]"
                  }`}
                >
                  {processingState === "processing"
                    ? "…"
                    : `${matchCount} match${matchCount !== 1 ? "es" : ""}`}
                </span>
              )}

              <button
                type="button"
                onClick={flushExtract}
                className="whitespace-nowrap rounded border border-[#7c3aed] bg-[#7c3aed] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#6d28d9]"
              >
                Extract
              </button>

              {shareTooLarge && (
                <span className="max-w-[200px] font-mono text-[10px] leading-tight text-amber-700">
                  Input is too large to encode in a URL.
                </span>
              )}

              {showCopyLink && !shareTooLarge && (
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  title="Copy shareable link with workspace state"
                  className="whitespace-nowrap rounded border border-[#e5e5e5] bg-white px-3 py-2 text-xs text-[#525252] transition-colors hover:border-[#d4d4d4] hover:text-[#171717]"
                >
                  Copy link
                </button>
              )}

              <button
                type="button"
                onClick={handleClearAll}
                aria-label="Clear all"
                className="whitespace-nowrap rounded border border-[#e5e5e5] bg-white px-3 py-2 text-xs text-[#525252] transition-colors hover:border-[#d4d4d4] hover:text-[#171717]"
              >
                Clear all
              </button>
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,38fr)_minmax(0,22fr)_minmax(0,40fr)] lg:items-stretch">
          <div className="min-h-[300px] lg:min-h-[480px]">
            <HtmlInput
              html={html}
              onHtmlChange={handleHtmlChange}
              onClear={handleClearHtml}
              violations={htmlViolations}
              onLoadPreset={handleLoadPreset}
              matchCount={matchCount}
            />
          </div>

          <div className="min-h-0">
            <ControlPanel
              options={options}
              onOptionsChange={handleOptionsChange}
              attributeViolations={attributeViolations}
              stripSelectorsViolations={stripSelectorsViolations}
              baseUrlViolations={baseUrlViolations}
            />
          </div>

          <div className="flex min-h-[300px] min-w-0 flex-col lg:min-h-[480px]">
            <ErrorBoundary
              fallback={
                <div className="flex h-full flex-col items-center justify-center rounded-lg border border-[#e5e5e5] bg-white p-6 text-center shadow-sm">
                  <p className="mb-3 text-sm text-[#525252]">Output panel encountered an error.</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded bg-[#7c3aed] px-3 py-1.5 text-xs text-white transition-colors hover:bg-[#6d28d9]"
                  >
                    Reset
                  </button>
                </div>
              }
            >
              <OutputPanel
                output={output}
                mode={options.mode}
                processingState={processingState}
                attributeName={options.mode === "attribute" ? options.attributeName : undefined}
                prettyPrint={options.prettyPrint}
              />
            </ErrorBoundary>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
