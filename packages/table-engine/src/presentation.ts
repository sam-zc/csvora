import type { CsvDocument } from "@csvora/csv-core";
import { inferColumnTypes } from "@csvora/csv-core";
import {
  type ColumnAlign,
  type ColumnFormat,
  type ColumnPresentation,
  type ColumnType,
  type DeparturesConfig,
  type PresentationConfig,
  type RendererId,
  type SemanticIntent,
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
      conditionalRules: [],
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
 * Immutably updates the semantic format for a specific column.
 */
export function setColumnFormat(
  presentation: PresentationConfig,
  columnId: string,
  format: ColumnFormat | undefined,
): PresentationConfig {
  const nextColumns = presentation.columns.map((col) => {
    if (col.id !== columnId) return col;
    return {
      ...col,
      format,
    };
  });

  return {
    ...presentation,
    columns: nextColumns,
  };
}

/**
 * Immutably restores a single column presentation to automatic/inferred defaults:
 * clears typeOverride, clears custom width, clears semantic format, restores visibility to true, and resets
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
      format: undefined,
      conditionalRules: [],
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

/**
 * Renderer definition metadata describing available presentation strategies.
 */
export interface RendererDefinition {
  readonly id: RendererId;
  readonly label: string;
  readonly description?: string;
}

/**
 * Canonical list of registered renderers supported by CSVora.
 */
export const RENDERER_DEFINITIONS: readonly RendererDefinition[] = [
  {
    id: "table",
    label: "Table",
    description: "Standard interactive tabular preview with sorting and column controls",
  },
  {
    id: "departures",
    label: "Departures Board",
    description: "High-contrast airport departures display with split-flap aesthetics",
  },
] as const;

/**
 * Conservative normalization for candidate header aliases:
 * trims, converts to lowercase, and collapses underscores/whitespace into a single space.
 */
export function normalizeHeaderAlias(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, " ");
}

/**
 * Explicit candidate aliases recognized for automatic departures board mapping.
 */
const DEPARTURES_ALIASES = {
  time: new Set(["time", "departure", "departure time"]),
  flight: new Set(["flight", "flight number", "flight no"]),
  destination: new Set(["destination", "city"]),
  gate: new Set(["gate", "gate number"]),
  status: new Set(["status", "delay", "delay minutes"]),
} as const;

/**
 * Pure function performing conservative auto-mapping of CSV columns to departures board roles.
 *
 * Rules:
 * - Checks normalized headers against explicit alias lists.
 * - If exactly one column matches an alias, maps that role to the column's stable ID.
 * - If zero or multiple columns match (ambiguity), leaves the role unresolved (undefined).
 * - Never guesses aggressively; never mutates column definitions.
 */
export function inferDeparturesMapping(columns: readonly ColumnPresentation[]): DeparturesConfig {
  const findSingleMatch = (aliases: Set<string>): string | undefined => {
    const matched = columns.filter((col) => aliases.has(normalizeHeaderAlias(col.header)));
    return matched.length === 1 ? matched[0]?.id : undefined;
  };

  return {
    timeColumnId: findSingleMatch(DEPARTURES_ALIASES.time),
    flightColumnId: findSingleMatch(DEPARTURES_ALIASES.flight),
    destinationColumnId: findSingleMatch(DEPARTURES_ALIASES.destination),
    gateColumnId: findSingleMatch(DEPARTURES_ALIASES.gate),
    statusColumnId: findSingleMatch(DEPARTURES_ALIASES.status),
  };
}

/**
 * Validates whether all required departures board roles (Time, Flight, Destination, Gate)
 * are mapped to columns that exist in the active presentation model.
 */
export function isDeparturesConfigured(
  config: DeparturesConfig | undefined,
  columns: readonly ColumnPresentation[],
): boolean {
  if (!config) return false;
  const colIds = new Set(columns.map((c) => c.id));
  const hasTime = !!config.timeColumnId && colIds.has(config.timeColumnId);
  const hasFlight = !!config.flightColumnId && colIds.has(config.flightColumnId);
  const hasDestination = !!config.destinationColumnId && colIds.has(config.destinationColumnId);
  const hasGate = !!config.gateColumnId && colIds.has(config.gateColumnId);

  return hasTime && hasFlight && hasDestination && hasGate;
}

