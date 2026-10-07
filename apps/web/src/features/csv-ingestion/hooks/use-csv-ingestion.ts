"use client";

import { useCallback, useState } from "react";
import type { CsvParseOptions } from "@csvora/csv-core";
import { CsvIngestionError, ingestCsvFile } from "../lib/ingest-file";
import type { IngestionState, LoadedCsvDocument } from "../types";

export interface UseCsvIngestionResult {
  readonly state: IngestionState;
  readonly ingestFile: (file: File, options?: CsvParseOptions) => Promise<LoadedCsvDocument | null>;
  readonly reset: () => void;
}

/**
 * React hook managing the browser-local CSV ingestion lifecycle.
 */
export function useCsvIngestion(): UseCsvIngestionResult {
  const [state, setState] = useState<IngestionState>({ status: "idle" });

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  const ingestFile = useCallback(
    async (file: File, options?: CsvParseOptions): Promise<LoadedCsvDocument | null> => {
      const fileMeta = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      };

      setState({ status: "reading", file: fileMeta });

      try {
        const loadedDocument = await ingestCsvFile(file, options, (stage) => {
          setState({ status: stage, file: fileMeta });
        });

        setState({ status: "success", loadedDocument });
        return loadedDocument;
      } catch (err) {
        const code = err instanceof CsvIngestionError ? err.code : "unknown_error";
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred during CSV ingestion.";

        setState({
          status: "error",
          error: { code, message },
          file: fileMeta,
        });
        return null;
      }
    },
    [],
  );

  return {
    state,
    ingestFile,
    reset,
  };
}
