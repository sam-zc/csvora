import { type CsvDocument, serializeCsv } from "@csvora/csv-core";
import { getExportFilename, sanitizeFilename } from "./filename";
import type { ExportResult, RawCsvExportOptions } from "./types";

/**
 * Exports a CsvDocument to raw CSV format.
 *
 * Rules:
 * - Operates strictly on raw CsvDocument values and source order.
 * - Preserves all columns, even if hidden in presentation.
 * - Preserves malformed extra fields in rows without truncation.
 * - Preserves duplicate headers and empty headers losslessly.
 * - Quotes fields containing delimiters, quotes, newlines, or whitespace per RFC 4180.
 * - Escapes potential spreadsheet formulas by prefixing with "'" by default (formulaPolicy: 'escape').
 * - Preserves full Unicode content (Tamil, CJK, emoji, currency symbols).
 * - Never mutates the input CsvDocument.
 */
export function exportRawCsv(document: CsvDocument, options?: RawCsvExportOptions): ExportResult {
  const content = serializeCsv(document, {
    delimiter: options?.delimiter,
    lineTerminator: options?.lineTerminator ?? "\r\n",
    formulaPolicy: options?.formulaPolicy ?? "escape",
    includeBom: options?.includeBom ?? false,
  });

  const suggestedFilename = options?.filename
    ? sanitizeFilename(options.filename)
    : getExportFilename(undefined, "csv");

  return {
    content,
    mimeType: "text/csv;charset=utf-8",
    fileExtension: "csv",
    suggestedFilename,
  };
}
