import type { MatchResult } from "./extractor";

export type ExportOptions = {
  mode: "html" | "text" | "attribute";
  attributeName?: string;
  includeIndex: boolean;
};

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getValue(match: MatchResult, opts: ExportOptions): string {
  switch (opts.mode) {
    case "attribute":
      return match.attribute ?? "";
    case "text":
      return match.text;
    default:
      return match.raw;
  }
}

export function exportAsJson(matches: MatchResult[], opts: ExportOptions): void {
  const data = matches.map((m, i) => {
    const entry: Record<string, unknown> = {};
    if (opts.includeIndex) entry.index = i;
    if (opts.mode !== "text") entry.html = m.raw;
    entry.text = m.text;
    if (opts.mode === "attribute" && opts.attributeName) {
      entry[opts.attributeName] = m.attribute ?? "";
    }
    return entry;
  });

  const json = JSON.stringify(data, null, 2);
  triggerDownload(json, "extraction-results.json", "application/json");
}

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function exportAsCsv(matches: MatchResult[], opts: ExportOptions): void {
  const headers: string[] = [];
  if (opts.includeIndex) headers.push("index");
  if (opts.mode !== "text") headers.push("html");
  headers.push("text");
  if (opts.mode === "attribute" && opts.attributeName) {
    headers.push(opts.attributeName);
  }

  const rows = [headers.join(",")];
  matches.forEach((m, i) => {
    const cells: string[] = [];
    if (opts.includeIndex) cells.push(String(i));
    if (opts.mode !== "text") cells.push(escapeCsvValue(m.raw));
    cells.push(escapeCsvValue(m.text));
    if (opts.mode === "attribute" && opts.attributeName) {
      cells.push(escapeCsvValue(m.attribute ?? ""));
    }
    rows.push(cells.join(","));
  });

  const csv = "\uFEFF" + rows.join("\n");
  triggerDownload(csv, "extraction-results.csv", "text/csv;charset=utf-8");
}

export function exportAsText(matches: MatchResult[], opts: ExportOptions): void {
  const lines = matches.map((m, i) => {
    const value = getValue(m, opts);
    const prefix = opts.includeIndex ? `${i + 1}. ` : "";
    return prefix + value;
  });

  // Use blank line separator if any entry is multiline
  const separator = lines.some((l) => l.includes("\n")) ? "\n\n" : "\n";
  const text = lines.join(separator);
  triggerDownload(text, "extraction-results.txt", "text/plain;charset=utf-8");
}
