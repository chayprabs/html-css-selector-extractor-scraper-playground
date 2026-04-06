"use client";

import { LIMITS, type LimitViolation } from "@/lib/limits";

export type ExtractorOptions = {
  textOnly: boolean;
  prettyPrint: boolean;
  ignoreWhitespace: boolean;
  attribute: string;
  removeNodes: string;
  baseUrl: string;
};

export const defaultOptions: ExtractorOptions = {
  textOnly: false,
  prettyPrint: false,
  ignoreWhitespace: false,
  attribute: "",
  removeNodes: "",
  baseUrl: "",
};

type ControlPanelProps = {
  options: ExtractorOptions;
  onOptionsChange: (options: ExtractorOptions) => void;
  attributeViolations?: LimitViolation[];
  removeNodesViolations?: LimitViolation[];
  baseUrlViolations?: LimitViolation[];
};

/**
 * Middle panel: all extraction option controls.
 * Each option is a labeled row with description.
 */
export default function ControlPanel({
  options,
  onOptionsChange,
  attributeViolations,
  removeNodesViolations,
  baseUrlViolations,
}: ControlPanelProps) {
  const update = (patch: Partial<ExtractorOptions>) => {
    onOptionsChange({ ...options, ...patch });
  };

  return (
    <div className="flex flex-col h-full bg-[#141414] rounded-lg border border-[#222] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#222] shrink-0">
        <span className="text-xs font-sans text-[#888] uppercase tracking-wider">
          Options
        </span>
      </div>

      {/* Controls */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Text only */}
        <ToggleRow
          label="Text only"
          description="Return plain text instead of HTML"
          checked={options.textOnly}
          onChange={(v) => update({ textOnly: v })}
        />

        {/* Pretty print */}
        <ToggleRow
          label="Pretty print"
          description="Format and indent output HTML"
          checked={options.prettyPrint}
          onChange={(v) => update({ prettyPrint: v })}
        />

        {/* Ignore whitespace */}
        <ToggleRow
          label="Ignore whitespace"
          description="Collapse whitespace in text output"
          checked={options.ignoreWhitespace}
          onChange={(v) => update({ ignoreWhitespace: v })}
        />

        <div className="border-t border-[#222] my-3" />

        {/* Attribute */}
        <TextInputRow
          label="Attribute"
          description="Extract this attribute from matches"
          placeholder="href, class, data-id..."
          value={options.attribute}
          onChange={(v) => update({ attribute: v })}
          maxLength={200}
          violations={attributeViolations}
        />

        {/* Remove nodes */}
        <TextInputRow
          label="Remove nodes"
          description="Strip elements matching this selector first"
          placeholder="script, style, .ads..."
          value={options.removeNodes}
          onChange={(v) => update({ removeNodes: v })}
          maxLength={LIMITS.SELECTOR_MAX_LENGTH}
          violations={removeNodesViolations}
        />

        {/* Base URL */}
        <TextInputRow
          label="Base URL"
          description="Rewrite relative URLs with this prefix"
          placeholder="https://example.com"
          value={options.baseUrl}
          onChange={(v) => update({ baseUrl: v })}
          maxLength={LIMITS.BASE_URL_MAX_LENGTH}
          violations={baseUrlViolations}
        />
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

type ToggleRowProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-start gap-3 p-2 rounded hover:bg-[#1a1a1a] cursor-pointer transition-colors">
      {/* Custom styled checkbox */}
      <div className="pt-0.5 shrink-0">
        <div
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
            checked
              ? "bg-[#7c3aed] border-[#7c3aed]"
              : "bg-transparent border-[#444]"
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
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-[#e5e5e5]">{label}</span>
        </div>
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
          blockViolation
            ? "border-red-500/50 focus:border-red-500"
            : "border-[#333] focus:border-[#7c3aed]"
        }`}
      />
      {/* Validation messages */}
      {blockViolation && (
        <div className="mt-1 text-[10px] text-red-400 font-mono">
          {blockViolation.message}
        </div>
      )}
      {!blockViolation && warnViolation && (
        <div className="mt-1 text-[10px] text-yellow-400 font-mono">
          {warnViolation.message}
        </div>
      )}
    </label>
  );
}
