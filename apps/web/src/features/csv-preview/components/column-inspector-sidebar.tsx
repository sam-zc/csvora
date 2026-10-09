"use client";

import type { CsvDocument } from "@csvora/csv-core";
import {
  type ColumnAlign,
  type ColumnPresentation,
  type ColumnType,
  type TablePresentationConfig,
  MIN_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
  canHideColumn,
  getColumnDisplayLabel,
  getColumnProfile,
  getDefaultAlignmentForType,
  getEffectiveColumnType,
  getVisibleColumns,
} from "@csvora/table-engine";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  cn,
} from "@csvora/ui";

export interface ColumnInspectorSidebarProps {
  readonly column: ColumnPresentation | null;
  readonly document: CsvDocument;
  readonly presentation: TablePresentationConfig;
  readonly onSelectColumn: (columnId: string | null) => void;
  readonly onUpdateType: (columnId: string, typeOverride: ColumnType | undefined) => void;
  readonly onUpdateAlign: (columnId: string, align: ColumnAlign) => void;
  readonly onUpdateVisibility: (columnId: string, visible: boolean) => void;
  readonly onUpdateWidth: (columnId: string, width: number | undefined) => void;
  readonly onResetColumn: (columnId: string) => void;
  readonly isOpen?: boolean | undefined;
  readonly onClose?: (() => void) | undefined;
}

function getTypeBadgeVariant(type: ColumnType): "default" | "secondary" | "outline" {
  switch (type) {
    case "number":
      return "default";
    case "boolean":
      return "secondary";
    default:
      return "outline";
  }
}

/**
 * Persistent sidebar inspector for the Visual Editor Workspace.
 *
 * When a column is selected in the editor, this panel displays its metadata,
 * detected and effective type, alignment, custom width, and visibility controls.
 * When no column is selected, it presents an intentional, editorial overview
 * guiding the user to interact with the design canvas.
 */