/**
 * Immutably switches the active visual renderer.
 *
 * Rules:
 * - Switching is immediate.
 * - When switching to "departures", auto-infers column mappings if departures is not yet configured.
 * - Retains existing column presentation (order, width, visibility, type overrides).
 * - Preserves any previously configured departures mappings when switching between renderers.
 */
export function setRenderer(
  presentation: PresentationConfig,
  rendererId: RendererId,
): PresentationConfig {
  if (presentation.rendererId === rendererId) {
    return presentation;
  }

  let nextRendererConfigs = presentation.rendererConfigs;
  if (rendererId === "departures" && !presentation.rendererConfigs.departures) {
    nextRendererConfigs = {
      ...presentation.rendererConfigs,
      departures: inferDeparturesMapping(presentation.columns),
    };
  }

  return {
    ...presentation,
    rendererId,
    rendererConfigs: nextRendererConfigs,
  };
}

/**
 * Immutably updates departures board field mappings in presentation state.
 */
export function setDeparturesMapping(
  presentation: PresentationConfig,
  mapping: DeparturesConfig,
): PresentationConfig {
  return {
    ...presentation,
    rendererConfigs: {
      ...presentation.rendererConfigs,
      departures: mapping,
    },
  };
}

/**
 * Immutably resets departures board mappings to automatic conservative inference,
 * without altering column widths, visibility, order, or type overrides.
 */
export function resetDeparturesMapping(presentation: PresentationConfig): PresentationConfig {
  return {
    ...presentation,
    rendererConfigs: {
      ...presentation.rendererConfigs,
      departures: inferDeparturesMapping(presentation.columns),
    },
  };
}

export type { SemanticIntent };

/**
 * Result of resolving raw cell content to departures status presentation.
 */
export interface DepartureStatusResult {
  readonly text: string;
  readonly intent: SemanticIntent;
  readonly isDimmedRow: boolean;
}

/**
 * Pure domain function resolving raw status/delay cell values to semantic status text and intent.
 *
 * Rules:
 * - Empty or undefined: "CANCELLED", danger intent, dims entire row.
 * - Numeric delay column:
 *   - 0: "ON TIME", success intent
 *   - positive (e.g. 25, 10): "DELAYED +X", warning intent
 *   - negative (e.g. -5): "EARLY", info intent
 * - Text status column:
 *   - "ON TIME", "ON-TIME", "ONTIME": "ON TIME", success intent
 *   - "BOARDING": "BOARDING", success intent
 *   - "CANCELLED", "CANCELED": "CANCELLED", danger intent, dims entire row
 *   - "EARLY": "EARLY", info intent
 *   - Starts with "DELAY": uppercase text, warning intent
 *   - Other non-empty text: uppercase text, muted intent
 */
export function resolveDepartureStatus(rawValue: string | undefined): DepartureStatusResult {
  if (rawValue === undefined || rawValue.trim() === "") {
    return {
      text: "CANCELLED",
      intent: "danger",
      isDimmedRow: true,
    };
  }

  const trimmed = rawValue.trim();

  // Check if value is a signed integer
  const numericMatch = /^[+-]?\d+$/.test(trimmed);
  if (numericMatch) {
    const num = parseInt(trimmed, 10);
    if (num === 0) {
      return {
        text: "ON TIME",
        intent: "success",
        isDimmedRow: false,
      };
    }
    if (num > 0) {
      return {
        text: `DELAYED +${num}`,
        intent: "warning",
        isDimmedRow: false,
      };
    }
    return {
      text: "EARLY",
      intent: "info",
      isDimmedRow: false,
    };
  }

  // Text status matching
  const upper = trimmed.toUpperCase();
  if (upper === "ON TIME" || upper === "ON-TIME" || upper === "ONTIME") {
    return {
      text: "ON TIME",
      intent: "success",
      isDimmedRow: false,
    };
  }
  if (upper === "BOARDING") {
    return {
      text: "BOARDING",
      intent: "success",
      isDimmedRow: false,
    };
  }
  if (upper === "CANCELLED" || upper === "CANCELED") {
    return {
      text: "CANCELLED",
      intent: "danger",
      isDimmedRow: true,
    };
  }
  if (upper === "EARLY") {
    return {
      text: "EARLY",
      intent: "info",
      isDimmedRow: false,
    };
  }
  if (upper.startsWith("DELAYED") || upper.startsWith("DELAY")) {
    return {
      text: upper,
      intent: "warning",
      isDimmedRow: false,
    };
  }

  return {
    text: upper,
    intent: "muted",
    isDimmedRow: false,
  };
}
