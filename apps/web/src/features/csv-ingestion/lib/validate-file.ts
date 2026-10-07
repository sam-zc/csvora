import type { FileValidationError } from "../types";

/**
 * Maximum file size accepted for client-side browser ingestion (25 MB).
 * Larger files will be supported via backend streaming in a future task.
 */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Permitted file extensions for tabular text files.
 */
export const ALLOWED_FILE_EXTENSIONS: readonly string[] = [".csv", ".tsv", ".txt"] as const;

/**
 * Known MIME types associated with CSV, TSV, and plain tabular text.
 */
export const ALLOWED_MIME_TYPES: readonly string[] = [
  "text/csv",
  "text/tab-separated-values",
  "text/plain",
  "application/vnd.ms-excel",
  "text/comma-separated-values",
] as const;

/**
 * Validates a browser File before attempting to read its contents.
 *
 * Rules:
 * 1. Must be a non-null File object.
 * 2. Must not be empty (size > 0).
 * 3. Must not exceed MAX_FILE_SIZE_BYTES (25 MB).
 * 4. Must match either an allowed extension (.csv, .tsv, .txt) or an allowed MIME type.
 *    (Files with empty/unusual MIME types are accepted if their extension matches).
 */
export function validateCsvFile(file: File): FileValidationError | null {
  if (!file || typeof file.size !== "number" || typeof file.name !== "string") {
    return {
      code: "not_a_file",
      message: "The selected item is not a valid file.",
    };
  }

  if (file.size === 0) {
    return {
      code: "empty_file",
      message: "The selected file is empty (0 bytes).",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      code: "file_too_large",
      message: `File exceeds the maximum browser ingestion limit of 25 MB (${formatFileSize(file.size)}). Larger datasets will be supported via streaming in a future update.`,
    };
  }

  const extension = extractExtension(file.name);
  const mime = file.type.toLowerCase().trim();

  const hasAllowedExt = ALLOWED_FILE_EXTENSIONS.includes(extension);
  const hasAllowedMime = ALLOWED_MIME_TYPES.includes(mime);

  if (!hasAllowedExt && !hasAllowedMime) {
    return {
      code: "unsupported_type",
      message: `Unsupported file type "${extension || mime || "unknown"}". Please select a .csv, .tsv, or .txt tabular file.`,
    };
  }

  return null;
}

function extractExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) {
    return "";
  }
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Human-readable format for file sizes (e.g., "12.5 KB", "1.2 MB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}
