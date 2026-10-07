import type { CsvDocument } from "@csvora/csv-core";
import { inferColumnTypes } from "@csvora/csv-core";
import {
  type ColumnAlign,
  type ColumnPresentation,
  type ColumnType,
  type TablePresentationConfig,
  MIN_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
  presentationConfigSchema,
} from "@csvora/schemas";

export { MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH };

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
 * Normalizes a column width value to a valid integer in logical pixels bounded
 * by [MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH].
 */
export function normalizeColumnWidth(width: number): number {
  if (!Number.isFinite(width)) {
    return MIN_COLUMN_WIDTH;
  }
  const rounded = Math.round(width);
  return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, rounded));
}

/**
 * Pure helper for deriving visible columns in current presentation order.
 * Filtering and order logic is kept in domain behavior, avoiding React component coupling.
 */
export function getVisibleColumns(presentation: TablePresentationConfig): ColumnPresentation[] {
  return presentation.columns.filter((col) => col.visible);
}

/**
 * Determines whether a column can safely be hidden.
 * Enforces the domain rule that prevents hiding the last remaining visible column.
 */
export function canHideColumn(presentation: TablePresentationConfig, columnId: string): boolean {
  const target = presentation.columns.find((c) => c.id === columnId);
  if (!target) return false;
  // If already hidden, toggling/hiding is not disabling the last visible
  if (!target.visible) return true;
  // If visible, can only hide if at least one other column is currently visible
  const visibleCount = presentation.columns.filter((c) => c.visible).length;
  return visibleCount > 1;
}

/**
 * Immutably updates the visibility of a specific column.
 *
 * Rules:
 * - If hiding the column (`visible === false`), verifies that at least one other
 *   column remains visible. Attempting to hide the last visible column is a no-op
 *   and returns the presentation unchanged.
 * - Preserves all other presentation settings (type override, alignment, width).
 * - Never mutates the raw CsvDocument.
 */
export function setColumnVisibility(
  presentation: TablePresentationConfig,
  columnId: string,
  visible: boolean,
): TablePresentationConfig {
  if (!visible && !canHideColumn(presentation, columnId)) {
    return presentation;
  }

  const nextColumns = presentation.columns.map((col) => {
    if (col.id !== columnId) return col;
    return {
      ...col,
      visible,
    };
  });

  return {
    ...presentation,
    columns: nextColumns,
  };
}

/**
 * Immutably moves a column left/earlier or right/later in visual presentation order.
 *
 * Rules:
 * - Presentation order is stored directly in `columns` array order.
 * - Does NOT mutate `sourceIndex` or `id`.
 * - Moving the first column left/up is a no-op.
 * - Moving the last column right/down is a no-op.
 * - Unknown column IDs safely return presentation unchanged.
 * - Hidden columns maintain their deterministic relative order.
 */
export function moveColumn(
  presentation: TablePresentationConfig,
  columnId: string,
  direction: "left" | "right" | "up" | "down",
): TablePresentationConfig {
  const fromIndex = presentation.columns.findIndex((col) => col.id === columnId);
  if (fromIndex === -1) {
    return presentation;
  }

  const isEarlier = direction === "left" || direction === "up";
  const toIndex = isEarlier ? fromIndex - 1 : fromIndex + 1;

  if (toIndex < 0 || toIndex >= presentation.columns.length) {
    return presentation;
  }

  const nextColumns = [...presentation.columns];
  const [removed] = nextColumns.splice(fromIndex, 1);
  if (!removed) {
    return presentation;
  }
  nextColumns.splice(toIndex, 0, removed);

  return {
    ...presentation,
    columns: nextColumns,
  };
}

/**
 * Immutably sets a column's width in logical pixels.
 * Passing `undefined` clears the custom width, returning the column to automatic sizing.
 * Numeric widths are normalized to bounded integers within [MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH].
 */
export function setColumnWidth(
  presentation: TablePresentationConfig,
  columnId: string,
  width: number | undefined,
): TablePresentationConfig {
  const normalized = width !== undefined ? normalizeColumnWidth(width) : undefined;

  const nextColumns = presentation.columns.map((col) => {
    if (col.id !== columnId) return col;
    return {
      ...col,
      width: normalized,
    };
  });

  return {
    ...presentation,
    columns: nextColumns,
  };
}

/**
 * Immutably restores a single column presentation to automatic/inferred defaults:
 * clears typeOverride, clears custom width, restores visibility to true, and resets
 * alignment to the default for its inferredType. Does not alter column order.
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
      visible: true,
      width: undefined,
    };
  });

  return {
    ...presentation,
    columns: nextColumns,
  };
}

/**
 * Immutably resets the table layout to default source configuration:
 * - Restores source column order (sorted by sourceIndex)
 * - Restores visibility for all columns (visible: true)
 * - Clears all custom column widths (width: undefined)
 * - Preserves semantic type overrides and alignment overrides.
 */
export function resetLayout(presentation: TablePresentationConfig): TablePresentationConfig {
  const nextColumns = [...presentation.columns]
    .sort((a, b) => a.sourceIndex - b.sourceIndex)
    .map((col) => ({
      ...col,
      visible: true,
      width: undefined,
    }));

  return {
    ...presentation,
    columns: nextColumns,
  };
}

/**
 * Canonical alias for resetLayout.
 */
export const resetPresentationLayout = resetLayout;
