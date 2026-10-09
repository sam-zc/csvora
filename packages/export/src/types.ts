import type { FormulaPolicy } from "@csvora/csv-core";

export type { FormulaPolicy };

/**
 * Identifier for supported export formats.
 */
export type ExportFormat = "csv" | "formatted-csv" | "markdown" | "json";

/**
 * Serializable result of an export operation.
 * Completely decoupled from browser Blob, DOM, or download APIs.
 */
export interface ExportResult {
  /**
   * The serialized text content of the export.
   */
  readonly content: string;

  /**
   * Standard MIME type for this content (e.g. "text/csv;charset=utf-8").
   */
  readonly mimeType: string;

  /**
   * Default file extension without a leading dot (e.g. "csv", "md", "json").
   */
  readonly fileExtension: string;

  /**
   * Suggested sanitized filename for saving or downloading.
   */
  readonly suggestedFilename: string;
}

/**
 * Options for exporting raw CSV.
 */
export interface RawCsvExportOptions {
  /**
   * Custom field delimiter character. Defaults to document.delimiter or ','.
   */
  readonly delimiter?: string | undefined;

  /**
   * Line terminator. Defaults to '\r\n' (RFC 4180 CRLF).
   */
  readonly lineTerminator?: "\r\n" | "\n" | undefined;

  /**
   * Formula safety policy.
   * 'escape': prefixes formula-like cells with a single quote "'"
   * 'preserve': outputs raw cell content without prefixing
   * Defaults to 'escape'.
   */
  readonly formulaPolicy?: FormulaPolicy | undefined;

  /**
   * Whether to include a UTF-8 Byte Order Mark (\uFEFF) at start of output.
   * Defaults to false.
   */
  readonly includeBom?: boolean | undefined;

  /**
   * Suggested base filename or full filename.
   */
  readonly filename?: string | undefined;
}

/**
 * Options for exporting formatted CSV.
 */
export interface FormattedCsvExportOptions {
  /**
   * Custom field delimiter character. Defaults to document.delimiter or ','.
   */
  readonly delimiter?: string | undefined;

  /**
   * Line terminator. Defaults to '\r\n' (RFC 4180 CRLF).
   */
  readonly lineTerminator?: "\r\n" | "\n" | undefined;

  /**
   * Formula safety policy.
   * Defaults to 'escape'.
   */
  readonly formulaPolicy?: FormulaPolicy | undefined;

  /**
   * Whether to include a UTF-8 Byte Order Mark (\uFEFF) at start of output.
   * Defaults to false.
   */
  readonly includeBom?: boolean | undefined;

  /**
   * Suggested base filename or full filename.
   */
  readonly filename?: string | undefined;
}

/**
 * Options for exporting Markdown tables.
 */
export interface MarkdownExportOptions {
  /**
   * Line terminator. Defaults to '\n'.
   */
  readonly lineTerminator?: "\r\n" | "\n" | undefined;

  /**
   * Suggested base filename or full filename.
   */
  readonly filename?: string | undefined;
}

/**
 * Options for exporting lossless JSON.
 */
export interface JsonExportOptions {
  /**
   * Whether to pretty-print JSON with 2-space indentation.
   * Defaults to true.
   */
  readonly pretty?: boolean | undefined;

  /**
   * Suggested base filename or full filename.
   */
  readonly filename?: string | undefined;
}

/**
 * Column descriptor in lossless JSON export representation.
 */
export interface LosslessJsonColumn {
  readonly id: string;
  readonly header: string;
  readonly sourceIndex: number;
}

/**
 * Lossless JSON export data structure preserving duplicate and empty headers and uneven rows.
 */
export interface LosslessJsonExport {
  readonly columns: readonly LosslessJsonColumn[];
  readonly rows: readonly (readonly string[])[];
}
