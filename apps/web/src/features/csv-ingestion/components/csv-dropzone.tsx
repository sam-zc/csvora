"use client";

import { useRef, useState, useCallback, type DragEvent, type ChangeEvent, type KeyboardEvent } from "react";
import type { IngestionError } from "../types";

interface CsvDropzoneProps {
  readonly onFileSelected: (file: File) => void;
  readonly disabled?: boolean;
  readonly error?: IngestionError | null;
}

/**
 * Keyboard-accessible drag-and-drop file upload target for tabular files.
 */
export function CsvDropzone({ onFileSelected, disabled = false, error }: CsvDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0 && files[0]) {
        onFileSelected(files[0]);
      }
    },
    [disabled, onFileSelected],
  );

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0 && files[0]) {
        onFileSelected(files[0]);
      }
      // Reset input value so re-uploading the same file still triggers onChange
      e.target.value = "";
    },
    [onFileSelected],
  );

  const triggerFileDialog = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        triggerFileDialog();
      }
    },
    [triggerFileDialog],
  );

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive flex items-start gap-2.5"
        >
          <svg
            className="size-4 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="flex-1">
            <p className="font-medium text-xs tracking-tight uppercase">Upload Error</p>
            <p className="text-xs mt-0.5">{error.message}</p>
          </div>
        </div>
      )}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload CSV or tabular file"
        aria-disabled={disabled}
        onClick={triggerFileDialog}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-10 text-center rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border/80 hover:border-primary/50 hover:bg-muted/40 bg-card/60"
        } ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          id="csv-file-input"
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain,application/vnd.ms-excel"
          className="sr-only"
          onChange={handleFileInputChange}
          disabled={disabled}
          tabIndex={-1}
        />

        <div className="size-12 rounded-xl bg-muted flex items-center justify-center text-foreground/80 mb-4 shadow-xs">
          <svg
            className="size-6 text-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        <h3 className="text-base font-semibold text-foreground tracking-tight">
          Drop your CSV here, or <span className="text-primary underline">browse</span>
        </h3>

        <p className="mt-1.5 text-xs text-muted-foreground">
          Supports <span className="font-mono font-medium">.csv</span>,{" "}
          <span className="font-mono font-medium">.tsv</span>, and{" "}
          <span className="font-mono font-medium">.txt</span> up to 25 MB
        </p>

        <div className="mt-6 flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border/50">
          <svg
            className="size-3 text-emerald-600 dark:text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
          <span>Your file stays in your browser.</span>
        </div>
      </div>
    </div>
  );
}
