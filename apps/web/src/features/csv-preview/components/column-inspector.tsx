"use client";

import { useState } from "react";
import type { CsvDocument } from "@csvora/csv-core";
import {
  type ColumnAlign,
  type ColumnPresentation,
  type ColumnType,
  getColumnDisplayLabel,
  getColumnProfile,
  getDefaultAlignmentForType,
  getEffectiveColumnType,
} from "@csvora/table-engine";
import {
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  cn,
} from "@csvora/ui";

export interface ColumnInspectorProps {
  readonly column: ColumnPresentation;
  readonly document: CsvDocument;
  readonly onUpdateType: (typeOverride: ColumnType | undefined) => void;
  readonly onUpdateAlign: (align: ColumnAlign) => void;
  readonly onResetColumn: () => void;
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
 * ColumnInspector provides a compact, accessible popover interface for inspecting
 * a column's metadata, viewing detected vs effective type, and modifying presentation
 * overrides (type override and horizontal alignment) or restoring defaults.
 */
export function ColumnInspector({
  column,
  document,
  onUpdateType,
  onUpdateAlign,
  onResetColumn,
}: ColumnInspectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const displayLabel = getColumnDisplayLabel(column);
  const isRawHeaderEmpty = column.header.trim().length === 0;
  const effectiveType = getEffectiveColumnType(column);
  const isTypeOverridden = column.typeOverride !== undefined;
  const defaultAlign = getDefaultAlignmentForType(column.inferredType);
  const isAlignModified = column.align !== defaultAlign;
  const isModified = isTypeOverridden || isAlignModified;

  // Lightweight content profile
  const profile = getColumnProfile(document, column.sourceIndex);

  const handleTypeSelect = (value: string) => {
    if (value === "auto") {
      onUpdateType(undefined);
    } else if (
      value === "string" ||
      value === "number" ||
      value === "boolean" ||
      value === "date"
    ) {
      onUpdateType(value);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Inspect column ${displayLabel}`}
          aria-expanded={isOpen}
          title={`Inspect column ${displayLabel}`}
          className={cn(
            "relative inline-flex items-center justify-center size-6 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer transition-colors shrink-0",
            isOpen && "bg-muted text-foreground",
            isModified && "text-primary font-bold",
          )}
        >
          {/* Sliders / Inspector icon */}
          <svg
            className="size-3.5"
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

          {isModified && (
            <span
              className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary"
              aria-label="Column has presentation overrides"
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-80 p-4 space-y-4 text-xs shadow-lg border border-border bg-popover text-popover-foreground rounded-xl"
      >
        {/* Header: Title and Identifiers */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-sm text-foreground truncate" title={displayLabel}>
              {displayLabel}
            </h2>
            <span className="font-mono text-[11px] text-muted-foreground shrink-0">
              {column.id}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Index: {column.sourceIndex}</span>
            <span>•</span>
            {isRawHeaderEmpty ? (
              <span className="italic text-amber-600 dark:text-amber-400">
                Empty source header (fallback label)
              </span>
            ) : (
              <span className="truncate">Raw header: &quot;{column.header}&quot;</span>
            )}
          </div>
        </div>

        <Separator />

        {/* Content Profile & Detected Type */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/40">
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1">
              Detected Type
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant={getTypeBadgeVariant(column.inferredType)} className="capitalize">
                {column.inferredType}
              </Badge>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1">
              Data Profile
            </div>
            <div className="text-[11px] font-mono text-foreground space-y-0.5">
              <div>
                Non-empty: <span className="font-semibold">{profile.nonEmptyCount}</span>
              </div>
              <div>
                Empty: <span className="text-muted-foreground">{profile.emptyCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Type Control */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`type-select-${column.id}`}
              className="text-xs font-medium text-foreground"
            >
              Display as
            </label>
            {isTypeOverridden ? (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
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
              className="h-8 text-xs cursor-pointer"
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
            <label className="text-xs font-medium text-foreground">Alignment</label>
            <span className="text-[10px] text-muted-foreground capitalize">
              {column.align}
              {column.align === defaultAlign && " (default)"}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label={`Alignment for column ${displayLabel}`}
            className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg border border-border/40"
          >
            {(["left", "center", "right"] as const).map((alignOption) => {
              const isSelected = column.align === alignOption;
              return (
                <button
                  key={alignOption}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onUpdateAlign(alignOption)}
                  className={cn(
                    "px-2 py-1 rounded-md text-xs font-medium capitalize transition-all cursor-pointer text-center",
                    isSelected
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40",
                  )}
                >
                  {alignOption}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Footer: Reset and Effective State */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-muted-foreground font-mono">
            Effective:{" "}
            <span className="font-semibold text-foreground uppercase">{effectiveType}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetColumn}
            disabled={!isModified}
            className="h-7 text-xs px-2.5 cursor-pointer disabled:cursor-not-allowed"
          >
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
