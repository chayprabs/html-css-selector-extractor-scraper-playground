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
