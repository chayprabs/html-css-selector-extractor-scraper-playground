/**
 * HTML Extractor — main page.
 *
 * State lives here. All children are controlled components.
 * Engine runs in a Web Worker with timeout protection.
 * All inputs are validated before dispatching to the worker.
 * Rate limiter prevents rapid-fire engine invocations.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SelectorBar from "@/components/SelectorBar";
import HtmlInput from "@/components/HtmlInput";
import ControlPanel, { type ExtractorOptions, defaultOptions } from "@/components/ControlPanel";
import OutputPanel from "@/components/OutputPanel";
import type { ExtractorOutput } from "@/lib/extractor";
import { LIMITS, type LimitViolation } from "@/lib/limits";
import {
  validateHtml,
  validateSelector,
  validateAttribute,
  validateBaseUrl,
  validateRemoveNodesSelector,
} from "@/lib/validators";
import { useExtractorWorker } from "@/lib/useExtractorWorker";
import { useRateLimiter } from "@/lib/useRateLimiter";
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

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { runExtraction } = useExtractorWorker();
  const { checkLimit, reset: resetRateLimit } = useRateLimiter(LIMITS.ENGINE_MAX_RUNS_PER_MINUTE);

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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current);
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

  return (
    <div className="flex flex-col h-screen bg-[#0d0d0d] overflow-hidden">
      {/* Rate limit banner */}
      {rateLimitMessage && (
        <div className="px-4 py-2 bg-red-950/60 border-b border-red-500/30 text-xs text-red-400 font-mono text-center">
          {rateLimitMessage}
        </div>
      )}

      {/* Top bar — selector input */}
      <SelectorBar
        selector={selector}
        onSelectorChange={setSelector}
        matchCount={matchCount}
        error={output?.error}
        onClear={handleClearAll}
        violations={selectorViolations}
        processingState={processingState}
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
          <OutputPanel
            output={output}
            mode={displayMode}
            processingState={processingState}
          />
        </div>
      </div>
    </div>
  );
}
