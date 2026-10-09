import { type CsvDocument, escapeFormulaValue, quoteCsvField } from "@csvora/csv-core";
import type { PresentationConfig } from "@csvora/schemas";
import { formatPresentationValue, getVisibleColumns } from "@csvora/table-engine";
import { getExportFilename } from "./filename";
import type { ExportResult, FormattedCsvExportOptions } from "./types";

/**
 * Exports a CsvDocument to formatted CSV format based on active PresentationConfig.
 *
 * Rules:
 * - Respects active presentation column order.
 * - Respects column visibility: exports visible columns only, excluding hidden columns.
 * - Delegates cell formatting to the semantic formatting engine in @csvora/table-engine.
 * - Applies formula injection safety by default (formulaPolicy: 'escape').
 * - Malformed row policy: formatted export includes only mapped presentation columns,
 *   safely ignoring unmapped extra fields beyond the schema.
 * - Preserves source row order and full Unicode characters.
 * - Uses deterministic CRLF ('\r\n') line endings by default.
 * - Never mutates the source CsvDocument or PresentationConfig.
 */
export function exportFormattedCsv(
  document: CsvDocument,
  presentation: PresentationConfig,
  options?: FormattedCsvExportOptions,
): ExportResult {
  const delimiter = options?.delimiter ?? document.delimiter ?? ",";
  const lineTerminator = options?.lineTerminator ?? "\r\n";
  const formulaPolicy = options?.formulaPolicy ?? "escape";
  const includeBom = options?.includeBom ?? false;

  const visibleColumns = getVisibleColumns(presentation);

  if (
    visibleColumns.length === 0 ||
    (document.headers.length === 0 && document.rows.length === 0)
  ) {
    return {
      content: "",
      mimeType: "text/csv;charset=utf-8",
      fileExtension: "csv",
      suggestedFilename: getExportFilename(options?.filename, "formatted-csv"),
    };
  }

  const lines: string[] = [];

  // 1. Header row
  const headerFields = visibleColumns.map((col) => quoteCsvField(col.header, delimiter));
  lines.push(headerFields.join(delimiter));

  // 2. Data rows
  for (const row of document.rows) {
    const rowFields = visibleColumns.map((col) => {
      const rawValue = row.fields[col.sourceIndex];
      const formatted = formatPresentationValue(rawValue, col);
      const safeValue = formulaPolicy === "escape" ? escapeFormulaValue(formatted) : formatted;
      return quoteCsvField(safeValue, delimiter);
    });
    lines.push(rowFields.join(delimiter));
  }

  const prefix = includeBom ? "\uFEFF" : "";
  const body = lines.length > 0 ? `${lines.join(lineTerminator)}${lineTerminator}` : "";

  return {
    content: `${prefix}${body}`,
    mimeType: "text/csv;charset=utf-8",
    fileExtension: "csv",
    suggestedFilename: getExportFilename(options?.filename, "formatted-csv"),
  };
}
