"use client";

import { useState } from "react";
import { Badge, Button } from "@csvora/ui";
import { CsvDiagnostics, formatFileSize } from "../../csv-ingestion";
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
 * Top header bar for the CSV preview workspace.
 * Displays file metadata, dimensional statistics, diagnostic status, and workspace controls.
 */
export function PreviewHeader({
  loadedDocument,
  presentation,
  onUpdatePresentation,
  onReset,
  onResetPresentation,
  hasPresentationChanges = false,
}: PreviewHeaderProps) {
  const { file, document, diagnostics } = loadedDocument;
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warning").length;
  const hasIssues = diagnostics.length > 0;

  return (
    <header className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-2xs">
        {/* Left: Branding & File Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <h1
              className="text-base font-semibold text-foreground tracking-tight truncate"
              title={file.name}
            >
              {file.name}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span className="text-foreground/70 font-sans">Browser preview</span>
            </p>
          </div>
        </div>

        {/* Center/Right: Metrics, Diagnostics, and Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dimensional Stats */}
          <div className="flex items-center gap-1.5 text-xs font-mono bg-muted/60 px-2.5 py-1.5 rounded-lg border border-border/50">
            <span className="text-foreground font-semibold">
              {document.rowCount.toLocaleString()}
            </span>
            <span className="text-muted-foreground font-sans">rows</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-foreground font-semibold">
              {document.columnCount.toLocaleString()}
            </span>
            <span className="text-muted-foreground font-sans">cols</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground font-sans">
              {getDelimiterLabel(document.delimiter)}
            </span>
          </div>

          {/* Diagnostic issues trigger */}
          {hasIssues && (
            <button
              type="button"
              onClick={() => setShowDiagnostics((prev) => !prev)}
              aria-expanded={showDiagnostics}
              className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-opacity hover:opacity-80"
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

          {/* Reset Presentation Action when modified */}
          {hasPresentationChanges && onResetPresentation && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetPresentation}
              className="cursor-pointer text-xs"
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
            className="cursor-pointer"
            aria-label="Change CSV file and return to upload"
          >
            Change file
          </Button>
        </div>
      </div>

      {/* Expanded Diagnostics Drawer/Card */}
      {showDiagnostics && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          <CsvDiagnostics diagnostics={diagnostics} />
        </div>
      )}
    </header>
  );
}
