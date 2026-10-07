"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@csvora/ui";
import {
  getColumnDisplayLabel,
  resetColumnPresentation,
  setColumnAlignment,
  setColumnTypeOverride,
} from "@csvora/table-engine";
import type { TableRendererProps } from "../types";
import { ColumnInspector } from "./column-inspector";

/**
 * Default Table Renderer for CSVora.
 *
 * Capabilities:
 * - Fully semantic, accessible table markup (<table role="table">, <thead>, <tbody>, <th scope="col">).
 * - High-performance row virtualization powered by @tanstack/react-virtual: renders smoothly across
 *   thousands of rows without DOM thrashing or UI freezing.
 * - Horizontal overflow container with keyboard focusability and sticky headers.
 * - Preserves source row ordering using domain-backed CsvRow index keys.
 * - Handles duplicate and empty headers cleanly with unique position-based column keys and fallback labels.
 * - Handles uneven rows safely: missing fields render empty cells; extra fields are flagged with
 *   a subtle visual indicator while remaining preserved in the underlying CsvDocument.
 * - Supports Unicode characters (CJK, emojis, accented characters).
 * - Column inspection and type controls: inspect column properties, change alignment, and apply type overrides.
 * - Aligns columns based on presentation configuration (left, center, or right).
 */
export function DefaultTableRenderer({
  document,
  presentation,
  onUpdatePresentation,
}: TableRendererProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const visibleColumns = presentation.columns.filter((c) => c.visible);
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
      className="relative w-full max-h-[calc(100vh-14rem)] min-h-[360px] overflow-auto rounded-xl border border-border bg-card shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <table className="w-full caption-bottom text-sm border-collapse">
        <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-xs border-b border-border shadow-2xs">
          <tr>
            {/* Row Number Header */}
            <th
              scope="col"
              className="sticky left-0 z-30 w-16 min-w-[4rem] max-w-[4rem] px-2.5 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted select-none border-r border-border/70"
            >
              #
            </th>

            {/* Column Headers */}
            {visibleColumns.map((col) => {
              const displayLabel = getColumnDisplayLabel(col);
              const isEmptyHeader = col.header.trim().length === 0;

              return (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    "px-3 py-2 text-xs font-semibold tracking-tight text-foreground whitespace-nowrap border-r border-border/40 last:border-r-0",
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
                    <span
                      className={cn(
                        "truncate",
                        isEmptyHeader && "italic text-muted-foreground/80 font-normal",
                      )}
                    >
                      {displayLabel}
                    </span>

                    {onUpdatePresentation && (
                      <ColumnInspector
                        column={col}
                        document={document}
                        onUpdateType={(typeOverride) =>
                          onUpdatePresentation(
                            setColumnTypeOverride(presentation, col.id, typeOverride),
                          )
                        }
                        onUpdateAlign={(align) =>
                          onUpdatePresentation(setColumnAlignment(presentation, col.id, align))
                        }
                        onResetColumn={() =>
                          onUpdatePresentation(resetColumnPresentation(presentation, col.id))
                        }
                      />
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
                        "sticky left-0 z-10 w-16 min-w-[4rem] max-w-[4rem] px-2 py-1.5 text-center font-mono text-xs text-muted-foreground select-none bg-card border-r border-border/70",
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
                      const isEmpty = rawValue === undefined || rawValue === "";

                      return (
                        <td
                          key={col.id}
                          className={cn(
                            "px-3.5 py-1.5 text-xs text-foreground whitespace-nowrap max-w-sm truncate border-r border-border/30 last:border-r-0",
                            col.align === "right"
                              ? "text-right font-mono"
                              : col.align === "center"
                                ? "text-center"
                                : "text-left",
                          )}
                          title={rawValue ?? ""}
                        >
                          {isEmpty ? (
                            <span
                              className="text-muted-foreground/30 font-mono text-[11px] select-none"
                              aria-hidden="true"
                            >
                              —
                            </span>
                          ) : (
                            rawValue
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
