"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@csvora/ui";
import {
  MIN_COLUMN_WIDTH,
  formatPresentationValue,
  getColumnDisplayLabel,
  getVisibleColumns,
  resolveConditionalIntent,
  type SemanticIntent,
} from "@csvora/table-engine";
import type { TableRendererProps } from "../types";

/**
 * Maps semantic visual intent to restrained, accessible styles for tabular display.
 * Avoids aggressive saturation or dashboard colors, maintaining CSVora's quiet editorial aesthetic.
 */
function getTableIntentClasses(intent: SemanticIntent | undefined): {
  readonly cellClass?: string;
  readonly textClass?: string;
} {
  switch (intent) {
    case "success":
      return {
        cellClass: "bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12]",
        textClass: "text-emerald-950 dark:text-emerald-300 font-medium",
      };
    case "warning":
      return {
        cellClass: "bg-amber-500/[0.08] dark:bg-amber-500/[0.12]",
        textClass: "text-amber-950 dark:text-amber-300 font-medium",
      };
    case "danger":
      return {
        cellClass: "bg-rose-500/[0.08] dark:bg-rose-500/[0.12]",
        textClass: "text-rose-950 dark:text-rose-300 font-medium",
      };
    case "info":
      return {
        cellClass: "bg-sky-500/[0.08] dark:bg-sky-500/[0.12]",
        textClass: "text-sky-950 dark:text-sky-300 font-medium",
      };
    case "muted":
      return {
        cellClass: "bg-muted/30",
        textClass: "text-muted-foreground/60 italic",
      };
    default:
      return {};
  }
}

/**
 * Default Table Renderer for CSVora Visual Editor Workspace.
 *
 * Capabilities:
 * - Fully semantic, accessible table markup (<table role="table">, <thead>, <tbody>, <th scope="col">).
 * - High-performance row virtualization powered by @tanstack/react-virtual: renders smoothly across
 *   thousands of rows without DOM thrashing or UI freezing.
 * - Horizontal overflow container with keyboard focusability and sticky headers.
 * - Column selection: clicking any column header selects the column, driving the persistent sidebar inspector.
 * - Restrained selection feedback: subtle accent indicator on header and gentle cell tint without flooding data.
 * - Preserves source row ordering using domain-backed CsvRow index keys.
 * - Handles duplicate and empty headers cleanly with unique position-based column keys and fallback labels.
 * - Handles uneven rows safely: missing fields render empty cells; extra fields are flagged with
 *   a subtle visual indicator while remaining preserved in the underlying CsvDocument.
 * - Supports Unicode characters (CJK, emojis, accented characters).
 * - Aligns columns based on presentation configuration (left, center, or right with tabular figures for numbers).
 */
