export type ExtractionMode = "outerHTML" | "innerHTML" | "textContent" | "attribute";

export type ExtractorOptions = {
  mode: ExtractionMode;
  /** Required when mode is "attribute" */
  attributeName: string;
  /** Comma- or newline-separated selectors to remove before the main query */
  stripSelectors: string;
  baseUrl: string;
  /** Only applies when mode is outerHTML or innerHTML */
  prettyPrint: boolean;
};

export const defaultOptions: ExtractorOptions = {
  mode: "outerHTML",
  attributeName: "",
  stripSelectors: "",
  baseUrl: "",
  prettyPrint: false,
};
