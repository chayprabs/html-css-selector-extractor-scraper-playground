"use client";

import { LIMITS, type LimitViolation } from "@/lib/limits";
import type { ExtractorOptions, ExtractionMode } from "@/types/options";

type ControlPanelProps = {
  options: ExtractorOptions;
  onOptionsChange: (options: ExtractorOptions) => void;
  attributeViolations?: LimitViolation[];
  stripSelectorsViolations?: LimitViolation[];
  baseUrlViolations?: LimitViolation[];
};

const MODE_ITEMS: { id: ExtractionMode; label: string; hint: string }[] = [
  { id: "outerHTML", label: "outerHTML", hint: "Full element markup" },
  { id: "innerHTML", label: "innerHTML", hint: "Inner markup only" },
  { id: "textContent", label: "text", hint: "Plain text (whitespace normalized)" },
  { id: "attribute", label: "attribute", hint: "Single attribute value" },
];

/**
 * Middle panel: extraction mode + options (PRD §6.3).
 */
export default function ControlPanel({
  options,
  onOptionsChange,
  attributeViolations,
  stripSelectorsViolations,
  baseUrlViolations,
}: ControlPanelProps) {
  const update = (patch: Partial<ExtractorOptions>) => {
    onOptionsChange({ ...options, ...patch });
  };

  const htmlModes = options.mode === "outerHTML" || options.mode === "innerHTML";
  const prettyDisabled = !htmlModes;

  return (
    <div className="flex flex-col h-full bg-[#141414] rounded-lg border border-[#222] overflow-hidden">
      <div className="px-3 py-2 border-b border-[#222] shrink-0">
        <span className="text-xs font-sans text-[#888] uppercase tracking-wider">
          Options
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <div className="text-xs text-[#888] mb-2">Extraction mode</div>
          <div className="grid grid-cols-2 gap-1.5">
            {MODE_ITEMS.map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.hint}
                onClick={() =>
                  update({
                    mode: m.id,
                    prettyPrint: m.id === "outerHTML" || m.id === "innerHTML" ? options.prettyPrint : false,
                  })
                }
                className={`px-2 py-1.5 rounded text-[11px] font-mono border transition-colors ${
                  options.mode === m.id
                    ? "bg-[#7c3aed]/25 border-[#7c3aed]/60 text-[#e5e5e5]"
                    : "bg-[#0d0d0d] border-[#333] text-[#888] hover:border-[#555]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <ToggleRow
          label="Pretty-print"
          description="Format HTML output (outerHTML / innerHTML only)"
          checked={options.prettyPrint && htmlModes}
          disabled={prettyDisabled}
          onChange={(v) => update({ prettyPrint: v })}
        />

        <div className="border-t border-[#222] pt-3">
          <TextInputRow
            label="Attribute name"
            description='Shown when mode is "attribute"'
            placeholder="e.g. href"
            value={options.attributeName}
            onChange={(v) => update({ attributeName: v })}
            maxLength={LIMITS.ATTRIBUTE_NAME_MAX_LENGTH}
            violations={attributeViolations}
          />

          <TextAreaRow
            label="Strip elements first"
            description="Selectors to remove before querying (comma or newline)"
            placeholder="e.g. script, style, nav"
            value={options.stripSelectors}
            onChange={(v) => update({ stripSelectors: v })}
            maxLength={4000}
            violations={stripSelectorsViolations}
          />

          <TextInputRow
            label="Base URL"
            description="Rewrite relative href/src across the document"
            placeholder="e.g. https://example.com"
            value={options.baseUrl}
            onChange={(v) => update({ baseUrl: v })}
            maxLength={LIMITS.BASE_URL_MAX_LENGTH}
            violations={baseUrlViolations}
          />
        </div>
      </div>
    </div>
  );
}

type ToggleRowProps = {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ label, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <label
      className={`flex items-start gap-3 p-2 rounded transition-colors ${
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-[#1a1a1a] cursor-pointer"
      }`}
    >
      <div className="pt-0.5 shrink-0">
        <div
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
            checked ? "bg-[#7c3aed] border-[#7c3aed]" : "bg-transparent border-[#444]"
          }`}
        >
          {checked && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          className="sr-only"
        />
      </div>

      <div className="min-w-0">
        <span className="text-sm text-[#e5e5e5]">{label}</span>
        <div className="text-xs text-[#888] mt-0.5">{description}</div>
      </div>
    </label>
  );
}

type TextInputRowProps = {
  label: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  violations?: LimitViolation[];
};

function TextInputRow({ label, description, placeholder, value, onChange, maxLength, violations }: TextInputRowProps) {
  const blockViolation = violations?.find((v) => v.severity === "block");
  const warnViolation = violations?.find((v) => v.severity === "warn");

  return (
    <label className="block p-2">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm text-[#e5e5e5]">{label}</span>
      </div>
      <div className="text-xs text-[#888] mb-1.5">{description}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        maxLength={maxLength}
        className={`w-full px-2.5 py-1.5 bg-[#0d0d0d] text-[#e5e5e5] font-mono text-xs rounded border transition-colors outline-none placeholder:text-[#444] ${
          blockViolation ? "border-red-500/50 focus:border-red-500" : "border-[#333] focus:border-[#7c3aed]"
        }`}
      />
      {blockViolation && <div className="mt-1 text-[10px] text-red-400 font-mono">{blockViolation.message}</div>}
      {!blockViolation && warnViolation && (
        <div className="mt-1 text-[10px] text-yellow-400 font-mono">{warnViolation.message}</div>
      )}
    </label>
  );
}

type TextAreaRowProps = {
  label: string;
  description: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  violations?: LimitViolation[];
};

function TextAreaRow({
  label,
  description,
  placeholder,
  value,
  onChange,
  maxLength,
  violations,
}: TextAreaRowProps) {
  const blockViolation = violations?.find((v) => v.severity === "block");
  const warnViolation = violations?.find((v) => v.severity === "warn");

  return (
    <label className="block p-2">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm text-[#e5e5e5]">{label}</span>
      </div>
      <div className="text-xs text-[#888] mb-1.5">{description}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        rows={3}
        maxLength={maxLength}
        className={`w-full px-2.5 py-1.5 bg-[#0d0d0d] text-[#e5e5e5] font-mono text-xs rounded border transition-colors outline-none placeholder:text-[#444] resize-y min-h-[4rem] ${
          blockViolation ? "border-red-500/50 focus:border-red-500" : "border-[#333] focus:border-[#7c3aed]"
        }`}
      />
      {blockViolation && <div className="mt-1 text-[10px] text-red-400 font-mono">{blockViolation.message}</div>}
      {!blockViolation && warnViolation && (
        <div className="mt-1 text-[10px] text-yellow-400 font-mono">{warnViolation.message}</div>
      )}
    </label>
  );
}
