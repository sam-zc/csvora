"use client";

import { useState } from "react";
import { CsvIngestionWorkspace, type LoadedCsvDocument } from "@/features/csv-ingestion";
import { CsvPreviewWorkspace } from "@/features/csv-preview";

type AppView = "ingest" | "preview";

/**
 * Main application coordinator managing single-page session workspace state transitions
 * between CSV ingestion (file upload & diagnostics summary) and visual preview.
 */
export function CsvoraApp() {
  const [activeDocument, setActiveDocument] = useState<LoadedCsvDocument | null>(null);
  const [view, setView] = useState<AppView>("ingest");

  const handleContinueToPreview = (loadedDoc: LoadedCsvDocument) => {
    setActiveDocument(loadedDoc);
    setView("preview");
  };

  const handleReset = () => {
    setActiveDocument(null);
    setView("ingest");
  };

  if (view === "preview" && activeDocument !== null) {
    return (
      <main className="flex min-h-screen flex-col p-4 sm:p-6 lg:p-8 bg-background text-foreground animate-in fade-in duration-150">
        <CsvPreviewWorkspace loadedDocument={activeDocument} onReset={handleReset} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-12 bg-background text-foreground">
      <div className="w-full max-w-2xl flex flex-col items-center gap-8 text-center">
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">CSVora</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Turn raw CSV data into beautiful tables.
          </p>
        </header>

        <section className="w-full">
          <CsvIngestionWorkspace onContinueToPreview={handleContinueToPreview} />
        </section>
      </div>
    </main>
  );
}
