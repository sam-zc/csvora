import { isPotentialFormula } from "./formula";
import type { CsvDocument } from "./types";

/**
 * Formula safety policy for cell values starting with '=', '+', '-', or '@'.
 * - 'escape': prefixes formula-like cells with a single quote "'" to neutralize spreadsheet execution.
 * - 'preserve': leaves formula characters as-is.
 */
export type FormulaPolicy = "escape" | "preserve";

/**
 * Safely escapes a cell value that presents a spreadsheet formula injection risk
 * by prefixing it with a single quote (').
 *
 * Does not mutate the input string.
 */
export function escapeFormulaValue(value: string): string {
  if (!value) {
    return value;
  }
  if (isPotentialFormula(value)) {
    return `'${value}`;
  }
  return value;
}

/**
 * Options configuring RFC 4180 CSV serialization.
 */
export interface CsvSerializeOptions {
  /**
   * Field delimiter character. Defaults to document.delimiter or ','.
   */
  readonly delimiter?: string | undefined;

  /**
   * Line terminator to use. Defaults to '\r\n' (RFC 4180 CRLF).
   */
  readonly lineTerminator?: "\r\n" | "\n" | undefined;

  /**
   * Formula safety policy for cell values starting with '=', '+', '-', or '@'.
   * Defaults to 'escape'.
   */
  readonly formulaPolicy?: FormulaPolicy | undefined;

  /**
   * Whether to include a UTF-8 Byte Order Mark (\uFEFF) at the start of output.
   * Defaults to false.
   */
  readonly includeBom?: boolean | undefined;

  /**
   * Whether to write the header row.
   * Defaults to true (if document.headers is non-empty).
   */
  readonly header?: boolean | undefined;
}

/**
 * Formats a single CSV field value according to RFC 4180 quoting and escaping rules:
 * - If the value contains the delimiter, double quotes, carriage returns, newlines,
 *   or leading/trailing whitespace, it is enclosed in double quotes.
 * - Embedded double quotes are escaped by doubling them ("").
 */
export function quoteCsvField(value: string, delimiter: string): string {
  if (value.length === 0) {
    return "";
  }

  const needsQuotes =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\r") ||
    value.includes("\n") ||
    value.startsWith(" ") ||
    value.endsWith(" ") ||
    value.startsWith("\t") ||
    value.endsWith("\t");

  if (!needsQuotes) {
    return value;
  }

  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

/**
 * Serializes a parsed CsvDocument into a deterministic, RFC 4180 compliant CSV string.
 *
 * Rules:
 * - Preserves original headers, row order, and empty fields.
 * - Preserves malformed extra row fields without truncation.
 * - Quotes fields containing delimiters, quotes, newlines, or leading/trailing whitespace.
 * - Escapes double quotes by doubling ("").
 * - Neutralizes formula injection risks by default (formulaPolicy: 'escape').
 * - Preserves full Unicode content (Tamil, CJK, emoji, currency symbols).
 * - Uses deterministic CRLF ('\r\n') line endings by default.
 * - Never mutates the source CsvDocument or its rows.
 */
export function serializeCsv(document: CsvDocument, options?: CsvSerializeOptions): string {
  const delimiter = options?.delimiter ?? document.delimiter ?? ",";
  const lineTerminator = options?.lineTerminator ?? "\r\n";
  const formulaPolicy = options?.formulaPolicy ?? "escape";
  const writeHeader = options?.header ?? true;
  const includeBom = options?.includeBom ?? false;

  if (document.headers.length === 0 && document.rows.length === 0) {
    return "";
  }

  const lines: string[] = [];

  // 1. Header row
  if (writeHeader && document.headers.length > 0) {
    const formattedHeaders = document.headers.map((h) => quoteCsvField(h, delimiter));
    lines.push(formattedHeaders.join(delimiter));
  }

  // 2. Data rows
  for (const row of document.rows) {
    const formattedRowFields = row.fields.map((field) => {
      const processedField = formulaPolicy === "escape" ? escapeFormulaValue(field) : field;
      return quoteCsvField(processedField, delimiter);
    });
    lines.push(formattedRowFields.join(delimiter));
  }

  const prefix = includeBom ? "\uFEFF" : "";
  const body = lines.length > 0 ? `${lines.join(lineTerminator)}${lineTerminator}` : "";

  return `${prefix}${body}`;
}
