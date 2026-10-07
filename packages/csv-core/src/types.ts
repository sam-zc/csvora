/**
 * Delimiters supported for auto-detection and parsing.
 */
export type CsvDelimiter = "," | ";" | "\t" | "|";

export const SUPPORTED_DELIMITERS: readonly CsvDelimiter[] = [",", ";", "\t", "|"] as const;

/**
 * Column data types inferred from cell contents.
 * Aligns with @csvora/schemas ColumnType.
 */
export type CsvColumnType = "string" | "number" | "boolean" | "date";

/**
 * A single parsed row of CSV data.
 */
export interface CsvRow {
  /**
   * 0-based index of this row among data rows (excluding the header row).
   */
  readonly index: number;

  /**
   * 1-based line number in the source text where this row started.
   */
  readonly lineNumber: number;

  /**
   * Raw string values for each field in this row, in order.
   */
  readonly fields: readonly string[];
}

/**
 * Diagnostic codes for syntax errors and structural warnings.
 */
export type CsvDiagnosticCode =
  | "unterminated_quote"
  | "unexpected_quote"
  | "too_few_fields"
  | "too_many_fields"
  | "duplicate_header"
  | "empty_header";

/**
 * A diagnostic issue encountered during CSV parsing.
 */
export interface CsvDiagnostic {
  readonly severity: "error" | "warning";
  readonly code: CsvDiagnosticCode;
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
}

/**
 * Options configuring CSV parsing behavior.
 */
export interface CsvParseOptions {
  /**
   * Delimiter character separating fields.
   * If omitted or undefined, auto-detection is performed.
   */
  readonly delimiter?: string | undefined;

  /**
   * Whether the first non-empty row represents column headers.
   * Defaults to true.
   */
  readonly header?: boolean | undefined;

  /**
   * Whether to skip empty or blank lines.
   * Defaults to true.
   */
  readonly skipEmptyLines?: boolean | undefined;

  /**
   * Whether to trim unquoted leading and trailing whitespace from cell values.
   * Defaults to false (RFC 4180 preserves whitespace).
   */
  readonly trimWhitespace?: boolean | undefined;
}

/**
 * The parsed, framework-independent representation of a CSV document.
 */
export interface CsvDocument {
  /**
   * Column header names as declared in the source CSV.
   * Empty array if parsing without headers or for empty input.
   */
  readonly headers: readonly string[];

  /**
   * Parsed data rows.
   */
  readonly rows: readonly CsvRow[];

  /**
   * The delimiter character used to parse this document.
   */
  readonly delimiter: string;

  /**
   * Total number of data rows (rows.length).
   */
  readonly rowCount: number;

  /**
   * Number of columns (headers.length, or first row's field count if no headers).
   */
  readonly columnCount: number;
}

/**
 * The complete result of parsing CSV text, including the document and any diagnostics.
 */
export interface CsvParseResult {
  /**
   * True if no fatal errors (severity: 'error') occurred.
   */
  readonly success: boolean;

  /**
   * The parsed CSV document.
   */
  readonly document: CsvDocument;

  /**
   * Structured diagnostics (syntax errors, field count mismatches, header warnings).
   */
  readonly diagnostics: readonly CsvDiagnostic[];
}
