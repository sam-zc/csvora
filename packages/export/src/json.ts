import type { CsvDocument } from "@csvora/csv-core";
import { getExportFilename } from "./filename";
import type { ExportResult, JsonExportOptions, LosslessJsonExport } from "./types";

/**
 * Exports a CsvDocument to lossless JSON format.
 *
 * Rules:
 * - Solves the duplicate and empty headers problem by storing columns as an array of
 *   descriptors ({ id, header, sourceIndex }) rather than a naive object key map.
 * - Preserves uneven rows with extra or missing fields without data loss.
 * - Preserves source row order and full Unicode characters.
 * - Serializes safely using JSON.stringify (never hand-built).
 * - Pretty-printed with 2-space indentation by default.
 * - Never mutates the source CsvDocument.
 */
export function exportJson(document: CsvDocument, options?: JsonExportOptions): ExportResult {
  const columns = document.headers.map((header, index) => ({
    id: `col_${index}`,
    header,
    sourceIndex: index,
  }));

  const rows = document.rows.map((row) => [...row.fields]);

  const exportPayload: LosslessJsonExport = {
    columns,
    rows,
  };

  const pretty = options?.pretty ?? true;
  const content = `${JSON.stringify(exportPayload, null, pretty ? 2 : undefined)}\n`;

  return {
    content,
    mimeType: "application/json;charset=utf-8",
    fileExtension: "json",
    suggestedFilename: getExportFilename(options?.filename, "json"),
  };
}