export function ColumnInspectorSidebar({
  column,
  document,
  presentation,
  onSelectColumn,
  onUpdateType,
  onUpdateAlign,
  onUpdateVisibility,
  onUpdateWidth,
  onResetColumn,
  isOpen = true,
  onClose,
}: ColumnInspectorSidebarProps) {
  if (!isOpen) {
    return null;
  }

  // --- Empty Selection State ---
  if (!column) {
    const visibleCount = getVisibleColumns(presentation).length;
    const totalCount = presentation.columns.length;

    return (
      <aside
        aria-label="Column Inspector"
        className="w-72 lg:w-80 shrink-0 border-r border-border/80 bg-surface flex flex-col h-full overflow-y-auto"
      >
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground font-mono">
            Inspector
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inspector"
              className="lg:hidden text-xs text-muted-foreground hover:text-foreground p-1 rounded"
            >
              ✕
            </button>
          )}
        </div>

        <div className="p-6 flex flex-col items-center text-center space-y-4 my-auto">
          <div className="size-12 rounded-xl bg-muted/60 border border-border/70 flex items-center justify-center text-muted-foreground">
            {/* Table column selector icon */}
            <svg
              className="size-6 text-muted-foreground/80"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Select a column
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[230px]">
              Click any column header in the table to inspect properties, adjust type overrides,
              change alignment, or customize width.
            </p>
          </div>

          <div className="w-full pt-4 border-t border-border/50 text-left space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground font-mono">
              Dataset Overview
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                <div className="text-muted-foreground text-[10px]">Columns</div>
                <div className="font-mono font-semibold text-foreground mt-0.5">
                  {visibleCount} of {totalCount}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40">
                <div className="text-muted-foreground text-[10px]">Total Rows</div>
                <div className="font-mono font-semibold text-foreground mt-0.5">
                  {document.rowCount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/70 font-mono">
            Press{" "}
            <kbd className="px-1 py-0.5 rounded bg-muted text-foreground text-[10px]">Esc</kbd> to
            clear selection
          </p>
        </div>
      </aside>
    );
  }

  // --- Active Column Selected State ---
  const displayLabel = getColumnDisplayLabel(column);
  const isRawHeaderEmpty = column.header.trim().length === 0;
  const effectiveType = getEffectiveColumnType(column);
  const isTypeOverridden = column.typeOverride !== undefined;
  const defaultAlign = getDefaultAlignmentForType(column.inferredType);
  const isAlignModified = column.align !== defaultAlign;
  const isWidthModified = column.width !== undefined;
  const isVisibilityModified = !column.visible;
  const isModified = isTypeOverridden || isAlignModified || isWidthModified || isVisibilityModified;
  const canHide = canHideColumn(presentation, column.id);

  const profile = getColumnProfile(document, column.sourceIndex);

  const handleTypeSelect = (value: string) => {
    if (value === "auto") {
      onUpdateType(column.id, undefined);
    } else if (
      value === "string" ||
      value === "number" ||
      value === "boolean" ||
      value === "date"
    ) {
      onUpdateType(column.id, value);
    }
  };

  return (
    <aside
      aria-label="Column Inspector"
      className="w-72 lg:w-80 shrink-0 border-r border-border/80 bg-surface flex flex-col h-full overflow-hidden"
    >
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-border/70 flex items-center justify-between bg-surface-muted/30 shrink-0">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground font-mono">
            <span>Column Inspector</span>
            {isModified && (
              <span className="size-1.5 rounded-full bg-accent" aria-label="Modified" />
            )}
          </div>
          <h2
            className="text-sm font-semibold text-foreground tracking-tight truncate mt-0.5"
            title={displayLabel}
          >
            {displayLabel}
          </h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelectColumn(null)}
            aria-label="Deselect column"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Deselect
          </Button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inspector"
              className="lg:hidden text-muted-foreground hover:text-foreground p-1 rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Hidden Column Banner */}
      {!column.visible && (
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px]">This column is hidden from the table.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onUpdateVisibility(column.id, true)}
            className="h-6 text-[10px] px-2 bg-background cursor-pointer"
          >
            Show column
          </Button>
        </div>
      )}

      {/* Scrollable Inspector Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Identifiers & Details */}
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span className="bg-muted px-1.5 py-0.5 rounded text-foreground font-medium">
            {column.id}
          </span>
          <span>Index: {column.sourceIndex}</span>
        </div>

        {isRawHeaderEmpty && (
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 italic">
            Source header was empty. Displaying fallback label &quot;{displayLabel}&quot;.
          </div>
        )}

        {/* Content Profile & Inferred Type Card */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground font-mono">
              Detected Type
            </span>
            <Badge variant={getTypeBadgeVariant(column.inferredType)} className="capitalize">
              {column.inferredType}
            </Badge>
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between font-mono text-[11px]">
            <span className="text-muted-foreground">Non-empty:</span>
            <span className="font-semibold text-foreground">{profile.nonEmptyCount}</span>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-muted-foreground">Empty:</span>
            <span className="text-muted-foreground">{profile.emptyCount}</span>
          </div>
        </div>

        <Separator />

        {/* Type Override Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`type-select-${column.id}`}
              className="text-xs font-medium text-foreground"
            >
              Display type
            </label>
            {isTypeOverridden ? (
              <span className="text-[10px] font-semibold text-accent font-mono">
                Override active
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground font-mono">
                Auto ({column.inferredType})
              </span>
            )}
          </div>

          <Select value={column.typeOverride ?? "auto"} onValueChange={handleTypeSelect}>
            <SelectTrigger
              id={`type-select-${column.id}`}
              aria-label={`Display type for column ${displayLabel}`}
              className="h-8 text-xs cursor-pointer bg-background"
            >
              <SelectValue placeholder="Select display type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <span className="font-medium">Auto</span>
                <span className="text-muted-foreground ml-1.5 capitalize">
                  ({column.inferredType})
                </span>
              </SelectItem>
              <SelectItem value="string">String (text)</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="date">Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alignment Control */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Alignment</span>
            <span className="text-[10px] text-muted-foreground capitalize font-mono">
              {column.align}
              {column.align === defaultAlign && " (default)"}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label={`Alignment for column ${displayLabel}`}
            className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-lg border border-border/50"
          >
            {(["left", "center", "right"] as const).map((alignOption) => {
              const isSelected = column.align === alignOption;
              return (
                <button
                  key={alignOption}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onUpdateAlign(column.id, alignOption)}
                  className={cn(
                    "px-2 py-1 rounded-md text-xs font-medium capitalize transition-all cursor-pointer text-center",
                    isSelected
                      ? "bg-background text-foreground shadow-2xs font-semibold border border-border/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40",
                  )}
                >
                  {alignOption}
                </button>
              );
            })}
          </div>
        </div>

        {/* Width Control */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`width-input-${column.id}`}
              className="text-xs font-medium text-foreground"
            >
              Width
            </label>
            <span className="text-[10px] text-muted-foreground font-mono">
              {column.width !== undefined ? `${column.width}px` : "Auto"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Input
              id={`width-input-${column.id}`}
              type="number"
              min={MIN_COLUMN_WIDTH}
              max={MAX_COLUMN_WIDTH}
              placeholder="Auto"
              value={column.width ?? ""}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val === "") {
                  onUpdateWidth(column.id, undefined);
                } else {
                  const num = parseInt(val, 10);
                  if (!Number.isNaN(num)) {
                    onUpdateWidth(column.id, num);
                  }
                }
              }}
              aria-label={`Width in pixels for column ${displayLabel}`}
              className="h-8 text-xs font-mono w-24 bg-background"
            />

            <div className="flex items-center gap-1 flex-1">
              <button
                type="button"
                onClick={() => onUpdateWidth(column.id, undefined)}
                className={cn(
                  "flex-1 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer text-center",
                  column.width === undefined
                    ? "bg-secondary text-secondary-foreground border-border font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground border-border/50",
                )}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => onUpdateWidth(column.id, 120)}
                className={cn(
                  "flex-1 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer text-center",
                  column.width === 120
                    ? "bg-secondary text-secondary-foreground border-border font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground border-border/50",
                )}
              >
                120
              </button>
              <button
                type="button"
                onClick={() => onUpdateWidth(column.id, 200)}
                className={cn(
                  "flex-1 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer text-center",
                  column.width === 200
                    ? "bg-secondary text-secondary-foreground border-border font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground border-border/50",
                )}
              >
                200
              </button>
            </div>
          </div>
        </div>

        {/* Visibility Control */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Visibility</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {column.visible ? "Visible" : "Hidden"}
            </span>
          </div>

          <Button
            type="button"
            variant={column.visible ? "outline" : "secondary"}
            size="sm"
            disabled={column.visible && !canHide}
            title={
              column.visible && !canHide ? "At least one column must remain visible" : undefined
            }
            onClick={() => onUpdateVisibility(column.id, !column.visible)}
            className="w-full text-xs h-8 cursor-pointer"
            aria-label={
              column.visible ? `Hide column ${displayLabel}` : `Show column ${displayLabel}`
            }
          >
            {column.visible ? "Hide column" : "Show column"}
          </Button>
        </div>

        <Separator />

        {/* Effective State & Reset Action */}
        <div className="pt-1 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground font-mono">
            Effective:{" "}
            <span className="font-semibold text-foreground uppercase">{effectiveType}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onResetColumn(column.id)}
            disabled={!isModified}
            className="h-8 text-xs px-3 cursor-pointer disabled:cursor-not-allowed"
          >
            Reset
          </Button>
        </div>
      </div>
    </aside>
  );
}
