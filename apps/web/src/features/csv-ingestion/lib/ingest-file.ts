import { parseCsv, type CsvParseOptions } from "@csvora/csv-core";
import type { LoadedCsvDocument } from "../types";
import { validateCsvFile } from "./validate-file";

export class CsvIngestionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CsvIngestionError";
    this.code = code;
  }
}

/**
 * Ingests a local browser File, performing validation, text reading, and CSV parsing
 * via @csvora/csv-core without transmitting any data over the network.
 */
export async function ingestCsvFile(
  file: File,
  options?: CsvParseOptions,
  onProgress?: (stage: "reading" | "parsing") => void,
): Promise<LoadedCsvDocument> {
  const validationError = validateCsvFile(file);
  if (validationError) {
    throw new CsvIngestionError(validationError.code, validationError.message);
  }

  onProgress?.("reading");

  let rawText: string;
  try {
    rawText = await file.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read file contents";
    throw new CsvIngestionError("file_read_failed", message);
  }

  onProgress?.("parsing");

  const parseResult = parseCsv(rawText, options);

  return {
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    },
    document: parseResult.document,
    diagnostics: parseResult.diagnostics,
    rawTextLength: rawText.length,
  };
}