export function DefaultTableRenderer({
  document,
  presentation,
  selectedColumnId,
  onSelectColumn,
}: TableRendererProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const visibleColumns = getVisibleColumns(presentation);
  const totalColumns = visibleColumns.length + 1; // +1 for the row index (#) column

  const rowVirtualizer = useVirtualizer({
    count: document.rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 25,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0) : 0;

  return (
    <div
      ref={parentRef}
      tabIndex={0}
      role="region"
      aria-label="CSV data table"
      className="relative w-full max-h-[calc(100vh-12rem)] min-h-[360px] overflow-auto rounded-xl border border-border/80 bg-card shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <table className="w-full caption-bottom text-sm border-collapse min-w-full">
        <colgroup>
          {/* Row Number Column */}
          <col style={{ width: "3.75rem", minWidth: "3.75rem", maxWidth: "3.75rem" }} />
          {/* Data Columns */}
          {visibleColumns.map((col) => (
            <col
              key={col.id}
              style={
                col.width !== undefined
                  ? {
                      width: `${col.width}px`,
                      minWidth: `${col.width}px`,
                      maxWidth: `${col.width}px`,
                    }
                  : { minWidth: `${MIN_COLUMN_WIDTH}px` }
              }
            />
          ))}
        </colgroup>

        <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-xs border-b border-border/70 shadow-2xs">
          <tr>
            {/* Row Number Header */}
            <th
              scope="col"
              className="sticky left-0 z-30 w-15 min-w-[3.75rem] max-w-[3.75rem] px-2.5 py-2.5 text-center text-[11px] font-mono font-medium uppercase tracking-wider text-muted-foreground bg-muted select-none border-r border-border/70"
            >
              #
            </th>

            {/* Column Headers */}
            {visibleColumns.map((col) => {
              const displayLabel = getColumnDisplayLabel(col);
              const isEmptyHeader = col.header.trim().length === 0;
              const isSelected = selectedColumnId === col.id;

              return (
                <th
                  key={col.id}
                  scope="col"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => onSelectColumn?.(col.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectColumn?.(col.id);
                    }
                  }}
                  style={
                    col.width !== undefined
                      ? {
                          width: `${col.width}px`,
                          minWidth: `${col.width}px`,
                          maxWidth: `${col.width}px`,
                        }
                      : { minWidth: `${MIN_COLUMN_WIDTH}px` }
                  }
                  className={cn(
                    "px-3.5 py-2 text-xs font-semibold tracking-tight whitespace-nowrap border-r border-border/40 last:border-r-0 transition-colors select-none cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    isSelected
                      ? "bg-amber-50/90 dark:bg-amber-950/30 border-b-2 border-b-accent text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left",
                  )}
                  title={col.header || `Empty header (display label: ${displayLabel})`}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1.5",
                      col.align === "right"
                        ? "justify-end"
                        : col.align === "center"
                          ? "justify-center"
                          : "justify-start",
                    )}
                  >
                    {/* Selected accent indicator */}
                    {isSelected && (
                      <span
                        className="size-1.5 rounded-full bg-accent shrink-0"
                        aria-hidden="true"
                      />
                    )}

                    <span
                      className={cn(
                        "truncate",
                        isEmptyHeader && "italic text-muted-foreground/80 font-normal",
                      )}
                    >
                      {displayLabel}
                    </span>

                    {/* Compact inspect button to trigger selection and inspector */}
                    {onSelectColumn && (
                      <button
                        type="button"
                        aria-label={`Inspect column ${displayLabel}`}
                        title={`Inspect column ${displayLabel}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectColumn(col.id);
                        }}
                        className={cn(
                          "inline-flex items-center justify-center size-5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer transition-colors shrink-0 ml-0.5",
                          isSelected && "text-foreground font-bold bg-accent/20",
                        )}
                      >
                        <svg
                          className="size-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-border/40">
          {document.rows.length === 0 ? (
            <tr>
              <td
                colSpan={totalColumns}
                className="py-16 text-center text-sm text-muted-foreground"
              >
                No data rows in this CSV document.
              </td>
            </tr>
          ) : (
            <>
              {paddingTop > 0 && (
                <tr aria-hidden="true" className="border-0">
                  <td
                    colSpan={totalColumns}
                    style={{ height: `${paddingTop}px` }}
                    className="p-0 border-0"
                  />
                </tr>
              )}

              {virtualRows.map((virtualItem) => {
                const row = document.rows[virtualItem.index];
                if (!row) return null;

                const hasFieldMismatch = row.fields.length !== document.columnCount;
                const hasExtraFields = row.fields.length > document.columnCount;

                return (
                  <tr
                    key={`row-${row.index}`}
                    data-index={virtualItem.index}
                    className={cn(
                      "h-9 transition-colors hover:bg-muted/40",
                      hasFieldMismatch && "bg-amber-500/5 hover:bg-amber-500/10",
                    )}
                  >
                    {/* Row Index Cell */}
                    <td
                      className={cn(
                        "sticky left-0 z-10 w-15 min-w-[3.75rem] max-w-[3.75rem] px-2 py-1.5 text-center font-mono text-[11px] text-muted-foreground select-none bg-card border-r border-border/70",
                        hasFieldMismatch && "bg-amber-500/5",
                      )}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{row.index + 1}</span>
                        {hasFieldMismatch && (
                          <span
                            className="inline-flex items-center text-amber-600 dark:text-amber-400 text-[11px] font-sans font-bold cursor-help"
                            title={
                              hasExtraFields
                                ? `Row contains ${row.fields.length} fields (${row.fields.length - document.columnCount} extra). Raw fields preserved in document.`
                                : `Row contains ${row.fields.length} fields (${document.columnCount - row.fields.length} missing). Rendered as empty cells.`
                            }
                            aria-label={
                              hasExtraFields
                                ? "Row has extra fields preserved in document"
                                : "Row has missing fields"
                            }
                          >
                            ⚠
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Data Cells */}
                    {visibleColumns.map((col) => {
                      const rawValue = row.fields[col.sourceIndex];
                      const formattedValue = formatPresentationValue(rawValue, col);
                      const intent = resolveConditionalIntent({ rawValue, column: col });
                      const intentStyles = getTableIntentClasses(intent);
                      const isEmpty = rawValue === undefined || rawValue === "";
                      const isSelected = selectedColumnId === col.id;

                      return (
                        <td
                          key={col.id}
                          data-intent={intent ?? undefined}
                          style={
                            col.width !== undefined
                              ? {
                                  width: `${col.width}px`,
                                  minWidth: `${col.width}px`,
                                  maxWidth: `${col.width}px`,
                                }
                              : { minWidth: "120px" }
                          }
                          className={cn(
                            "px-3.5 py-1.5 text-xs text-foreground whitespace-nowrap truncate border-r border-border/30 last:border-r-0 transition-colors",
                            isSelected && "bg-amber-400/[0.04]",
                            intentStyles.cellClass,
                            intentStyles.textClass,
                            col.align === "right"
                              ? "text-right font-mono"
                              : col.align === "center"
                                ? "text-center"
                                : "text-left",
                          )}
                          title={
                            intent
                              ? `${formattedValue || rawValue || ""} (${intent})`
                              : formattedValue || rawValue || ""
                          }
                        >
                          {isEmpty ? (
                            <span
                              className="text-muted-foreground/35 font-mono text-[11px] select-none"
                              aria-hidden="true"
                            >
                              —
                            </span>
                          ) : (
                            formattedValue
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {paddingBottom > 0 && (
                <tr aria-hidden="true" className="border-0">
                  <td
                    colSpan={totalColumns}
                    style={{ height: `${paddingBottom}px` }}
                    className="p-0 border-0"
                  />
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
