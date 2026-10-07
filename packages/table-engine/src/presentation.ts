import type { CsvDocument } from "@csvora/csv-core";
import { inferColumnTypes } from "@csvora/csv-core";
import {
  type ColumnAlign,
  type ColumnPresentation,
  type ColumnType,
  type TablePresentationConfig,
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
 * Canonical default horizontal alignment for a given semantic column type.
 * Number columns default to right alignment; all others default to left alignment.
 */
export function getDefaultAlignmentForType(type: ColumnType): ColumnAlign {
  return type === "number" ? "right" : "left";
}

/**
 * Resolves the effective presentation type for a column.
 *
 * Rules:
 * - If an explicit type override is present, returns the user override.
 * - Otherwise, returns the automatically inferred type.
 */
export function getEffectiveColumnType(column: {
  readonly inferredType: ColumnType;
  readonly typeOverride?: ColumnType | undefined;
}): ColumnType {
  return column.typeOverride ?? column.inferredType;
}

/**
 * Lightweight column content profile summarizing non-empty and empty row counts.
 */
export interface ColumnProfile {
  readonly totalRows: number;
  readonly nonEmptyCount: number;
  readonly emptyCount: number;
}

/**
 * Computes non-empty and empty cell counts for a column without mutating the source document.
 */
export function getColumnProfile(document: CsvDocument, sourceIndex: number): ColumnProfile {
  let nonEmptyCount = 0;
  let emptyCount = 0;

  for (const row of document.rows) {
    const val = row.fields[sourceIndex];
    if (val !== undefined && val.trim().length > 0) {
      nonEmptyCount++;
    } else {
      emptyCount++;
    }
  }

  return {
    totalRows: document.rowCount,
    nonEmptyCount,
    emptyCount,
  };
}

/**
 * Pure function producing the default PresentationConfig for a given CsvDocument.
 *
 * Rules:
 * - Preserves source header order.
 * - All columns are visible by default.
 * - Assigns stable, unique internal identifiers based on source index ("col_0", "col_1", ...)
 *   ensuring duplicate or empty headers never cause key collisions.
 * - Stores conservative column type inference on each column (`inferredType`).
 * - Initializes `align` based on inferred type default ("right" for numeric, "left" otherwise).
 * - Never mutates the raw CsvDocument or its rows.
 */
export function createDefaultPresentation(document: CsvDocument): TablePresentationConfig {
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
    const inferredType = inferredTypes[i] ?? "string";
    const align = getDefaultAlignmentForType(inferredType);

    columns.push({
      id: `col_${i}`,
      sourceIndex: i,
      header: rawHeader,
      visible: true,
      align,
      inferredType,
    });
  }

  return presentationConfigSchema.parse({
    rendererId: "table",
    columns,
  });
}

/**
 * Immutably updates the presentation type override for a specific column.
 * Passing `undefined` clears the override, returning the column to automatic inferred type.
 */
export function setColumnTypeOverride(
  presentation: TablePresentationConfig,
  columnId: string,
  typeOverride: ColumnType | undefined,
): TablePresentationConfig {
  const nextColumns = presentation.columns.map((col) => {
    if (col.id !== columnId) return col;
    return {
      ...col,
      typeOverride,
    };
  });

  return {
    ...presentation,
    columns: nextColumns,
  };
}

/**
 * Immutably updates the horizontal text alignment for a specific column.
 */
export function setColumnAlignment(
  presentation: TablePresentationConfig,
  columnId: string,
  align: ColumnAlign,
): TablePresentationConfig {
  const nextColumns = presentation.columns.map((col) => {
    if (col.id !== columnId) return col;
    return {
      ...col,
      align,
    };
  });

  return {
    ...presentation,
    columns: nextColumns,
  };
}

/**
 * Immutably restores a single column presentation to automatic/inferred defaults:
 * clears typeOverride, and resets alignment to the default for its inferredType.
 */
export function resetColumnPresentation(
  presentation: TablePresentationConfig,
  columnId: string,
): TablePresentationConfig {
  const nextColumns = presentation.columns.map((col) => {
    if (col.id !== columnId) return col;
    return {
      ...col,
      typeOverride: undefined,
      align: getDefaultAlignmentForType(col.inferredType),
    };
  });

  return {
    ...presentation,
    columns: nextColumns,
  };
}
