"use client";

import { useState } from "react";
import { RENDERER_DEFINITIONS, setRenderer } from "@csvora/table-engine";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@csvora/ui";
import { CsvDiagnostics, formatFileSize } from "../../csv-ingestion";
import { ExportMenu } from "../../export";
import type { PreviewHeaderProps } from "../types";
import { ColumnManager } from "./column-manager";

function getDelimiterLabel(delim: string): string {
  switch (delim) {
    case ",":
      return "Comma";
    case ";":
      return "Semicolon";
    case "\t":
      return "Tab";
    case "|":
      return "Pipe";
    default:
      return `'${delim}'`;
  }
}

/**
 * Top toolbar for the Visual Editor Workspace.
 *
 * Provides a quiet, restrained editor header:
 * - CSVora branding with selective yellow accent dot
 * - Document filename and compact dimension metadata
 * - Renderer indicator ("Renderer: Table")
 * - ColumnManager trigger popover
 * - Presentation reset action
 * - Change file action
 * - Compact diagnostics notification trigger
 */
export function PreviewHeader({
  loadedDocument,
  presentation,
  onUpdatePresentation,
  onReset,
  onResetPresentation,
  hasPresentationChanges = false,
  isSidebarOpen,
  onToggleSidebar,
}: PreviewHeaderProps) {
  const { file, document, diagnostics } = loadedDocument;
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warning").length;
  const hasIssues = diagnostics.length > 0;

  return (
    <header className="relative shrink-0 z-30">
      <div className="h-13 px-4 border-b border-border/80 bg-surface/95 backdrop-blur-xs flex items-center justify-between gap-4">
        {/* Left: Branding & File Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="size-2 rounded-full bg-accent shrink-0" aria-hidden="true" />
            <span className="font-bold text-sm tracking-tight text-foreground font-sans">
              CSVora
            </span>
          </div>

          <div className="h-4 w-px bg-border/80 hidden sm:block shrink-0" aria-hidden="true" />

          <div className="flex items-center gap-2 min-w-0">
            <h1
              className="text-xs font-semibold text-foreground tracking-tight truncate max-w-[150px] sm:max-w-[220px] md:max-w-[300px]"
              title={file.name}
            >
              {file.name}
            </h1>

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/50 shrink-0">
              <span className="text-foreground font-medium">
                {document.rowCount.toLocaleString()}
              </span>
              <span className="text-muted-foreground font-sans">rows</span>
              <span>•</span>
              <span className="text-foreground font-medium">
                {document.columnCount.toLocaleString()}
              </span>
              <span className="text-muted-foreground font-sans">cols</span>
              <span>•</span>
              <span className="text-muted-foreground font-sans">
                {getDelimiterLabel(document.delimiter)}
              </span>
              <span>•</span>
              <span>{formatFileSize(file.size)}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions & Tools */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Renderer Selector */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/60 bg-muted/40 text-xs"
            title="Active visual renderer"
          >
            <label
              htmlFor="renderer-select"
              className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider font-mono shrink-0 select-none"
            >
              Renderer
            </label>
            <Select
              value={presentation.rendererId}
              onValueChange={(val) => {
                if (val === "table" || val === "departures") {
                  onUpdatePresentation?.(setRenderer(presentation, val));
                }
              }}
            >
              <SelectTrigger
                id="renderer-select"
                aria-label="Active visual renderer"
                className="h-7 text-xs font-mono font-semibold bg-background border-border/50 gap-1.5 px-2 cursor-pointer"
              >
                <span className="size-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {RENDERER_DEFINITIONS.map((def) => (
                  <SelectItem key={def.id} value={def.id}>
                    <span className="font-medium font-sans">{def.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Diagnostics Trigger if issues exist */}
          {hasIssues && (
            <button
              type="button"
              onClick={() => setShowDiagnostics((prev) => !prev)}
              aria-expanded={showDiagnostics}
              className="inline-flex items-center text-xs font-medium cursor-pointer transition-opacity hover:opacity-80"
            >
              {errorCount > 0 ? (
                <Badge variant="destructive">
                  {errorCount} {errorCount === 1 ? "error" : "errors"}
                </Badge>
              ) : (
                <Badge variant="warning">
                  {warningCount} {warningCount === 1 ? "warning" : "warnings"}
                </Badge>
              )}
            </button>
          )}

          {/* Column Manager Action */}
          {onUpdatePresentation && (
            <ColumnManager
              presentation={presentation}
              onUpdatePresentation={onUpdatePresentation}
            />
          )}

          {/* Export Action */}
          <ExportMenu document={document} presentation={presentation} sourceFilename={file.name} />

          {/* Reset Presentation Action when modified */}
          {hasPresentationChanges && onResetPresentation && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetPresentation}
              className="cursor-pointer text-xs h-8"
              aria-label="Reset presentation to default inferred settings"
            >
              Reset presentation
            </Button>
          )}

          {/* Change File Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="cursor-pointer text-xs h-8"
            aria-label="Change CSV file and return to upload"
          >
            Change file
          </Button>

          {/* Mobile/Tablet Inspector Toggle */}
          {onToggleSidebar && (
            <Button
              variant={isSidebarOpen ? "secondary" : "outline"}
              size="sm"
              onClick={onToggleSidebar}
              className="lg:hidden cursor-pointer text-xs h-8 px-2.5"
              aria-label="Toggle inspector sidebar"
            >
              Inspector
            </Button>
          )}
        </div>
      </div>

      {/* Expandable Diagnostics Drawer */}
      {showDiagnostics && (
        <div className="absolute top-full left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-b border-border shadow-lg z-40 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              Diagnostics Report
            </h2>
            <button
              type="button"
              onClick={() => setShowDiagnostics(false)}
              className="text-xs text-muted-foreground hover:text-foreground p-1 rounded"
              aria-label="Close diagnostics"
            >
              ✕
            </button>
          </div>
          <CsvDiagnostics diagnostics={diagnostics} />
        </div>
      )}
    </header>
  );
}
