"use client";

import { useState } from "react";
import {
  type TablePresentationConfig,
  canHideColumn,
  getColumnDisplayLabel,
  getVisibleColumns,
  moveColumn,
  resetLayout,
  setColumnVisibility,
} from "@csvora/table-engine";
import { Button, Popover, PopoverContent, PopoverTrigger, Separator, cn } from "@csvora/ui";

export interface ColumnManagerProps {
  readonly presentation: TablePresentationConfig;
  readonly onUpdatePresentation: (presentation: TablePresentationConfig) => void;
}

/**
 * ColumnManager provides a compact, keyboard-accessible popover interface for
 * managing the presentation table layout:
 * - Hiding and showing columns independently
 * - Reordering columns (moving up/earlier and down/later in visual presentation)
 * - Resetting column layout back to source order and default visibility
 */
export function ColumnManager({ presentation, onUpdatePresentation }: ColumnManagerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const visibleColumns = getVisibleColumns(presentation);
  const totalColumns = presentation.columns.length;

  const handleToggleVisibility = (columnId: string, currentVisible: boolean) => {
    onUpdatePresentation(setColumnVisibility(presentation, columnId, !currentVisible));
  };

  const handleMove = (columnId: string, direction: "up" | "down") => {
    onUpdatePresentation(moveColumn(presentation, columnId, direction));
  };

  const handleResetLayout = () => {
    onUpdatePresentation(resetLayout(presentation));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Manage columns"
          aria-expanded={isOpen}
          className="cursor-pointer gap-1.5 text-xs h-8"
        >
          {/* Columns icon */}
          <svg
            className="size-3.5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
          <span>Columns</span>
          <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {visibleColumns.length}/{totalColumns}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-80 p-3 space-y-3 text-xs shadow-lg border border-border bg-popover text-popover-foreground rounded-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground text-sm">Columns</h2>
            <p className="text-[11px] text-muted-foreground">
              {visibleColumns.length} of {totalColumns} visible
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">Presentation order</span>
        </div>

        <Separator />

        {/* Column List */}
        <div
          role="region"
          aria-label="Configurable columns list"
          className="max-h-64 overflow-y-auto space-y-1 pr-0.5"
        >
          {presentation.columns.map((col, idx) => {
            const displayLabel = getColumnDisplayLabel(col);
            const isFirst = idx === 0;
            const isLast = idx === presentation.columns.length - 1;
            const canHide = canHideColumn(presentation, col.id);
            const cannotHideReason =
              col.visible && !canHide ? "At least one column must remain visible" : undefined;

            return (
              <div
                key={col.id}
                className={cn(
                  "flex items-center justify-between gap-2 p-1.5 rounded-lg border transition-colors",
                  col.visible
                    ? "bg-card border-border/50 text-foreground"
                    : "bg-muted/40 border-dashed border-border/40 text-muted-foreground",
                )}
              >
                {/* Reorder Buttons (Move Up / Down) */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMove(col.id, "up")}
                    disabled={isFirst}
                    aria-label={`Move ${displayLabel} up`}
                    title={`Move ${displayLabel} up (earlier)`}
                    className="size-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                  >
                    <svg
                      className="size-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 15.75l7.5-7.5 7.5 7.5"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(col.id, "down")}
                    disabled={isLast}
                    aria-label={`Move ${displayLabel} down`}
                    title={`Move ${displayLabel} down (later)`}
                    className="size-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                  >
                    <svg
                      className="size-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </button>
                </div>

                {/* Column Label & ID */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-xs truncate" title={displayLabel}>
                      {displayLabel}
                    </span>
                    {col.header.trim().length === 0 && (
                      <span className="text-[10px] text-muted-foreground italic shrink-0">
                        (fallback)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                    <span>{col.id}</span>
                    <span>•</span>
                    <span>src:{col.sourceIndex}</span>
                    {col.width !== undefined && (
                      <>
                        <span>•</span>
                        <span>{col.width}px</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Visibility Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(col.id, col.visible)}
                  disabled={col.visible && !canHide}
                  aria-label={col.visible ? `Hide ${displayLabel}` : `Show ${displayLabel}`}
                  aria-pressed={col.visible}
                  title={
                    cannotHideReason ??
                    (col.visible ? `Hide ${displayLabel}` : `Show ${displayLabel}`)
                  }
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 cursor-pointer",
                    col.visible
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                    col.visible && !canHide && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {col.visible ? (
                    <>
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
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>Show</span>
                    </>
                  ) : (
                    <>
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
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                      <span>Hide</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Footer: Reset layout */}
        <div className="flex items-center justify-between pt-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetLayout}
            aria-label="Reset column order, visibility, and widths to default"
            className="w-full text-xs h-7 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Reset layout
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
