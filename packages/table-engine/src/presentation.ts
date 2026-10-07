import type { CsvDocument } from "@csvora/csv-core";
import { inferColumnTypes } from "@csvora/csv-core";
import {
  type ColumnPresentation,
  type PresentationConfig,
  presentationConfigSchema,
} from "@csvora/schemas";

/**
 * Returns a human-facing label for a column header.
 *
 * If the source header is empty or whitespace-only, returns a deterministic
 * 1-indexed fallback (e.g. "Column 1", "Column 2") for display purposes only,
 * without mutating the underlying CsvDocument or ColumnPresentation.
 */
export function getColumnDisplayLabel(column: {
  readonly header: string;
  readonly sourceIndex: number;
}): string {
  const trimmed = column.header.trim();
  if (trimmed.length > 0) {
    return column.header;
  }
  return `Column ${column.sourceIndex + 1}`;
}

/**
 * Pure function producing the default PresentationConfig for a given CsvDocument.
 *
 * Rules:
 * - Preserves source header order.
 * - All columns are visible by default.
 * - Assigns stable, unique internal identifiers based on source index ("col_0", "col_1", ...)
 *   ensuring duplicate or empty headers never cause key collisions.
 * - Uses conservative column type inference to set alignment ("right" for numeric, "left" otherwise).
 * - Never mutates the raw CsvDocument or its rows.
 */
export function createDefaultPresentation(document: CsvDocument): PresentationConfig {
  const columnCount = document.columnCount;
  if (columnCount === 0) {
    return presentationConfigSchema.parse({
      rendererId: "table",
      columns: [],
    });
  }

  const inferredTypes = inferColumnTypes(document);
  const columns: ColumnPresentation[] = [];

  for (let i = 0; i < columnCount; i++) {
    const rawHeader = document.headers[i] ?? "";
    const inferredType = inferredTypes[i];
    const align = inferredType === "number" ? "right" : "left";

    columns.push({
      id: `col_${i}`,
      sourceIndex: i,
      header: rawHeader,
      visible: true,
      align,
    });
  }

  return presentationConfigSchema.parse({
    rendererId: "table",
    columns,
  });
}
