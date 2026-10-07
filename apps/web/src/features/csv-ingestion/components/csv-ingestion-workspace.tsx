"use client";

import { useCsvIngestion } from "../hooks/use-csv-ingestion";
import { CsvDropzone } from "./csv-dropzone";
import { CsvFileSummary } from "./csv-file-summary";

/**
 * Top-level feature workspace coordinating file selection, ingestion lifecycle,
 * and document summary presentation.
 */
export function CsvIngestionWorkspace() {
  const { state, ingestFile, reset } = useCsvIngestion();

  if (state.status === "reading" || state.status === "parsing") {
    return (
      <div className="w-full max-w-xl mx-auto p-12 rounded-2xl border border-border bg-card/70 flex flex-col items-center justify-center text-center space-y-4">
        <div className="size-10 rounded-full border-3 border-primary/20 border-t-primary animate-spin" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground tracking-tight">
            {state.status === "reading" ? "Reading file..." : "Parsing CSV structure..."}
          </p>
          <p className="text-xs text-muted-foreground font-mono">{state.file.name}</p>
        </div>
      </div>
    );
  }

  if (state.status === "success") {
    return <CsvFileSummary loadedDocument={state.loadedDocument} onReset={reset} />;
  }

  return (
    <CsvDropzone
      onFileSelected={(file) => void ingestFile(file)}
      error={state.status === "error" ? state.error : null}
    />
  );
}
