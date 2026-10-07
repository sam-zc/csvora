import type { CsvDiagnostic, CsvDocument } from "@csvora/csv-core";

/**
 * Basic file metadata extracted from the browser File object.
 */
export interface FileMetadata {
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly lastModified: number;
}

/**
 * Application-level session representation of a successfully ingested CSV document.
 * Remains strictly renderer-independent: stores only the file metadata, the canonical
 * CsvDocument from @csvora/csv-core, diagnostics, and raw character count.
 */
export interface LoadedCsvDocument {
  readonly file: FileMetadata;
  readonly document: CsvDocument;
  readonly diagnostics: readonly CsvDiagnostic[];
  readonly rawTextLength: number;
}

/**
 * Validation error codes for rejected files.
 */
export type FileValidationErrorCode =
  | "not_a_file"
  | "empty_file"
  | "file_too_large"
  | "unsupported_type";

/**
 * Structured validation error returned when a file fails pre-ingestion checks.
 */
export interface FileValidationError {
  readonly code: FileValidationErrorCode;
  readonly message: string;
}

/**
 * Ingestion error details.
 */
export interface IngestionError {
  readonly code: string;
  readonly message: string;
}

/**
 * Explicit state model for the ingestion lifecycle, preventing impossible UI states.
 */
export type IngestionState =
  | { readonly status: "idle" }
  | { readonly status: "reading"; readonly file: FileMetadata }
  | { readonly status: "parsing"; readonly file: FileMetadata }
  | { readonly status: "success"; readonly loadedDocument: LoadedCsvDocument }
  | {
      readonly status: "error";
      readonly error: IngestionError;
      readonly file?: FileMetadata | undefined;
    };
