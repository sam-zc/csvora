import { Badge, Button } from "@csvora/ui";
import type { LoadedCsvDocument } from "../types";
import { formatFileSize } from "../lib/validate-file";
import { CsvDiagnostics } from "./csv-diagnostics";

interface CsvFileSummaryProps {
  readonly loadedDocument: LoadedCsvDocument;
  readonly onReset: () => void;
  readonly onPreview?: () => void;
}

function getDelimiterLabel(delim: string): string {
  switch (delim) {
    case ",":
      return "Comma ( , )";
    case ";":
      return "Semicolon ( ; )";
    case "\t":
      return "Tab ( \\t )";
    case "|":
      return "Pipe ( | )";
    default:
      return `Custom ( ${delim} )`;
  }
}

/**
 * Summary view displayed upon successful ingestion and parsing of a CSV document.
 */
export function CsvFileSummary({ loadedDocument, onReset, onPreview }: CsvFileSummaryProps) {
  const { file, document, diagnostics } = loadedDocument;
  const hasErrors = diagnostics.some((d) => d.severity === "error");

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* File Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-border/60">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="size-11 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0 border border-primary/10">
              <svg
                className="size-5"
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
              <h2
                className="text-base font-semibold text-foreground tracking-tight truncate"
                title={file.name}
              >
                {file.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Processed in browser
                </span>
              </div>
            </div>
          </div>

          <Badge
            variant={hasErrors ? "destructive" : "success"}
            className="self-start sm:self-auto"
          >
            {hasErrors ? "Parse error" : "Parsed successfully"}
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          <div className="rounded-xl bg-muted/50 border border-border/50 p-3.5 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Rows
            </p>
            <p className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {document.rowCount.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl bg-muted/50 border border-border/50 p-3.5 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Columns
            </p>
            <p className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {document.columnCount.toLocaleString()}
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-xl bg-muted/50 border border-border/50 p-3.5 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Delimiter
            </p>
            <p className="text-sm font-semibold tracking-tight text-foreground pt-1.5 font-mono">
              {getDelimiterLabel(document.delimiter)}
            </p>
          </div>
        </div>

        {/* Headers Preview */}
        {document.headers.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-muted-foreground">
              Detected Headers ({document.headers.length})
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-lg bg-muted/30 border border-border/40">
              {document.headers.map((header, idx) => (
                <span
                  key={`${header}-${idx}`}
                  className="inline-flex items-center text-xs font-mono px-2 py-0.5 rounded bg-background border border-border/70 text-foreground"
                >
                  {header || <span className="italic text-muted-foreground">empty</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Diagnostics */}
        <CsvDiagnostics diagnostics={diagnostics} />

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/60">
          <Button
            variant="outline"
            onClick={onReset}
            className="w-full sm:w-auto"
            aria-label="Remove file and choose another"
          >
            Remove file
          </Button>

          <Button
            variant="default"
            onClick={onPreview}
            disabled={!onPreview}
            className="w-full sm:w-auto"
            aria-label="Continue to preview loaded CSV document"
          >
            Continue to preview
          </Button>
        </div>
      </div>
    </div>
  );
}
