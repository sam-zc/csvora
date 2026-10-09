"use client";

import { useState } from "react";
import type { CsvDocument } from "@csvora/csv-core";
import { exportFormattedCsv, exportJson, exportMarkdown, exportRawCsv } from "@csvora/export";
import type { PresentationConfig } from "@csvora/schemas";
import { Badge, Button, Popover, PopoverContent, PopoverTrigger, Separator, cn } from "@csvora/ui";
import { triggerBrowserDownload } from "../download";

export interface ExportMenuProps {
  readonly document: CsvDocument;
  readonly presentation: PresentationConfig;
  readonly sourceFilename?: string | undefined;
}

interface ExportItemOption {
  readonly id: string;
  readonly label: string;
  readonly badge: string;
  readonly description: string;
  readonly onExport: () => void;
}

/**
 * Restrained top-bar Export control providing access to raw and presented data export formats:
 * - Raw CSV (original values, source column order)
 * - JSON (lossless column and row structure)
 * - Formatted CSV (visible columns, semantic presentation formatting)
 * - Markdown Table (visible columns, formatting and alignment)
 */
export function ExportMenu({ document, presentation, sourceFilename }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAction = (exportFn: () => void) => {
    try {
      setErrorMessage(null);
      exportFn();
      setIsOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate export";
      setErrorMessage(message);
    }
  };

  const rawOptions: ExportItemOption[] = [
    {
      id: "export-raw-csv",
      label: "Raw CSV",
      badge: "CSV",
      description: "Original values and source order",
      onExport: () => {
        const result = exportRawCsv(document, {
          filename: sourceFilename,
          formulaPolicy: "escape",
        });
        triggerBrowserDownload(result);
      },
    },
    {
      id: "export-raw-json",
      label: "JSON",
      badge: "JSON",
      description: "Lossless raw data representation",
      onExport: () => {
        const result = exportJson(document, {
          filename: sourceFilename,
        });
        triggerBrowserDownload(result);
      },
    },
  ];

  const presentedOptions: ExportItemOption[] = [
    {
      id: "export-formatted-csv",
      label: "Formatted CSV",
      badge: "CSV",
      description: "Visible columns and presentation formatting",
      onExport: () => {
        const result = exportFormattedCsv(document, presentation, {
          filename: sourceFilename,
          formulaPolicy: "escape",
        });
        triggerBrowserDownload(result);
      },
    },
    {
      id: "export-markdown",
      label: "Markdown Table",
      badge: "MD",
      description: "Visible columns with formatting and alignment",
      onExport: () => {
        const result = exportMarkdown(document, presentation, {
          filename: sourceFilename,
        });
        triggerBrowserDownload(result);
      },
    },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Export document"
          aria-expanded={isOpen}
          className="cursor-pointer gap-1.5 text-xs h-8"
        >
          {/* Export / Download icon */}
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
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          <span>Export</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-72 p-2.5 space-y-3 bg-popover text-popover-foreground border-border/80 shadow-md"
      >
        <div className="flex items-center justify-between px-1">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground font-mono">
            Export Dataset
          </div>
          <span className="text-[10px] text-muted-foreground/70 font-mono">
            {document.rowCount.toLocaleString()} rows
          </span>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center justify-between"
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs ml-2 hover:underline cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Section 1: Raw Data */}
        <div className="space-y-1">
          <div className="px-1 text-[11px] font-semibold text-foreground/80">Raw Data</div>
          <div className="space-y-1">
            {rawOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                id={opt.id}
                onClick={() => handleAction(opt.onExport)}
                className={cn(
                  "w-full text-left p-2 rounded-md hover:bg-muted/80 transition-colors cursor-pointer group flex items-start justify-between gap-2",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                )}
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground group-hover:text-foreground">
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {opt.description}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 uppercase font-mono font-normal shrink-0 mt-0.5"
                >
                  {opt.badge}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Section 2: Presented Data */}
        <div className="space-y-1">
          <div className="px-1 text-[11px] font-semibold text-foreground/80">Presented Data</div>
          <div className="space-y-1">
            {presentedOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                id={opt.id}
                onClick={() => handleAction(opt.onExport)}
                className={cn(
                  "w-full text-left p-2 rounded-md hover:bg-muted/80 transition-colors cursor-pointer group flex items-start justify-between gap-2",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                )}
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground group-hover:text-foreground">
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {opt.description}
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1 py-0 uppercase font-mono font-normal shrink-0 mt-0.5"
                >
                  {opt.badge}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
